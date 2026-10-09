import { test, expect } from '../../fixtures/test';
import { expectToMatchSchema } from '../../utils/schema';

test.describe('Issue workflow (state machine)', () => {
  test('happy path BACKLOG → IN_PROGRESS → QA → DONE → VERIFIED is recorded in the history', async ({ apiAs, dfProject, uniqueTitle }) => {
    const dev = await apiAs('developer');
    const qa = await apiAs('qa');
    const issue = (await dev.createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Lifecycle') })).body.data;

    for (const [actor, to, allowedAfter] of [
      [dev, 'IN_PROGRESS', ['BACKLOG', 'QA']],
      [dev, 'QA', ['IN_PROGRESS', 'DONE']],
      [dev, 'DONE', ['IN_PROGRESS']],         // developers are not offered VERIFIED
      [qa, 'VERIFIED', ['IN_PROGRESS']],      // QA may reopen
    ] as const) {
      const res = await actor.transition(issue.id, to);
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expectToMatchSchema(res.body.data, 'issue');
      expect(res.body.data.status).toBe(to);
      expect(res.body.data.allowedTransitions).toEqual(allowedAfter);
    }

    const events = (await dev.get(`issues/${issue.id}/events`)).body.data;
    expect(events.filter((e: any) => e.type === 'status_changed').map((e: any) => `${e.fromStatus}>${e.toStatus}`))
      .toEqual(['BACKLOG>IN_PROGRESS', 'IN_PROGRESS>QA', 'QA>DONE', 'DONE>VERIFIED']);
    expect(events.at(-1).actor.role).toBe('QA');
  });

  const invalid: Array<[string, string[], string]> = [
    ['BACKLOG', [], 'QA'],
    ['BACKLOG', [], 'DONE'],
    ['BACKLOG', [], 'VERIFIED'],
    ['IN_PROGRESS', ['IN_PROGRESS'], 'DONE'],
    ['QA', ['IN_PROGRESS', 'QA'], 'BACKLOG'],
    ['DONE', ['IN_PROGRESS', 'QA', 'DONE'], 'BACKLOG'],
  ];
  for (const [from, path, to] of invalid) {
    test(`409 – cannot jump from ${from} to ${to}`, async ({ apiAs, dfProject, uniqueTitle }) => {
      const admin = await apiAs('admin'); // even Admin cannot skip workflow steps
      const issue = (await admin.createIssue({ projectId: dfProject.id, title: uniqueTitle(`Invalid ${from}>${to}`) })).body.data;
      for (const step of path) expect((await admin.transition(issue.id, step)).status).toBe(200);

      const res = await admin.transition(issue.id, to);
      expect(res.status).toBe(409);
      expectToMatchSchema(res.body, 'error');
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      expect(res.body.error.details).toEqual({ from, to, allowed: expect.any(Array) });
      expect((await admin.getIssue(issue.id)).body.data.status).toBe(from); // unchanged
    });
  }

  test('400 – unknown target status', async ({ apiAs, dfProject, uniqueTitle }) => {
    const dev = await apiAs('developer');
    const issue = (await dev.createIssue({ projectId: dfProject.id, title: uniqueTitle('Bad status') })).body.data;
    const res = await dev.transition(issue.id, 'ARCHIVED');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('toStatus');
  });

  test('drop index controls the card order inside a column', async ({ apiAs, dfProject, uniqueTitle }) => {
    const dev = await apiAs('developer');
    const issue = (await dev.createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Ordering') })).body.data;
    expect((await dev.transition(issue.id, 'IN_PROGRESS', 0)).status).toBe(200);
    let column = (await dev.board(dfProject.id)).body.data.columns.find((c: any) => c.status === 'IN_PROGRESS');
    expect(column.issues[0].id).toBe(issue.id);

    expect((await dev.transition(issue.id, 'IN_PROGRESS', 99)).status).toBe(200); // re-order to the bottom
    column = (await dev.board(dfProject.id)).body.data.columns.find((c: any) => c.status === 'IN_PROGRESS');
    expect(column.issues.at(-1).id).toBe(issue.id);
  });
});
