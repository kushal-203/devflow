import { Bug, BookOpen, CheckSquare } from 'lucide-react';
import { PRIORITY_STYLE, SEVERITY_STYLE, STATUS_LABEL, STATUS_STYLE, TYPE_LABEL } from '@/lib/constants';
import type { IssueStatus, IssueType, Priority, Severity } from '@/lib/types';

export function StatusBadge({ status }: { status: IssueStatus }) {
  return <span data-testid="status-badge" className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null;
  return <span data-testid="severity-badge" className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${SEVERITY_STYLE[severity]}`}>{severity}</span>;
}

export function PriorityText({ priority }: { priority: Priority }) {
  return <span className={`text-xs font-semibold ${PRIORITY_STYLE[priority]}`}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</span>;
}

export function TypeIcon({ type }: { type: IssueType }) {
  const Icon = type === 'BUG' ? Bug : type === 'STORY' ? BookOpen : CheckSquare;
  const color = type === 'BUG' ? 'text-red-500' : type === 'STORY' ? 'text-emerald-600' : 'text-sky-600';
  return <Icon className={`size-4 ${color}`} aria-label={TYPE_LABEL[type]} role="img" />;
}
