import type { IssueStatus } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { ISSUE_STATUSES } from '../schemas/issue.js';

const COLUMN_TITLES: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog', IN_PROGRESS: 'In Progress', QA: 'QA', DONE: 'Done', VERIFIED: 'Verified',
};

export async function listProjects() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { issues: true } } } });
  const open = await prisma.issue.groupBy({ by: ['projectId'], where: { status: { notIn: ['DONE', 'VERIFIED'] } }, _count: true });
  return projects.map(({ _count, ...p }) => ({ ...p, issueCount: _count.issues, openIssueCount: open.find((o) => o.projectId === p.id)?._count ?? 0 }));
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({ where: { id }, include: { sprints: { orderBy: { createdAt: 'asc' } } } });
  if (!project) throw notFound('Project');
  return project;
}

export async function createProject(data: { key: string; name: string; description?: string }) {
  return prisma.project.create({ data });
}

export async function updateProject(id: string, data: { name?: string; description?: string }) {
  await getProject(id);
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string) {
  await getProject(id);
  await prisma.project.delete({ where: { id } });
}

/**
 * Sprint board: issues of one sprint grouped into the five workflow columns.
 * sprintId omitted → the project's ACTIVE sprint; 'backlog' → issues not in any sprint.
 */
export async function getBoard(projectId: string, sprintId?: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, key: true, name: true } });
  if (!project) throw notFound('Project');

  let sprint = null;
  if (sprintId && sprintId !== 'backlog') {
    sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId } });
    if (!sprint) throw notFound('Sprint');
  } else if (!sprintId) {
    sprint = await prisma.sprint.findFirst({ where: { projectId, status: 'ACTIVE' }, orderBy: { startDate: 'desc' } });
  }

  const issues = await prisma.issue.findMany({
    where: { projectId, sprintId: sprint ? sprint.id : null },
    orderBy: [{ position: 'asc' }, { number: 'asc' }],
    select: {
      id: true, key: true, title: true, type: true, status: true, severity: true, priority: true, position: true,
      assignee: { select: { id: true, name: true } },
    },
  });

  const columns = ISSUE_STATUSES.map((status) => ({
    status,
    title: COLUMN_TITLES[status],
    issues: issues.filter((i) => i.status === status),
  }));
  return { project, sprint, columns, totalIssues: issues.length };
}
