'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { FolderKanban, LayoutDashboard, LogOut, Loader2, Workflow } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/constants';
import type { Project } from '@/lib/types';

/** Authenticated layout: redirects to /login without a session, renders the sidebar otherwise. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  useEffect(() => {
    if (user) api.get<{ data: Project[] }>('/projects').then((r) => setProjects(r.data)).catch(() => setProjects([]));
  }, [user]);

  if (loading || !user) {
    return <div className="flex h-full items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Loading…</div>;
  }

  const navItem = (href: string, label: string, icon: ReactNode, active: boolean) => (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      {icon}<span className="truncate">{label}</span>
    </Link>
  );

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-slate-900 px-3 py-4 text-white">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold"><Workflow className="size-6 text-brand-500" aria-hidden /> DevFlow</Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {navItem('/dashboard', 'Dashboard', <LayoutDashboard className="size-4" aria-hidden />, pathname === '/dashboard')}
          <p className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">Projects</p>
          {projects.map((p) => navItem(`/projects/${p.id}/board`, `${p.key} · ${p.name}`, <FolderKanban className="size-4" aria-hidden />, pathname.startsWith(`/projects/${p.id}`)))}
        </nav>
        <div className="border-t border-white/10 pt-3" data-testid="current-user">
          <p className="truncate px-2 text-sm font-semibold">{user.name}</p>
          <p className="truncate px-2 text-xs text-slate-400">{user.email} · <span data-testid="current-role">{ROLE_LABEL[user.role]}</span></p>
          <button type="button" onClick={async () => { await logout(); router.replace('/login'); }}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
