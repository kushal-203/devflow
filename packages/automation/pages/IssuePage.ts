import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class IssuePage extends BasePage {
  readonly key: Locator;
  readonly status: Locator;
  readonly runAiTriage: Locator;
  readonly aiPanel: Locator;
  readonly testCases: Locator;
  readonly history: Locator;

  constructor(page: Page) {
    super(page);
    this.key = page.getByTestId('issue-key');
    this.status = page.getByTestId('status-badge').first();
    this.runAiTriage = page.getByRole('button', { name: /Run AI triage|Re-run AI triage/ });
    this.aiPanel = page.getByRole('region', { name: 'AI triage suggestion' });
    this.testCases = page.getByRole('table', { name: 'Test cases' });
    this.history = page.getByTestId('issue-history');
  }

  async goto(issueId: string) {
    await this.page.goto(`/issues/${issueId}`);
    await expect(this.key).toBeVisible();
  }
}
