import path from 'node:path';
import { test as base, expect } from '@playwright/test';
import { DevflowApi } from '../api/DevflowApi';
import { USERS, type RoleKey } from '../config/env';
import { AppShell } from '../pages/AppShell';
import { BoardPage } from '../pages/BoardPage';
import { DashboardPage } from '../pages/DashboardPage';
import { IssuePage } from '../pages/IssuePage';
import { LoginPage } from '../pages/LoginPage';

/** Saved session for a role (created in global-setup) – use with test.use({ storageState: authFile('qa') }). */
export const authFile = (role: RoleKey) => path.resolve(__dirname, '..', '.auth', `${role}.json`);

type Fixtures = {
  /** Auto fixture: every test starts from the same seeded data (POST /api/test/reset). */
  resetDatabase: void;
  /** Authenticated API clients per role, created lazily and disposed after the test. */
  apiAs: (role: RoleKey) => Promise<DevflowApi>;
  anonymousApi: DevflowApi;
  /** The seeded "DF" project and its active sprint. */
  dfProject: { id: string; key: string; sprintId: string };
  /** A title that is unique per test run, so tests never collide on shared data. */
  uniqueTitle: (prefix: string) => string;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  boardPage: BoardPage;
  issuePage: IssuePage;
  shell: AppShell;
};

export const test = base.extend<Fixtures>({
  resetDatabase: [async ({}, use) => {
    const api = await DevflowApi.anonymous();
    const res = await api.resetData();
    await api.dispose();
    if (res.status !== 200) throw new Error(`Data reset failed (${res.status}) – is ENABLE_TEST_ROUTES=true on the server?`);
    await use();
  }, { auto: true }],
  apiAs: async ({}, use) => {
    const clients: DevflowApi[] = [];
    await use(async (role) => {
      const client = await DevflowApi.as(role);
      clients.push(client);
      return client;
    });
    await Promise.all(clients.map((c) => c.dispose()));
  },
  anonymousApi: async ({}, use) => {
    const client = await DevflowApi.anonymous();
    await use(client);
    await client.dispose();
  },
  dfProject: async ({ apiAs }, use) => {
    const admin = await apiAs('admin');
    const project = await admin.projectByKey('DF');
    const sprint = await admin.activeSprint(project.id);
    if (!sprint) throw new Error('DF has no active sprint – was the database seeded?');
    await use({ id: project.id, key: project.key, sprintId: sprint.id });
  },
  uniqueTitle: async ({}, use, testInfo) => {
    let n = 0;
    await use((prefix) => `${prefix} [${testInfo.workerIndex}-${Date.now().toString(36)}-${n++}]`);
  },
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  boardPage: async ({ page }, use) => use(new BoardPage(page)),
  issuePage: async ({ page }, use) => use(new IssuePage(page)),
  shell: async ({ page }, use) => use(new AppShell(page)),
});

export { expect, USERS };
