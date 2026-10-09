import { prisma } from '../lib/prisma.js';
import { conflict, notFound } from '../lib/errors.js';

type SprintInput = { name?: string; goal?: string; status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED'; startDate?: Date; endDate?: Date };

async function ensureSingleActive(projectId: string, status: string | undefined, exceptId?: string) {
  if (status !== 'ACTIVE') return;
  const active = await prisma.sprint.findFirst({ where: { projectId, status: 'ACTIVE', ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
  if (active) throw conflict('ACTIVE_SPRINT_EXISTS', `Sprint "${active.name}" is already active in this project`);
}

export async function listSprints(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project');
  return prisma.sprint.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' }, include: { _count: { select: { issues: true } } } });
}

export async function createSprint(projectId: string, data: SprintInput & { name: string }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project');
  await ensureSingleActive(projectId, data.status);
  return prisma.sprint.create({ data: { ...data, projectId } });
}

export async function updateSprint(id: string, data: SprintInput) {
  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) throw notFound('Sprint');
  await ensureSingleActive(sprint.projectId, data.status, id);
  return prisma.sprint.update({ where: { id }, data });
}

export async function deleteSprint(id: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id } });
  if (!sprint) throw notFound('Sprint');
  await prisma.sprint.delete({ where: { id } }); // issues fall back to the backlog (onDelete: SetNull)
}
