import { test, expect } from '../../fixtures/test';
import { expectToMatchSchema } from '../../utils/schema';

test.describe('Issue API contract (JSON Schema)', () => {
  test('POST /issues with the minimum payload returns 201, Location header and a schema-valid issue with defaults', async ({ apiAs, dfProject, uniqueTitle }) => {
    const api = await apiAs('developer');
    const title = uniqueTitle('Minimal issue');
    const res = await api.createIssue({ projectId: dfProject.id, title });

    expect(res.status).toBe(201);
    expectToMatchSchema(res.body.data, 'issue');
    expect(res.headers.location).toBe(`/api/issues/${res.body.data.id}`);
    expect(res.body.data).toMatchObject({
      title, projectId: dfProject.id, status: 'BACKLOG', type: 'BUG', priority: 'MEDIUM', severity: null,
      sprintId: null, assignee: null, description: '', stepsToReproduce: '', aiTriage: null,
    });
    expect(res.body.data.key).toMatch(/^DF-\d+$/);
    expect(res.body.data.reporter.email).toBe('dev@devflow.dev');
  });

  test('POST /issues with every field echoes the values back', async ({ apiAs, dfProject, uniqueTitle }) => {
    const api = await apiAs('qa');
    const users = (await api.get('users')).body.data;
    const assignee = users.find((u: any) => u.role === 'DEVELOPER');
    const payload = {
      projectId: dfProject.id, sprintId: dfProject.sprintId, assigneeId: assignee.id,
      title: uniqueTitle('Full payload'), description: 'Line 1\nLine 2 – unicode ✓ 日本語', stepsToReproduce: '1. Open\n2. Click',
      type: 'STORY', priority: 'HIGH', severity: 'LOW',
    };
    const res = await api.createIssue(payload);
    expect(res.status).toBe(201);
    expectToMatchSchema(res.body.data, 'issue');
    const { projectId, sprintId, assigneeId, ...rest } = payload;
    expect(res.body.data).toMatchObject({ ...rest, projectId, sprintId, assignee: { id: assigneeId } });
  });

  test('issue keys are sequential per project', async ({ apiAs, dfProject, uniqueTitle }) => {
    const api = await apiAs('developer');
    const a = await api.createIssue({ projectId: dfProject.id, title: uniqueTitle('Seq A') });
    const b = await api.createIssue({ projectId: dfProject.id, title: uniqueTitle('Seq B') });
    expect(b.body.data.number).toBe(a.body.data.number + 1);
    expect(b.body.data.key).toBe(`DF-${a.body.data.number + 1}`);
  });

  test('GET /issues/:id, GET /issues and GET /board all honour their contracts', async ({ apiAs, dfProject, uniqueTitle }) => {
    const api = await apiAs('developer');
    const created = (await api.createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Contract read') })).body.data;

    const one = await api.getIssue(created.id);
    expect(one.status).toBe(200);
    expectToMatchSchema(one.body.data, 'issue');
    expect(one.body.data.allowedTransitions).toEqual(['IN_PROGRESS']);

    const list = await api.get('issues', { projectId: dfProject.id, pageSize: 50 });
    expect(list.status).toBe(200);
    expect(list.body.pagination).toEqual({ page: 1, pageSize: 50, totalItems: expect.any(Number), totalPages: expect.any(Number) });
    for (const issue of list.body.data) expectToMatchSchema(issue, 'issue');

    const board = await api.board(dfProject.id);
    expect(board.status).toBe(200);
    expectToMatchSchema(board.body.data, 'board');
    expect(board.body.data.columns.map((c: any) => c.status)).toEqual(['BACKLOG', 'IN_PROGRESS', 'QA', 'DONE', 'VERIFIED']);
    expect(board.body.data.columns[0].issues.map((i: any) => i.id)).toContain(created.id);
  });

  test('error responses share one contract (400, 401, 403, 404, 409)', async ({ apiAs, anonymousApi, dfProject, uniqueTitle }) => {
    const dev = await apiAs('developer');
    const viewer = await apiAs('viewer');
    const issue = (await dev.createIssue({ projectId: dfProject.id, title: uniqueTitle('Errors') })).body.data;
    const responses = [
      [400, await dev.createIssue({})],
      [401, await anonymousApi.get('issues')],
      [403, await viewer.createIssue({ projectId: dfProject.id, title: 'Viewer cannot' })],
      [404, await dev.getIssue('00000000-0000-4000-8000-000000000000')],
      [409, await dev.transition(issue.id, 'DONE')],
    ] as const;
    for (const [status, res] of responses) {
      expect(res.status, JSON.stringify(res.body)).toBe(status);
      expectToMatchSchema(res.body, 'error');
      expect(res.headers['x-request-id']).toBeTruthy();
      expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    }
  });

  test('no response anywhere leaks password hashes', async ({ apiAs, dfProject }) => {
    const api = await apiAs('admin');
    for (const path of ['users', 'issues', `projects/${dfProject.id}/board`, 'dashboard', 'auth/me']) {
      const res = await api.get(path);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body), path).not.toMatch(/passwordHash|\$2[aby]\$\d\d\$/);
    }
  });
});
