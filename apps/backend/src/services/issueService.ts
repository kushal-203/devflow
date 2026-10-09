import type { IssueStatus, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import type { AuthUser } from '../middleware/auth.js';
import type { CreateIssueBody, ListIssuesQuery, UpdateIssueBody } from '../schemas/issue.js';
import { issueInclude, toIssueDto } from './mappers.js';
import { allowedTargets, assertTransition } from './workflow.js';
import { triage, type TriageResponse } from './ai/triageService.js';

const POSITION_GAP = 1024;

async function findIssueOr404(id: string) {
  const issue = await prisma.issue.findUnique({ where: { id }, include: issueInclude });
  if (!issue) throw notFound('Issue');
  return issue;
}

/** Sprint and assignee must exist and the sprint must belong to the issue's project. */
async function checkReferences(projectId: string, sprintId?: string | null, assigneeId?: string | null) {
  const errors: { field: string; message: string }[] = [];
  if (sprintId) {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, select: { projectId: true } });
    if (!sprint) errors.push({ field: 'sprintId', message: 'Sprint does not exist' });
    else if (sprint.projectId !== projectId) errors.push({ field: 'sprintId', message: 'Sprint belongs to a different project' });
  }
  if (assigneeId) {
    const user = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
    if (!user) errors.push({ field: 'assigneeId', message: 'User does not exist' });
  }
  if (errors.length) throw badRequest('Invalid references', errors);
}

export async function listIssues(q: ListIssuesQuery) {
  const where: Prisma.IssueWhereInput = {
    projectId: q.projectId,
    sprintId: q.sprintId,
    status: q.status,
    type: q.type,
    severity: q.severity,
    assigneeId: q.assigneeId,
    ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { key: { equals: q.q.toUpperCase() } }] } : {}),
  };
  const desc = q.sort.startsWith('-');
  const field = q.sort.replace('-', '') as 'createdAt' | 'updatedAt' | 'priority' | 'key';
  const [total, rows] = await prisma.$transaction([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      include: issueInclude,
      orderBy: [{ [field]: desc ? 'desc' : 'asc' }, { id: 'asc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return {
    data: rows.map(toIssueDto),
    pagination: { page: q.page, pageSize: q.pageSize, totalItems: total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
  };
}

export async function getIssue(id: string, user: AuthUser) {
  const issue = await findIssueOr404(id);
  return { ...toIssueDto(issue), allowedTransitions: allowedTargets(issue.status, user.role) };
}

export async function createIssue(body: CreateIssueBody, user: AuthUser) {
  const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
  if (!project) throw badRequest('Invalid references', [{ field: 'projectId', message: 'Project does not exist' }]);
  await checkReferences(body.projectId, body.sprintId, body.assigneeId);

  const issue = await prisma.$transaction(async (tx) => {
    // Atomic per-project counter → keys like DF-42 never collide, even under concurrent creates.
    const { issueSeq, key } = await tx.project.update({ where: { id: body.projectId }, data: { issueSeq: { increment: 1 } }, select: { issueSeq: true, key: true } });
    const last = await tx.issue.findFirst({
      where: { projectId: body.projectId, sprintId: body.sprintId ?? null, status: 'BACKLOG' },
      orderBy: { position: 'desc' }, select: { position: true },
    });
    const created = await tx.issue.create({
      data: {
        projectId: body.projectId,
        number: issueSeq,
        key: `${key}-${issueSeq}`,
        title: body.title,
        description: body.description ?? '',
        stepsToReproduce: body.stepsToReproduce ?? '',
        type: body.type,
        priority: body.priority,
        severity: body.severity ?? null,
        sprintId: body.sprintId ?? null,
        assigneeId: body.assigneeId ?? null,
        reporterId: user.id,
        position: (last?.position ?? 0) + POSITION_GAP,
      },
      include: issueInclude,
    });
    await tx.issueEvent.create({ data: { issueId: created.id, actorId: user.id, type: 'created', toStatus: created.status, message: `Created ${created.key}` } });
    return created;
  });
  return toIssueDto(issue);
}

export async function updateIssue(id: string, body: UpdateIssueBody, user: AuthUser) {
  const existing = await findIssueOr404(id);
  if (user.role === 'DEVELOPER' && existing.status === 'VERIFIED') throw forbidden('Verified issues can only be edited by QA or Admin users');
  await checkReferences(existing.projectId, body.sprintId, body.assigneeId);
  const updated = await prisma.issue.update({ where: { id }, data: body, include: issueInclude });
  await prisma.issueEvent.create({ data: { issueId: id, actorId: user.id, type: 'updated', message: `Updated ${Object.keys(body).join(', ')}` } });
  return toIssueDto(updated);
}

export async function deleteIssue(id: string, user: AuthUser) {
  const existing = await findIssueOr404(id);
  if (user.role !== 'ADMIN' && existing.reporterId !== user.id) throw forbidden('Only the reporter or an Admin can delete an issue');
  await prisma.issue.delete({ where: { id } });
}

/** Fractional position so a drop between two cards never needs to renumber the column. */
function positionAt(column: { position: number }[], index: number | undefined): number {
  if (!column.length) return POSITION_GAP;
  if (index === undefined || index >= column.length) return column[column.length - 1].position + POSITION_GAP;
  if (index <= 0) return column[0].position - POSITION_GAP;
  return (column[index - 1].position + column[index].position) / 2;
}

export async function transitionIssue(id: string, toStatus: IssueStatus, index: number | undefined, user: AuthUser) {
  const issue = await findIssueOr404(id);
  assertTransition(issue.status, toStatus, user.role); // 409 invalid move / 403 role not allowed

  const column = await prisma.issue.findMany({
    where: { projectId: issue.projectId, sprintId: issue.sprintId, status: toStatus, NOT: { id } },
    orderBy: { position: 'asc' }, select: { position: true },
  });
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.issue.update({ where: { id }, data: { status: toStatus, position: positionAt(column, index) }, include: issueInclude });
    if (issue.status !== toStatus) {
      await tx.issueEvent.create({ data: { issueId: id, actorId: user.id, type: 'status_changed', fromStatus: issue.status, toStatus, message: `${issue.status} → ${toStatus}` } });
    }
    return u;
  });
  return { ...toIssueDto(updated), allowedTransitions: allowedTargets(updated.status, user.role) };
}

export async function listEvents(id: string) {
  await findIssueOr404(id);
  const events = await prisma.issueEvent.findMany({ where: { issueId: id }, orderBy: { createdAt: 'asc' }, include: { actor: { select: { id: true, name: true, role: true } } } });
  return events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));
}

export async function listTestCases(id: string) {
  await findIssueOr404(id);
  const cases = await prisma.testCase.findMany({ where: { issueId: id }, orderBy: { createdAt: 'asc' } });
  return cases.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));
}

/** Runs AI triage on a stored issue and (optionally) applies severity + creates AI test cases. */
export async function triageIssue(id: string, opts: { applySeverity: boolean; createTestCases: boolean }, user: AuthUser) {
  const issue = await findIssueOr404(id);
  const result: TriageResponse = await triage({
    title: issue.title,
    description: issue.description.length >= 10 ? issue.description : `${issue.title}. ${issue.description}`.padEnd(10, '.'),
    stepsToReproduce: issue.stepsToReproduce || undefined,
  });
  const updated = await prisma.$transaction(async (tx) => {
    if (opts.createTestCases) {
      await tx.testCase.deleteMany({ where: { issueId: id, source: 'AI' } }); // re-triage replaces earlier AI suggestions
      await tx.testCase.createMany({
        data: result.suggestedTestCases.map((tc) => ({ issueId: id, title: tc.title, steps: tc.steps, expected: tc.expected, source: 'AI' as const })),
      });
    }
    await tx.issueEvent.create({ data: { issueId: id, actorId: user.id, type: 'triaged', message: `AI (${result.provider}) suggested ${result.severity}` } });
    return tx.issue.update({
      where: { id },
      data: { aiTriage: result as unknown as Prisma.InputJsonValue, ...(opts.applySeverity ? { severity: result.severity } : {}) },
      include: issueInclude,
    });
  });
  return { issue: toIssueDto(updated), triage: result };
}

export async function dashboardStats() {
  const [byStatus, criticalOpen, recent] = await Promise.all([
    prisma.issue.groupBy({ by: ['status'], _count: true }),
    prisma.issue.count({ where: { severity: 'CRITICAL', status: { notIn: ['DONE', 'VERIFIED'] } } }),
    prisma.issueEvent.findMany({
      orderBy: { createdAt: 'desc' }, take: 8,
      include: { actor: { select: { name: true } }, issue: { select: { key: true, title: true, id: true, projectId: true } } },
    }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Partial<Record<IssueStatus, number>>;
  return {
    byStatus: { BACKLOG: 0, IN_PROGRESS: 0, QA: 0, DONE: 0, VERIFIED: 0, ...counts },
    openIssues: (counts.BACKLOG ?? 0) + (counts.IN_PROGRESS ?? 0) + (counts.QA ?? 0),
    criticalOpen,
    recentActivity: recent.map((e) => ({ id: e.id, type: e.type, message: e.message, actor: e.actor.name, issue: e.issue, createdAt: e.createdAt.toISOString() })),
  };
}
