import { test, expect, USERS } from '../../fixtures/test';
import { env } from '../../config/env';
import { expectToMatchSchema } from '../../utils/schema';

test.describe('Auth API', () => {
  test('valid login returns a JWT, the user (no password hash) and an httpOnly session cookie', async ({ anonymousApi }) => {
    const res = await anonymousApi.post('auth/login', { email: USERS.qa.email, password: env.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.body.user).toEqual({ id: expect.any(String), email: USERS.qa.email, name: USERS.qa.name, role: 'QA' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    const cookie = res.headers['set-cookie'];
    expect(cookie).toContain('devflow_token=');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test('email is case-insensitive', async ({ anonymousApi }) => {
    const res = await anonymousApi.post('auth/login', { email: USERS.admin.email.toUpperCase(), password: env.password });
    expect(res.status).toBe(200);
  });

  test('wrong password and unknown user get the same 401 (no account enumeration)', async ({ anonymousApi }) => {
    const wrong = await anonymousApi.post('auth/login', { email: USERS.qa.email, password: 'nope' });
    const unknown = await anonymousApi.post('auth/login', { email: 'nobody@devflow.dev', password: 'nope' });
    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expectToMatchSchema(res.body, 'error');
    }
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  test.describe('protected endpoints', () => {
    for (const [method, path] of [['get', 'projects'], ['get', 'issues'], ['post', 'issues'], ['post', 'ai/triage'], ['get', 'auth/me']] as const) {
      test(`${method.toUpperCase()} /${path} without a token → 401`, async ({ anonymousApi }) => {
        const res = method === 'get' ? await anonymousApi.get(path) : await anonymousApi.post(path, {});
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
      });
    }
  });

  test('a tampered token is rejected', async ({ apiAs }) => {
    const api = await apiAs('developer');
    const me = await api.get('auth/me');
    expect(me.status).toBe(200);
    const { request } = await import('@playwright/test');
    const forged = await request.newContext({ baseURL: `${env.apiUrl}/`, extraHTTPHeaders: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.forged' } });
    const res = await forged.get('auth/me');
    expect(res.status()).toBe(401);
    await forged.dispose();
  });
});
