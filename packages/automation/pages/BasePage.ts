import { expect, type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  readonly toastSuccess: Locator;
  readonly toastError: Locator;

  constructor(readonly page: Page) {
    this.toastSuccess = page.getByTestId('toast-success');
    this.toastError = page.getByTestId('toast-error');
  }

  async expectSuccessToast(text: string | RegExp) {
    await expect(this.toastSuccess.filter({ hasText: text }).last()).toBeVisible();
  }

  async expectErrorToast(text: string | RegExp) {
    await expect(this.page.getByRole('alert').filter({ hasText: text }).last()).toBeVisible();
  }
}
