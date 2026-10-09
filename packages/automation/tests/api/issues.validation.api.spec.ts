import { test, expect } from '../../fixtures/test';
import { expectToMatchSchema } from '../../utils/schema';

const NO_SUCH_UUID = '00000000-0000-4000-8000-000000000000';

test.describe('POST /issues – payload validation', () => {
  type Case = { name: string; body: (projectId: string) => Record<string, unknown>; fields: string[] };
  const cases: Case[] = [
    { name: 'missing projectId', body: () => ({ title: 'Valid title' }), fields: ['projectId'] },
    { name: 'missing title', body: (p) => ({ projectId: p }), fields: ['title'] },
    { name: 'empty body', body: () => ({}), fields: ['projectId', 'title'] },
    { name: 'title too short (2 chars)', body: (p) => ({ projectId: p, title: 'ab' }), fields: ['title'] },
    { name: 'title only whitespace', body: (p) => ({ projectId: p, title: '      ' }), fields: ['title'] },
    { name: 'title too long (201 chars)', body: (p) => ({ projectId: p, title: 'x'.repeat(201) }), fields: ['title'] },
    { name: 'title is a number', body: (p) => ({ projectId: p, title: 12345 }), fields: ['title'] },
    { name: 'title contains a control character', body: (p) => ({ projectId: p, title: 'Bad\u0000title' }), fields: ['title'] },
    { name: 'description over 10,000 chars', body: (p) => ({ projectId: p, title: 'Valid title', description: 'd'.repeat(10_001) }), fields: ['description'] },
    { name: 'unknown type', body: (p) => ({ projectId: p, title: 'Valid title', type: 'EPIC' }), fields: ['type'] },
    { name: 'lower-case enum', body: (p) => ({ projectId: p, title: 'Valid title', priority: 'high' }), fields: ['priority'] },
    { name: 'invalid severity', body: (p) => ({ projectId: p, title: 'Valid title', severity: 'BLOCKER' }), fields: ['severity'] },
    { name: 'projectId not a UUID', body: () => ({ projectId: 'DF', title: 'Valid title' }), fields: ['projectId'] },
    { name: 'status cannot be set on create', body: (p) => ({ projectId: p, title: 'Valid title', status: 'VERIFIED' }), fields: ['(root)'] },
    { name: 'unknown field (mass assignment)', body: (p) => ({ projectId: p, title: 'Valid title', reporterId: NO_SUCH_UUID }), fields: ['(root)'] },
  ];

  for (const c of cases) {
    test(`400 – ${c.name}`, async ({ apiAs, dfProject }) => {
      const api = await apiAs('developer');
      const res = await api.createIssue(c.body(dfProject.id));
      expect(res.status, JSON.stringify(res.body)).toBe(400);
      expectToMatchSchema(res.body, 'error');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = res.body.error.details.map((d: { field: string }) => (d.field === 'body' || d.field === '' ? '(root)' : d.field));
      for (const f of c.fields) expect(fields, JSON.stringify(res.body.error.details)).toContain(f);
    });
  }

  test('400 – references that do not exist or belong to another project', async ({ apiAs, dfProject }) => {
    const api = await apiAs('developer');
    const mob = await api.projectByKey('MOB');
    const mobSprint = await api.activeSprint(mob.id);

    const noProject = await api.createIssue({ projectId: NO_SUCH_UUID, title: 'Valid title' });
    expect(noProject.status).toBe(400);
    expect(noProject.body.error.details).toEqual([{ field: 'projectId', message: 'Project does not exist' }]);

    const otherSprint = await api.createIssue({ projectId: dfProject.id, sprintId: mobSprint!.id, title: 'Valid title' });
    expect(otherSprint.status).toBe(400);
    expect(otherSprint.body.error.details).toEqual([{ field: 'sprintId', message: 'Sprint belongs to a different project' }]);

    const noUser = await api.createIssue({ projectId: dfProject.id, assigneeId: NO_SUCH_UUID, title: 'Valid title' });
    expect(noUser.status).toBe(400);
    expect(noUser.body.error.details[0].field).toBe('assigneeId');
  });

  test('400 – malformed JSON body', async ({ apiAs }) => {
    const api = await apiAs('developer');
    const res = await api.postRaw('issues', '{"title": "broken",');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  test('413 – body larger than 64 KB', async ({ apiAs, dfProject }) => {
    const api = await apiAs('developer');
    const res = await api.createIssue({ projectId: dfProject.id, title: 'Big', description: 'x'.repeat(70_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  test.describe('boundaries that must be accepted', () => {
    const ok: Array<[string, (p: string) => Record<string, unknown>]> = [
      ['title of exactly 3 characters', (p) => ({ projectId: p, title: 'abc' })],
      ['title of exactly 200 characters', (p) => ({ projectId: p, title: 'T'.repeat(200) })],
      ['description of exactly 10,000 characters', (p) => ({ projectId: p, title: 'Long description', description: 'd'.repeat(10_000) })],
      ['multi-line description with tabs', (p) => ({ projectId: p, title: 'Tabs ok', description: 'a\tb\nc' })],
      ['emoji and non-Latin text', (p) => ({ projectId: p, title: 'Crash 💥 при сохранении' })],
      ['HTML / SQL-looking text is stored as plain text', (p) => ({ projectId: p, title: `<script>alert(1)</script>'; DROP TABLE "Issue";--` })],
      ['title is trimmed', (p) => ({ projectId: p, title: '   padded title   ' })],
    ];
    for (const [name, body] of ok) {
      test(`201 – ${name}`, async ({ apiAs, dfProject }) => {
        const api = await apiAs('developer');
        const payload = body(dfProject.id);
        const res = await api.createIssue(payload);
        expect(res.status, JSON.stringify(res.body)).toBe(201);
        expectToMatchSchema(res.body.data, 'issue');
        expect(res.body.data.title).toBe(String(payload.title).trim());
      });
    }
  });
});
