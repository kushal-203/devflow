import type { IssueStatus, Role } from '../generated/prisma/client.js';
import { conflict, forbidden } from '../lib/errors.js';

/**
 * Issue lifecycle (state machine):
 *
 *   BACKLOG ⇄ IN_PROGRESS ⇄ QA → DONE → VERIFIED
 *                  ↑                │        │
 *                  └──── reopen ────┴────────┘
 */
export const TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  BACKLOG: ['IN_PROGRESS'],
  IN_PROGRESS: ['BACKLOG', 'QA'],
  QA: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS', 'VERIFIED'],
  VERIFIED: ['IN_PROGRESS'],
};

/** Roles allowed to make a transition, when it is restricted. Unlisted transitions: any writer. */
const RESTRICTED: Array<{ from?: IssueStatus; to?: IssueStatus; roles: Role[]; reason: string }> = [
  { to: 'VERIFIED', roles: ['QA', 'ADMIN'], reason: 'Only QA or Admin users can verify an issue' },
  { from: 'VERIFIED', roles: ['QA', 'ADMIN'], reason: 'Only QA or Admin users can reopen a verified issue' },
];

export function allowedTargets(from: IssueStatus, role: Role): IssueStatus[] {
  if (role === 'VIEWER') return [];
  return TRANSITIONS[from].filter((to) => !RESTRICTED.some((r) => (!r.from || r.from === from) && (!r.to || r.to === to) && !r.roles.includes(role)));
}

/** Throws 409 for an impossible transition and 403 for a transition the role may not perform. */
export function assertTransition(from: IssueStatus, to: IssueStatus, role: Role): void {
  if (from === to) return; // re-ordering inside the same column
  if (role === 'VIEWER') throw forbidden('Viewers cannot change issues', 'FORBIDDEN_TRANSITION');
  if (!TRANSITIONS[from].includes(to)) {
    throw conflict('INVALID_TRANSITION', `Cannot move an issue from ${from} to ${to}`, { from, to, allowed: TRANSITIONS[from] });
  }
  const rule = RESTRICTED.find((r) => (!r.from || r.from === from) && (!r.to || r.to === to));
  if (rule && !rule.roles.includes(role)) throw forbidden(rule.reason, 'FORBIDDEN_TRANSITION');
}
