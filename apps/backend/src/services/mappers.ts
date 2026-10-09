import type { Prisma } from '../generated/prisma/client.js';

export const userSummary = { select: { id: true, name: true, email: true, role: true } } as const;

export const issueInclude = {
  reporter: userSummary,
  assignee: userSummary,
} satisfies Prisma.IssueInclude;

export type IssueWithPeople = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

/** Public issue contract (validated by the API contract tests). */
export function toIssueDto(i: IssueWithPeople) {
  return {
    id: i.id,
    key: i.key,
    number: i.number,
    projectId: i.projectId,
    sprintId: i.sprintId,
    title: i.title,
    description: i.description,
    stepsToReproduce: i.stepsToReproduce,
    type: i.type,
    status: i.status,
    severity: i.severity,
    priority: i.priority,
    position: i.position,
    reporter: i.reporter,
    assignee: i.assignee,
    aiTriage: i.aiTriage ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}
export type IssueDto = ReturnType<typeof toIssueDto>;
