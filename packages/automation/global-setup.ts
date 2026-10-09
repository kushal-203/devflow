import { request, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { env, USERS, type RoleKey } from './config/env';

/**
 * Runs once before all tests:
 *  1. waits for the API, then resets the database to the seed data (POST /api/test/reset);
 *  2. signs in each role through the Next.js origin and saves the session cookie as a
 *     storage state file, so E2E tests start already logged in (the login UI has its own tests).
 */
export default async function globalSetup(_config: FullConfig) {
  const api = await request.newContext({ baseURL: `${env.apiUrl}/` });
  const deadline = Date.now() + 60_000;
  while (true) {
    try { if ((await api.get('health')).ok()) break; } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error(`API not reachable at ${env.apiUrl}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const reset = await api.post('test/reset');
  if (reset.status() !== 200) throw new Error(`Data reset failed (${reset.status()}). Is ENABLE_TEST_ROUTES=true on the server?`);
  await api.dispose();

  const authDir = path.resolve(__dirname, '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  for (const role of Object.keys(USERS) as RoleKey[]) {
    const web = await request.newContext({ baseURL: env.baseUrl });
    const res = await web.post('/api/auth/login', { data: { email: USERS[role].email, password: env.password } });
    if (!res.ok()) throw new Error(`Login for ${role} failed: ${res.status()}`);
    await web.storageState({ path: path.join(authDir, `${role}.json`) });
    await web.dispose();
  }
}
