import bcrypt from 'bcryptjs';
import type { IssueStatus, IssueType, Priority, Severity } from '../generated/prisma/client.js';
import type { PrismaClient } from '../generated/prisma/client.js';

/** Password for every demo account (documented in the README; change it for any real deployment). */
export const DEMO_PASSWORD = 'DevFlow@2026';

// Fixed ids keep existing sessions (JWT "sub") valid after the test-data reset endpoint reseeds.
export const DEMO_USERS = [
  { id: '00000000-0000-4000-8000-0000000000a1', email: 'admin@devflow.dev', name: 'Asha Admin', role: 'ADMIN' },
  { id: '00000000-0000-4000-8000-0000000000a2', email: 'qa@devflow.dev', name: 'Quinn QA', role: 'QA' },
  { id: '00000000-0000-4000-8000-0000000000a3', email: 'dev@devflow.dev', name: 'Devi Developer', role: 'DEVELOPER' },
  { id: '00000000-0000-4000-8000-0000000000a4', email: 'dev2@devflow.dev', name: 'Dan Developer', role: 'DEVELOPER' },
  { id: '00000000-0000-4000-8000-0000000000a5', email: 'viewer@devflow.dev', name: 'Vik Viewer', role: 'VIEWER' },
] as const;

type SeedIssue = {
  title: string; type: IssueType; status: IssueStatus; priority: Priority; severity?: Severity;
  assignee?: string; description: string; steps?: string;
};

const DF_SPRINT_ISSUES: SeedIssue[] = [
  { title: 'Login fails with 500 when email contains a plus sign', type: 'BUG', status: 'BACKLOG', priority: 'HIGH', severity: 'HIGH', assignee: 'dev@devflow.dev',
    description: 'Signing in with an address like jane+test@example.com returns HTTP 500 instead of logging the user in.',
    steps: '1. Open the login page\n2. Enter jane+test@example.com and a valid password\n3. Click Sign in' },
  { title: 'Kanban card count badge does not update after drag', type: 'BUG', status: 'BACKLOG', priority: 'MEDIUM', severity: 'MEDIUM',
    description: 'After dragging a card to another column the count badge on the source column is wrong until refresh.' },
  { title: 'Add CSV export for sprint report', type: 'STORY', status: 'BACKLOG', priority: 'LOW', assignee: 'dev2@devflow.dev',
    description: 'As a QA lead I want to export the sprint report as CSV so I can share it with stakeholders.' },
  { title: 'Session expires silently while editing an issue', type: 'BUG', status: 'IN_PROGRESS', priority: 'HIGH', severity: 'HIGH', assignee: 'dev@devflow.dev',
    description: 'If the session expires while the edit dialog is open, Save does nothing and changes are lost without any message.' },
  { title: 'Implement AI triage suggestions panel', type: 'STORY', status: 'IN_PROGRESS', priority: 'HIGH', assignee: 'dev2@devflow.dev',
    description: 'Show AI-suggested severity and test steps when a bug is created.' },
  { title: 'Payment webhook processed twice causing double charge', type: 'BUG', status: 'QA', priority: 'URGENT', severity: 'CRITICAL', assignee: 'dev@devflow.dev',
    description: 'Under retry conditions the payment webhook is processed twice and the customer is charged twice.' },
  { title: 'Sprint burndown chart shows wrong dates in UTC+5:30', type: 'BUG', status: 'QA', priority: 'MEDIUM', severity: 'MEDIUM', assignee: 'dev2@devflow.dev',
    description: 'The burndown chart is shifted by one day for users in India Standard Time.' },
  { title: 'Typo on the project settings page', type: 'BUG', status: 'DONE', priority: 'LOW', severity: 'LOW', assignee: 'dev2@devflow.dev',
    description: 'The label reads "Projcet name" instead of "Project name".' },
  { title: 'Role-based access for issue verification', type: 'STORY', status: 'DONE', priority: 'HIGH', assignee: 'dev@devflow.dev',
    description: 'Only QA and Admin users may move an issue to Verified.' },
  { title: 'Search by issue key returns no results', type: 'BUG', status: 'VERIFIED', priority: 'MEDIUM', severity: 'MEDIUM', assignee: 'dev@devflow.dev',
    description: 'Searching for "DF-3" returns nothing even though the issue exists.' },
];

const DF_BACKLOG_ISSUES: SeedIssue[] = [
  { title: 'Dark mode for the dashboard', type: 'STORY', status: 'BACKLOG', priority: 'LOW', description: 'Support a dark colour scheme.' },
  { title: 'Upgrade to PostgreSQL 17 in production', type: 'TASK', status: 'BACKLOG', priority: 'MEDIUM', description: 'Plan and execute the database upgrade.' },
];

const MOB_ISSUES: SeedIssue[] = [
  { title: 'App crashes on Android 14 when opening notifications', type: 'BUG', status: 'IN_PROGRESS', priority: 'URGENT', severity: 'CRITICAL', assignee: 'dev2@devflow.dev',
    description: 'The app crashes immediately when the user taps the notifications tab on Android 14 devices.' },
  { title: 'Offline mode loses draft comments', type: 'BUG', status: 'BACKLOG', priority: 'HIGH', severity: 'HIGH',
    description: 'Comments typed while offline are lost when the connection returns.' },
  { title: 'Push notification opt-in screen', type: 'STORY', status: 'QA', priority: 'MEDIUM', assignee: 'dev@devflow.dev',
    description: 'Ask users for notification permission with a custom explainer screen.' },
];

let passwordHash: string | undefined;

/** Wipes all data and inserts the demo data set. Used by `npm run db:seed` and the test reset endpoint. */
export async function seedDatabase(prisma: PrismaClient) {
  passwordHash ??= await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.$transaction([
    prisma.testCase.deleteMany(),
    prisma.issueEvent.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.sprint.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const users = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const created = await prisma.user.create({ data: { ...u, passwordHash } });
    users.set(u.email, created.id);
  }
  const reporterId = users.get('qa@devflow.dev')!;

  const df = await prisma.project.create({ data: { key: 'DF', name: 'DevFlow Platform', description: 'The DevFlow web application and API.' } });
  const mob = await prisma.project.create({ data: { key: 'MOB', name: 'Mobile App', description: 'iOS and Android clients.' } });

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const dfSprint = await prisma.sprint.create({
    data: { projectId: df.id, name: 'Sprint 14', goal: 'Stabilise login and payments; ship AI triage', status: 'ACTIVE', startDate: new Date(now - 5 * day), endDate: new Date(now + 9 * day) },
  });
  await prisma.sprint.create({ data: { projectId: df.id, name: 'Sprint 15', goal: 'Reporting and exports', status: 'PLANNED' } });
  const mobSprint = await prisma.sprint.create({
    data: { projectId: mob.id, name: 'Sprint 3', goal: 'Android 14 readiness', status: 'ACTIVE', startDate: new Date(now - 2 * day), endDate: new Date(now + 12 * day) },
  });

  async function addIssues(project: { id: string; key: string }, sprintId: string | null, list: SeedIssue[]) {
    let seq = (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).issueSeq;
    const positions = new Map<IssueStatus, number>();
    for (const s of list) {
      seq += 1;
      const position = (positions.get(s.status) ?? 0) + 1024;
      positions.set(s.status, position);
      const issue = await prisma.issue.create({
        data: {
          projectId: project.id, sprintId, number: seq, key: `${project.key}-${seq}`,
          title: s.title, description: s.description, stepsToReproduce: s.steps ?? '',
          type: s.type, status: s.status, priority: s.priority, severity: s.severity ?? null, position,
          reporterId, assigneeId: s.assignee ? users.get(s.assignee)! : null,
        },
      });
      await prisma.issueEvent.create({ data: { issueId: issue.id, actorId: reporterId, type: 'created', toStatus: 'BACKLOG', message: `Created ${issue.key}` } });
      // Realistic history: walk the workflow up to the seeded status.
      const path: IssueStatus[] = ['BACKLOG', 'IN_PROGRESS', 'QA', 'DONE', 'VERIFIED'];
      for (let i = 1; i <= path.indexOf(s.status); i += 1) {
        const actorId = path[i] === 'VERIFIED' ? reporterId : (s.assignee ? users.get(s.assignee)! : reporterId);
        await prisma.issueEvent.create({ data: { issueId: issue.id, actorId, type: 'status_changed', fromStatus: path[i - 1], toStatus: path[i], message: `${path[i - 1]} → ${path[i]}` } });
      }
    }
    await prisma.project.update({ where: { id: project.id }, data: { issueSeq: seq } });
  }

  await addIssues(df, dfSprint.id, DF_SPRINT_ISSUES);
  await addIssues(df, null, DF_BACKLOG_ISSUES);
  await addIssues(mob, mobSprint.id, MOB_ISSUES);

  return { users: DEMO_USERS.length, projects: 2, issues: DF_SPRINT_ISSUES.length + DF_BACKLOG_ISSUES.length + MOB_ISSUES.length };
}
