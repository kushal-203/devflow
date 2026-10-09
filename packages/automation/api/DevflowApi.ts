import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { env, USERS, type RoleKey } from '../config/env';

export interface ApiResult<T = any> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

async function toResult<T>(res: APIResponse): Promise<ApiResult<T>> {
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status(), body, headers: res.headers() };
}

/**
 * Typed client for the DevFlow REST API (the API-testing equivalent of a page object).
 * Every call returns { status, body, headers } and never throws on 4xx/5xx, so tests can assert on errors.
 */
export class DevflowApi {
  private constructor(private readonly ctx: APIRequestContext, readonly role: RoleKey | 'anonymous') {}

  static async anonymous(): Promise<DevflowApi> {
    return new DevflowApi(await request.newContext({ baseURL: `${env.apiUrl}/` }), 'anonymous');
  }

  static async as(role: RoleKey): Promise<DevflowApi> {
    const anon = await request.newContext({ baseURL: `${env.apiUrl}/` });
    const res = await anon.post('auth/login', { data: { email: USERS[role].email, password: env.password } });
    if (res.status() !== 200) throw new Error(`Login as ${role} failed: ${res.status()} ${await res.text()}`);
    const { token } = await res.json();
    await anon.dispose();
    const ctx = await request.newContext({ baseURL: `${env.apiUrl}/`, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    return new DevflowApi(ctx, role);
  }

  dispose() { return this.ctx.dispose(); }

  get = async <T = any>(path: string, params?: Record<string, string | number>) => toResult<T>(await this.ctx.get(path, { params }));
  post = async <T = any>(path: string, data?: unknown) => toResult<T>(await this.ctx.post(path, { data }));
  patch = async <T = any>(path: string, data: unknown) => toResult<T>(await this.ctx.patch(path, { data }));
  delete = async <T = any>(path: string) => toResult<T>(await this.ctx.delete(path));
  /** Exact raw body, for malformed-JSON style tests. */
  postRaw = async <T = any>(path: string, raw: string, contentType = 'application/json') =>
    toResult<T>(await this.ctx.post(path, { data: Buffer.from(raw), headers: { 'Content-Type': contentType } }));

  // ---- domain helpers ----
  async projectByKey(key: string) {
    const res = await this.get('projects');
    const project = res.body.data.find((p: any) => p.key === key);
    if (!project) throw new Error(`Project ${key} not found`);
    return project as { id: string; key: string; name: string };
  }

  async activeSprint(projectId: string) {
    const res = await this.get(`projects/${projectId}/sprints`);
    return res.body.data.find((s: any) => s.status === 'ACTIVE') as { id: string; name: string } | undefined;
  }

  createIssue(data: Record<string, unknown>) { return this.post('issues', data); }
  transition(issueId: string, toStatus: string, index?: number) { return this.post(`issues/${issueId}/transition`, { toStatus, index }); }
  getIssue(issueId: string) { return this.get(`issues/${issueId}`); }
  board(projectId: string) { return this.get(`projects/${projectId}/board`); }
  resetData() { return this.post('test/reset'); }
}
