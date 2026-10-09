import { test, expect } from '../../fixtures/test';
import type { RoleKey } from '../../config/env';
import type { DevflowApi } from '../../api/DevflowApi';

/** Moves a fresh issue to DONE (as admin) so verification rules can be tested. */
async function issueInDone(admin: DevflowApi, projectId: string, title: string) {
  const issue = (await admin.createIssue({ projectId, title })).body.data;
  for (const s of ['IN_PROGRESS', 'QA', 'DONE']) expect((await admin.transition(issue.id, s)).status).toBe(200);
  return issue;
}

test.describe('Role-based access control', () => {
  const verifyMatrix: Array<[RoleKey, number]> = [['admin', 200], ['qa', 200], ['developer', 403], ['viewer', 403]];
  for (const [role, expected] of verifyMatrix) {
    test(`DONE → VERIFIED as ${role} → ${expected}`, async ({ apiAs, dfProject, uniqueTitle }) => {
      const admin = await apiAs('admin');
      const issue = await issueInDone(admin, dfProject.id, uniqueTitle(`Verify as ${role}`));
      const res = await (await apiAs(role)).transition(issue.id, 'VERIFIED');
      expect(res.status, JSON.stringify(res.body)).toBe(expected);
      const status = (await admin.getIssue(issue.id)).body.data.status;
      expect(status).toBe(expected === 200 ? 'VERIFIED' : 'DONE');
      if (expected === 403) expect(res.body.error.code).toBe('FORBIDDEN_TRANSITION');
    });
  }

  test('a developer cannot reopen a VERIFIED issue, QA can', async ({ apiAs, dfProject, uniqueTitle }) => {
    const admin = await apiAs('admin');
    const issue = await issueInDone(admin, dfProject.id, uniqueTitle('Reopen'));
    expect((await admin.transition(issue.id, 'VERIFIED')).status).toBe(200);
    const devRes = await (await apiAs('developer')).transition(issue.id, 'IN_PROGRESS');
    expect(devRes.status).toBe(403);
    expect(devRes.body.error.message).toMatch(/Only QA or Admin/);
    expect((await (await apiAs('qa')).transition(issue.id, 'IN_PROGRESS')).status).toBe(200);
  });

  test('viewers are read-only', async ({ apiAs, dfProject, uniqueTitle }) => {
    const viewer = await apiAs('viewer');
    const dev = await apiAs('developer');
    const issue = (await dev.createIssue({ projectId: dfProject.id, title: uniqueTitle('Viewer target') })).body.data;

    expect((await viewer.get('issues')).status).toBe(200);
    expect((await viewer.board(dfProject.id)).status).toBe(200);
    expect((await viewer.createIssue({ projectId: dfProject.id, title: 'Nope' })).status).toBe(403);
    expect((await viewer.patch(`issues/${issue.id}`, { title: 'Changed' })).status).toBe(403);
    expect((await viewer.transition(issue.id, 'IN_PROGRESS')).status).toBe(403);
    expect((await viewer.post('ai/triage', { description: 'Something crashes on save' })).status).toBe(403);
    expect((await viewer.delete(`issues/${issue.id}`)).status).toBe(403);
  });

  test('only admins manage projects', async ({ apiAs }) => {
    for (const role of ['qa', 'developer', 'viewer'] as const) {
      const res = await (await apiAs(role)).post('projects', { key: 'NOPE', name: 'Not allowed' });
      expect(res.status, role).toBe(403);
    }
    const admin = await apiAs('admin');
    const key = `T${Date.now().toString(36).slice(-6).toUpperCase()}`.replace(/[^A-Z0-9]/g, 'X');
    const created = await admin.post('projects', { key, name: 'Temporary project' });
    expect(created.status).toBe(201);
    expect((await admin.delete(`projects/${created.body.data.id}`)).status).toBe(204);
  });

  test('only the reporter or an admin can delete an issue', async ({ apiAs, dfProject, uniqueTitle }) => {
    const qa = await apiAs('qa');
    const issue = (await qa.createIssue({ projectId: dfProject.id, title: uniqueTitle('Delete me') })).body.data;
    expect((await (await apiAs('developer')).delete(`issues/${issue.id}`)).status).toBe(403);
    expect((await qa.delete(`issues/${issue.id}`)).status).toBe(204);
    expect((await qa.getIssue(issue.id)).status).toBe(404);
  });
});
