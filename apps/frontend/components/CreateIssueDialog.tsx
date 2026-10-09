'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { PRIORITIES, SEVERITIES, TYPE_LABEL, TYPES } from '@/lib/constants';
import type { Issue, IssueType, Person, Priority, Severity, Triage } from '@/lib/types';
import { AiTriagePanel } from './AiTriagePanel';

interface Props {
  projectId: string;
  sprintId: string | null;
  onClose: () => void;
  onCreated: (issue: Issue) => void;
}

export function CreateIssueDialog({ projectId, sprintId, onClose, onCreated }: Props) {
  const [users, setUsers] = useState<Person[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('BUG');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [triage, setTriage] = useState<Triage | null>(null);
  const [busy, setBusy] = useState<'save' | 'ai' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    api.get<{ data: Person[] }>('/users').then((r) => setUsers(r.data)).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function suggest() {
    setError(null);
    setBusy('ai');
    try {
      const r = await api.post<{ data: Triage }>('/ai/triage', { title: title || undefined, description, stepsToReproduce: steps || undefined });
      setTriage(r.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'AI triage failed');
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('save');
    try {
      const r = await api.post<{ data: Issue }>('/issues', {
        projectId, sprintId, title, type, priority,
        severity: severity || null,
        assigneeId: assigneeId || null,
        description: description || undefined,
        stepsToReproduce: steps || undefined,
      });
      onCreated(r.data);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setError(`${err.message}: ${(err.details as { field: string; message: string }[]).map((d) => `${d.field} – ${d.message}`).join('; ')}`);
      } else setError(err instanceof Error ? err.message : 'Could not create the issue');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-issue-title" className="card w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-issue-title" className="text-lg font-semibold">New issue</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="btn btn-ghost p-1.5"><X className="size-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="issue-title" className="label">Title</label>
            <input id="issue-title" ref={titleRef} className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="Short summary of the problem" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="issue-type" className="label">Type</label>
              <select id="issue-type" className="input" value={type} onChange={(e) => setType(e.target.value as IssueType)}>
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="issue-priority" className="label">Priority</label>
              <select id="issue-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="issue-severity" className="label">Severity</label>
              <select id="issue-severity" className="input" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | '')}>
                <option value="">Not set</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="issue-assignee" className="label">Assignee</label>
              <select id="issue-assignee" className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="issue-description" className="label">Description</label>
            <textarea id="issue-description" className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={10000} placeholder="What happened? What did you expect?" />
          </div>
          <div>
            <label htmlFor="issue-steps" className="label">Steps to reproduce</label>
            <textarea id="issue-steps" className="input min-h-20 font-mono text-xs" value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={10000} placeholder={'1. Go to …\n2. Click …'} />
          </div>

          {triage && <AiTriagePanel triage={triage} onApply={() => { setSeverity(triage.severity); setPriority(triage.suggestedPriority); }} />}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" className="btn btn-secondary" onClick={suggest} disabled={busy !== null || description.trim().length < 10}
              title={description.trim().length < 10 ? 'Write at least 10 characters of description first' : undefined}>
              {busy === 'ai' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4 text-violet-600" aria-hidden />}
              Suggest with AI
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy !== null}>
                {busy === 'save' && <Loader2 className="size-4 animate-spin" aria-hidden />} Create issue
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
