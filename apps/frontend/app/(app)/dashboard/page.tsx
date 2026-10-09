'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleDot, FlaskConical, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { STATUS_LABEL, STATUSES } from '@/lib/constants';

const BAR_COLOR = { BACKLOG: 'bg-slate-400', IN_PROGRESS: 'bg-blue-500', QA: 'bg-amber-500', DONE: 'bg-emerald-500', VERIFIED: 'bg-violet-500' } as const;
import type { Dashboard, Project } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<{ data: Dashboard }>('/dashboard'), api.get<{ data: Project[] }>('/projects')])
      .then(([d, p]) => { setStats(d.data); setProjects(p.data); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!stats) return <p className="flex items-center gap-2 text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading dashboard…</p>;

  const total = STATUSES.reduce((s, k) => s + stats.byStatus[k], 0) || 1;
  const kpis = [
    { label: 'Open issues', value: stats.openIssues, icon: CircleDot, tone: 'text-blue-600' },
    { label: 'Waiting for QA', value: stats.byStatus.QA, icon: FlaskConical, tone: 'text-amber-600' },
    { label: 'Verified', value: stats.byStatus.VERIFIED, icon: CheckCircle2, tone: 'text-violet-600' },
    { label: 'Critical open', value: stats.criticalOpen, icon: AlertTriangle, tone: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">Welcome back, {user?.name.split(' ')[0]}.</p>
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <article key={k.label} aria-label={k.label} className="card p-4">
            <div className="flex items-center justify-between text-sm text-slate-500">{k.label}<k.icon className={`size-4 ${k.tone}`} aria-hidden /></div>
            <p className="mt-2 text-3xl font-bold" data-testid="kpi-value">{k.value}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="dist-title" className="card p-5">
        <h2 id="dist-title" className="mb-3 text-sm font-semibold">Issues by status</h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Issue status distribution">
          {STATUSES.map((s) => <div key={s} className={BAR_COLOR[s]} style={{ width: `${(stats.byStatus[s] / total) * 100}%` }} />)}
        </div>
        <ul className="mt-3 flex flex-wrap gap-4 text-sm">
          {STATUSES.map((s) => <li key={s}><span className={`mr-1.5 inline-block size-2.5 rounded-full ${BAR_COLOR[s]}`} />{STATUS_LABEL[s]} <strong>{stats.byStatus[s]}</strong></li>)}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="projects-title" className="card p-5">
          <h2 id="projects-title" className="mb-3 text-sm font-semibold">Projects</h2>
          <ul className="divide-y divide-slate-100">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/projects/${p.id}/board`} className="font-medium text-brand-700 hover:underline">{p.key} · {p.name}</Link>
                  <p className="text-xs text-slate-500">{p.description}</p>
                </div>
                <span className="text-sm text-slate-600"><strong>{p.openIssueCount}</strong> open / {p.issueCount}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="activity-title" className="card p-5">
          <h2 id="activity-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity className="size-4" aria-hidden /> Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {stats.recentActivity.map((a) => (
              <li key={a.id} className="flex gap-2">
                <Link href={`/issues/${a.issue.id}`} className="shrink-0 font-semibold text-brand-700 hover:underline">{a.issue.key}</Link>
                <span className="truncate text-slate-600">{a.message} · <span className="text-slate-400">{a.actor}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
