'use client';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Workflow } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ApiError } from '@/lib/api';

const DEMO_ACCOUNTS = [
  { email: 'admin@devflow.dev', role: 'Admin' },
  { email: 'qa@devflow.dev', role: 'QA' },
  { email: 'dev@devflow.dev', role: 'Developer' },
  { email: 'viewer@devflow.dev', role: 'Viewer' },
];

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'; // no open redirects
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace(target); }, [user, router, target]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.replace(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold"><Workflow className="size-8 text-brand-600" aria-hidden /> DevFlow</div>
        <form onSubmit={submit} className="card space-y-4 p-6" aria-labelledby="login-heading">
          <h1 id="login-heading" className="text-lg font-semibold">Sign in</h1>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Sign in
          </button>
        </form>
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          <p className="mb-2 font-medium">Demo accounts <span className="font-normal">(password <code>DevFlow@2026</code>)</span></p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex items-center justify-between">
                <span>{a.email} <span className="text-slate-400">· {a.role}</span></span>
                <button type="button" className="text-brand-600 hover:underline" onClick={() => { setEmail(a.email); setPassword('DevFlow@2026'); }}>Use</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
