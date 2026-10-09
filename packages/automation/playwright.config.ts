import { defineConfig, devices } from '@playwright/test';
import { env, testEnvName } from './config/env';

export default defineConfig({
  testDir: './tests',
  // One shared database: run serially so board counts and transitions are deterministic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  globalSetup: './global-setup.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    {
      name: 'e2e-chromium',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Optional: use a pre-installed browser instead of Playwright's managed one.
        launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined },
      },
    },
  ],
  webServer: env.startServers
    ? {
        // Starts the BUILT backend + frontend from the repo root (run `npm run build` first).
        command: 'npm run start',
        cwd: '../..',
        url: `${env.baseUrl}/api/health`, // through the Next.js proxy → proves both servers are up
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
  metadata: { testEnv: testEnvName },
});
