'use client';
import Link from 'next/link';
import { useState, type DragEvent } from 'react';
import { UserRound } from 'lucide-react';
import { STATUS_LABEL, TRANSITIONS } from '@/lib/constants';
import type { BoardColumn, BoardIssue, IssueStatus, Role } from '@/lib/types';
import { PriorityText, SeverityBadge, TypeIcon } from './Badges';

interface Props {
  columns: BoardColumn[];
  role: Role;
  onMove: (issue: BoardIssue, toStatus: IssueStatus, index?: number) => void;
}

/** Client-side hint only – the API enforces the real rules (and tests prove it). */
function canDrop(from: IssueStatus, to: IssueStatus, role: Role): boolean {
  if (role === 'VIEWER' || !TRANSITIONS[from].includes(to)) return false;
  if ((to === 'VERIFIED' || from === 'VERIFIED') && role !== 'QA' && role !== 'ADMIN') return false;
  return true;
}

export function KanbanBoard({ columns, role, onMove }: Props) {
  const [dragging, setDragging] = useState<BoardIssue | null>(null);
  const [over, setOver] = useState<IssueStatus | null>(null);
  const readOnly = role === 'VIEWER';

  const dropOn = (e: DragEvent, status: IssueStatus, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain');
    const issue = columns.flatMap((c) => c.issues).find((i) => i.id === id) ?? dragging;
    setDragging(null);
    setOver(null);
    if (issue) onMove(issue, status, index);
  };

  return (
    <div className="grid min-w-[1100px] grid-cols-5 gap-4" data-testid="kanban-board">
      {columns.map((col) => {
        const hint = dragging && dragging.status !== col.status ? (canDrop(dragging.status, col.status, role) ? 'allowed' : 'blocked') : null;
        return (
          <section
            key={col.status}
            aria-labelledby={`col-${col.status}`}
            data-testid={`column-${col.status}`}
            data-drop-hint={hint ?? undefined}
            onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setOver(col.status); } }}
            onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
            onDrop={(e) => dropOn(e, col.status)}
            className={`flex min-h-[60vh] flex-col rounded-xl border-2 bg-slate-100/80 p-3 transition
              ${hint === 'allowed' ? 'border-dashed border-emerald-400' : hint === 'blocked' ? 'border-transparent opacity-60' : 'border-transparent'}
              ${over === col.status && hint === 'allowed' ? 'bg-emerald-50' : ''}`}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h2 id={`col-${col.status}`} className="text-sm font-semibold text-slate-700">{col.title}</h2>
              <span data-testid="column-count" aria-label={`${col.issues.length} issues`} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{col.issues.length}</span>
            </header>
            <ul className="flex flex-1 flex-col gap-2" aria-label={`${col.title} issues`}>
              {col.issues.map((issue, index) => (
                <li key={issue.id} onDragOver={(e) => !readOnly && e.preventDefault()} onDrop={(e) => dropOn(e, col.status, index)}>
                  <article
                    data-testid="issue-card"
                    data-issue-key={issue.key}
                    aria-label={`${issue.key}: ${issue.title}`}
                    draggable={!readOnly}
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', issue.id); e.dataTransfer.effectAllowed = 'move'; setDragging(issue); }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'} ${dragging?.id === issue.id ? 'opacity-40' : ''}`}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <TypeIcon type={issue.type} />
                      <Link href={`/issues/${issue.id}`} className="text-xs font-semibold text-slate-500 hover:text-brand-600 hover:underline">{issue.key}</Link>
                      <span className="ml-auto"><SeverityBadge severity={issue.severity} /></span>
                    </div>
                    <p className="mb-2 text-sm leading-snug font-medium text-slate-800">{issue.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <PriorityText priority={issue.priority} />
                      <span className="flex items-center gap-1 truncate text-xs text-slate-500"><UserRound className="size-3.5" aria-hidden />{issue.assignee?.name ?? 'Unassigned'}</span>
                    </div>
                    {!readOnly && (
                      // Keyboard / assistive-tech alternative to drag and drop
                      <label className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="sr-only">Move {issue.key} to</span>
                        <select
                          aria-label={`Move ${issue.key} to`}
                          className="w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] text-slate-500"
                          value=""
                          onChange={(e) => e.target.value && onMove(issue, e.target.value as IssueStatus)}
                        >
                          <option value="">Move to…</option>
                          {TRANSITIONS[issue.status].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </label>
                    )}
                  </article>
                </li>
              ))}
              {col.issues.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Drop issues here</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
