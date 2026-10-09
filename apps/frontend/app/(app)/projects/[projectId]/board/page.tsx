'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/constants';
import type { Board, BoardIssue, Issue, IssueStatus, Sprint } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CreateIssueDialog } from '@/components/CreateIssueDialog';

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const notify = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintId, setSprintId] = useState<string>(''); // '' = active sprint
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = sprintId ? `?sprintId=${sprintId}` : '';
      const [b, s] = await Promise.all([api.get<{ data: Board }>(`/projects/${projectId}/board${qs}`), api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`)]);
      setBoard(b.data);
      setSprints(s.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the board');
    }
  }, [projectId, sprintId]);

  useEffect(() => { load(); }, [load]);

  /** Optimistic move: update the UI immediately, roll back if the API rejects the transition. */
  async function move(issue: BoardIssue, toStatus: IssueStatus, index?: number) {
    if (!board) return;
    const previous = board;
    const moved = { ...issue, status: toStatus };
    const columns = board.columns.map((c) => {
      const rest = c.issues.filter((i) => i.id !== issue.id);
      if (c.status !== toStatus) return { ...c, issues: rest };
      const at = index === undefined ? rest.length : Math.min(index, rest.length);
      return { ...c, issues: [...rest.slice(0, at), moved, ...rest.slice(at)] };
    });
    setBoard({ ...board, columns });
    try {
      await api.post(`/issues/${issue.id}/transition`, { toStatus, index });
      if (issue.status !== toStatus) notify('success', `${issue.key} moved to ${STATUS_LABEL[toStatus]}`);
    } catch (e) {
      setBoard(previous);
      notify('error', e instanceof ApiError ? e.message : 'Could not move the issue');
    }
  }

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!board || !user) return <p className="flex items-center gap-2 text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading board…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{board.project.key} · {board.project.name}</p>
          <h1 className="text-2xl font-bold">Sprint board</h1>
          {board.sprint?.goal && <p className="text-sm text-slate-600">Goal: {board.sprint.goal}</p>}
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="sprint-select" className="label">Sprint</label>
            <select id="sprint-select" className="input w-56" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
              <option value="">Active sprint{board.sprint && !sprintId ? ` (${board.sprint.name})` : ''}</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.status.toLowerCase()}</option>)}
              <option value="backlog">Product backlog (no sprint)</option>
            </select>
          </div>
          {user.role !== 'VIEWER' && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> New issue</button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{board.totalIssues} issues on this board</p>
      <div className="overflow-x-auto pb-4">
        <KanbanBoard columns={board.columns} role={user.role} onMove={move} />
      </div>

      {creating && (
        <CreateIssueDialog
          projectId={projectId}
          sprintId={sprintId === 'backlog' ? null : (board.sprint?.id ?? null)}
          onClose={() => setCreating(false)}
          onCreated={(issue: Issue) => { setCreating(false); notify('success', `${issue.key} created`); load(); }}
        />
      )}
    </div>
  );
}
