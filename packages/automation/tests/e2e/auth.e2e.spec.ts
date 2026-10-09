import { test, expect, USERS } from '../../fixtures/test';
import { env } from '../../config/env';

test.describe('Login', () => {
  for (const role of ['admin', 'qa', 'developer'] as const) {
    test(`${role} can sign in and lands on the dashboard`, async ({ page, loginPage, dashboardPage, shell }) => {
      await loginPage.goto();
      await loginPage.login(USERS[role].email, env.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(dashboardPage.heading).toBeVisible();
      await shell.expectSignedInAs(USERS[role].name, { admin: 'Admin', qa: 'QA', developer: 'Developer' }[role]);
    });
  }

  test('wrong password shows an error and stays on the login page', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(USERS.qa.email, 'wrong-password');
    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a protected page redirects to login and returns there after signing in', async ({ page, loginPage, dfProject, boardPage }) => {
    await page.goto(`/projects/${dfProject.id}/board`);
    await expect(page).toHaveURL(/\/login\?next=/);
    await loginPage.login(USERS.developer.email, env.password);
    await expect(page).toHaveURL(new RegExp(`/projects/${dfProject.id}/board$`));
    await expect(boardPage.heading).toBeVisible();
  });

  test('signing out ends the session', async ({ page, loginPage, shell }) => {
    await loginPage.goto();
    await loginPage.login(USERS.qa.email, env.password);
    await expect(page).toHaveURL(/\/dashboard$/);
    await shell.signOut.click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/); // cookie really cleared
  });
});
