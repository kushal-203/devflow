import { expect, type Locator, type Page } from '@playwright/test';

/** Sidebar / layout available on every authenticated page. */
export class AppShell {
  readonly nav: Locator;
  readonly currentRole: Locator;
  readonly currentUser: Locator;
  readonly signOut: Locator;

  constructor(readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.currentUser = page.getByTestId('current-user');
    this.currentRole = page.getByTestId('current-role');
    this.signOut = page.getByRole('button', { name: 'Sign out' });
  }

  async openProject(label: RegExp | string) {
    await this.nav.getByRole('link', { name: label }).click();
  }

  async expectSignedInAs(name: string, role: string) {
    await expect(this.currentUser).toContainText(name);
    await expect(this.currentRole).toHaveText(role);
  }
}
