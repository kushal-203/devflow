import type { IssueStatus, IssueType, Priority, Role, Severity } from './types';

export const STATUS_LABEL: Record<IssueStatus, string> = { BACKLOG: 'Backlog', IN_PROGRESS: 'In Progress', QA: 'QA', DONE: 'Done', VERIFIED: 'Verified' };
export const STATUSES = Object.keys(STATUS_LABEL) as IssueStatus[];

/** Mirror of the backend state machine – used only for drag hints; the server is the authority. */
export const TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  BACKLOG: ['IN_PROGRESS'], IN_PROGRESS: ['BACKLOG', 'QA'], QA: ['IN_PROGRESS', 'DONE'], DONE: ['IN_PROGRESS', 'VERIFIED'], VERIFIED: ['IN_PROGRESS'],
};

export const STATUS_STYLE: Record<IssueStatus, string> = {
  BACKLOG: 'bg-slate-100 text-slate-700', IN_PROGRESS: 'bg-blue-100 text-blue-800', QA: 'bg-amber-100 text-amber-800',
  DONE: 'bg-emerald-100 text-emerald-800', VERIFIED: 'bg-violet-100 text-violet-800',
};
export const SEVERITY_STYLE: Record<Severity, string> = {
  CRITICAL: 'bg-red-600 text-white', HIGH: 'bg-orange-100 text-orange-800', MEDIUM: 'bg-yellow-100 text-yellow-800', LOW: 'bg-slate-100 text-slate-600',
};
export const PRIORITY_STYLE: Record<Priority, string> = {
  URGENT: 'text-red-600', HIGH: 'text-orange-600', MEDIUM: 'text-slate-600', LOW: 'text-slate-400',
};
export const TYPE_LABEL: Record<IssueType, string> = { BUG: 'Bug', STORY: 'Story', TASK: 'Task' };
export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', QA: 'QA', DEVELOPER: 'Developer', VIEWER: 'Viewer' };
export const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
export const PRIORITIES: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
export const TYPES: IssueType[] = ['BUG', 'STORY', 'TASK'];
