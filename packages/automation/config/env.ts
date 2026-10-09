import path from 'node:path';
import { config as loadEnv } from 'dotenv';

/** All URLs/credentials come from config/envs/<TEST_ENV>.env (default: local) or real env vars. */
export const testEnvName = process.env.TEST_ENV ?? 'local';
loadEnv({ path: path.resolve(__dirname, 'envs', `${testEnvName}.env`), quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing test setting ${name} (TEST_ENV=${testEnvName})`);
  return value.replace(/\/+$/, '');
}

export const env = {
  baseUrl: required('BASE_URL'),
  apiUrl: required('API_URL'),
  startServers: process.env.START_SERVERS === 'true',
  password: required('DEMO_PASSWORD'),
};

export const USERS = {
  admin: { email: 'admin@devflow.dev', name: 'Asha Admin', role: 'ADMIN' },
  qa: { email: 'qa@devflow.dev', name: 'Quinn QA', role: 'QA' },
  developer: { email: 'dev@devflow.dev', name: 'Devi Developer', role: 'DEVELOPER' },
  viewer: { email: 'viewer@devflow.dev', name: 'Vik Viewer', role: 'VIEWER' },
} as const;
export type RoleKey = keyof typeof USERS;
