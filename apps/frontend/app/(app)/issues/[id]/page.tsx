'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, History, Loader2, Sparkles } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/constants';
import type { Issue, IssueEvent, IssueStatus, TestCase } from '@/lib/types';
import { PriorityText, SeverityBadge, StatusBadge, TypeIcon } from '@/components/Badges';
import { AiTriagePanel } from '@/components/AiTriagePanel';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const notify = useToast();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [i, e, t] = await Promise.all([
        api.get<{ data: Issue }>(`/issues/${id}`), api.get<{ data: IssueEvent[] }>(`/issues/${id}/events`), api.get<{ data: TestCase[] }>(`/issues/${id}/test-cases`),
      ]);
      setIssue(i.data); setEvents(e.data); setCases(t.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the issue');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function runTriage() {
    setBusy(true);
    try {
      await api.post(`/issues/${id}/triage`, { applySeverity: true, createTestCases: true });
      notify('success', 'AI triage applied and test cases generated');
      await load();
    } catch (e) {
      notify('error', e instanceof ApiError ? e.message : 'AI triage failed');
    } finally { setBusy(false); }
  }

  async function transition(to: IssueStatus) {
    try {
      await api.post(`/issues/${id}/transition`, { toStatus: to });
      notify('success', `Moved to ${STATUS_LABEL[to]}`);
      await load();
    } catch (e) {
      notify('error', e instanceof ApiError ? e.message : 'Could not change status');
    }
  }

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!issue) return <p className="flex items-center gap-2 text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading issue…</p>;

  return (
    <div className="max-w-5xl space-y-6">
      <Link href={`/projects/${issue.projectId}/board`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" aria-hidden /> Back to board</Link>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500"><TypeIcon type={issue.type} /> <span data-testid="issue-key">{issue.key}</span> <StatusBadge status={issue.status} /> <SeverityBadge severity={issue.severity} /> <PriorityText priority={issue.priority} /></div>
        <h1 className="text-2xl font-bold">{issue.title}</h1>
        <p className="text-sm text-slate-500">Reported by {issue.reporter.name} · Assignee {issue.assignee?.name ?? 'none'}</p>
      </header>

      {user?.role !== 'VIEWER' && (issue.allowedTransitions?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Status actions">
          <span className="text-sm text-slate-500">Move to:</span>
          {issue.allowedTransitions!.map((s) => <button key={s} type="button" className="btn btn-secondary" onClick={() => transition(s)}>{STATUS_LABEL[s]}</button>)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5" aria-labelledby="desc-title">
            <h2 id="desc-title" className="mb-2 text-sm font-semibold">Description</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{issue.description || '—'}</p>
            {issue.stepsToReproduce && (<><h3 className="mt-4 mb-2 text-sm font-semibold">Steps to reproduce</h3><pre className="rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap">{issue.stepsToReproduce}</pre></>)}
          </section>

          <section className="space-y-3" aria-labelledby="ai-title">
            <div className="flex items-center justify-between">
              <h2 id="ai-title" className="text-sm font-semibold">AI triage &amp; test cases</h2>
              {user?.role !== 'VIEWER' && (
                <button type="button" className="btn btn-secondary" onClick={runTriage} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4 text-violet-600" aria-hidden />} {issue.aiTriage ? 'Re-run AI triage' : 'Run AI triage'}
                </button>
              )}
            </div>
            {issue.aiTriage ? <AiTriagePanel triage={issue.aiTriage} /> : <p className="text-sm text-slate-500">Not triaged yet.</p>}
            {cases.length > 0 && (
              <table className="card w-full overflow-hidden text-sm" aria-label="Test cases">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase"><tr><th className="p-3">Test case</th><th className="p-3">Expected</th><th className="p-3">Source</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => (
                    <tr key={c.id}><td className="p-3 align-top"><p className="font-medium">{c.title}</p><ol className="mt-1 list-decimal pl-5 text-xs text-slate-600">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></td>
                      <td className="p-3 align-top text-xs text-slate-600">{c.expected}</td><td className="p-3 align-top text-xs">{c.source}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <section className="card h-fit p-5" aria-labelledby="history-title">
          <h2 id="history-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="size-4" aria-hidden /> History</h2>
          <ol className="space-y-3 text-sm" data-testid="issue-history">
            {events.map((e) => (
              <li key={e.id} className="border-l-2 border-slate-200 pl-3">
                <p className="text-slate-700">{e.message}</p>
                <p className="text-xs text-slate-400">{e.actor.name} · {new Date(e.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
