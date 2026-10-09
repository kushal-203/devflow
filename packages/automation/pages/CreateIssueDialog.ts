import { expect, type Locator, type Page } from '@playwright/test';

export interface NewIssue {
  title: string;
  description?: string;
  steps?: string;
  type?: 'Bug' | 'Story' | 'Task';
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assignee?: string;
}

export class CreateIssueDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly type: Locator;
  readonly priority: Locator;
  readonly severity: Locator;
  readonly assignee: Locator;
  readonly description: Locator;
  readonly steps: Locator;
  readonly suggestWithAi: Locator;
  readonly aiPanel: Locator;
  readonly applyAi: Locator;
  readonly create: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'New issue' });
    this.title = this.root.getByLabel('Title');
    this.type = this.root.getByLabel('Type');
    this.priority = this.root.getByLabel('Priority');
    this.severity = this.root.getByLabel('Severity');
    this.assignee = this.root.getByLabel('Assignee');
    this.description = this.root.getByLabel('Description');
    this.steps = this.root.getByLabel('Steps to reproduce');
    this.suggestWithAi = this.root.getByRole('button', { name: 'Suggest with AI' });
    this.aiPanel = this.root.getByRole('region', { name: 'AI triage suggestion' });
    this.applyAi = this.root.getByRole('button', { name: /Apply severity/ });
    this.create = this.root.getByRole('button', { name: 'Create issue' });
    this.error = this.root.getByRole('alert');
  }

  async fill(issue: NewIssue) {
    await this.title.fill(issue.title);
    if (issue.type) await this.type.selectOption({ label: issue.type });
    if (issue.priority) await this.priority.selectOption(issue.priority);
    if (issue.severity) await this.severity.selectOption(issue.severity);
    if (issue.assignee) await this.assignee.selectOption({ label: issue.assignee });
    if (issue.description) await this.description.fill(issue.description);
    if (issue.steps) await this.steps.fill(issue.steps);
  }

  async submit() {
    const response = this.page.waitForResponse((r) => r.url().endsWith('/api/issues') && r.request().method() === 'POST');
    await this.create.click();
    return response;
  }

  async expectClosed() {
    await expect(this.root).toBeHidden();
  }
}
