import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly metrics: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    this.metrics = page.getByRole('region', { name: 'Key metrics' });
  }

  async goto() {
    await this.page.goto('/dashboard');
    await expect(this.heading).toBeVisible();
  }

  async metric(label: string): Promise<number> {
    const text = await this.metrics.getByRole('article', { name: label }).getByTestId('kpi-value').innerText();
    return Number(text);
  }
}
