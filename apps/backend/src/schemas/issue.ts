import { z } from 'zod';
import { safeText, uuid } from './common.js';

export const ISSUE_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'QA', 'DONE', 'VERIFIED'] as const;
export const ISSUE_TYPES = ['BUG', 'STORY', 'TASK'] as const;
export const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
export const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;

export const CreateIssueBody = z.object({
  projectId: uuid,
  title: safeText(200, { min: 3 }),
  description: safeText(10_000, { multiline: true }).optional(),
  stepsToReproduce: safeText(10_000, { multiline: true }).optional(),
  type: z.enum(ISSUE_TYPES).default('BUG'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  severity: z.enum(SEVERITIES).nullable().optional(),
  sprintId: uuid.nullable().optional(),
  assigneeId: uuid.nullable().optional(),
}).strict();
export type CreateIssueBody = z.infer<typeof CreateIssueBody>;

export const UpdateIssueBody = CreateIssueBody.omit({ projectId: true, type: true, priority: true }).partial().extend({
  type: z.enum(ISSUE_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
}).strict().refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update');
export type UpdateIssueBody = z.infer<typeof UpdateIssueBody>;

export const TransitionBody = z.object({
  toStatus: z.enum(ISSUE_STATUSES),
  /** Optional drop position inside the target column (index, 0 = top). */
  index: z.number().int().min(0).max(10_000).optional(),
}).strict();
export type TransitionBody = z.infer<typeof TransitionBody>;

export const ListIssuesQuery = z.object({
  projectId: uuid.optional(),
  sprintId: uuid.optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  type: z.enum(ISSUE_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  assigneeId: uuid.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', 'key']).default('-createdAt'),
}).strict();
export type ListIssuesQuery = z.infer<typeof ListIssuesQuery>;

export const ApplyTriageBody = z.object({
  applySeverity: z.boolean().default(true),
  createTestCases: z.boolean().default(true),
}).strict();
