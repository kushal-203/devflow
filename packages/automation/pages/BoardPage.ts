import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { CreateIssueDialog } from './CreateIssueDialog';

export type Status = 'BACKLOG' | 'IN_PROGRESS' | 'QA' | 'DONE' | 'VERIFIED';
export const COLUMN_TITLE: Record<Status, string> = { BACKLOG: 'Backlog', IN_PROGRESS: 'In Progress', QA: 'QA', DONE: 'Done', VERIFIED: 'Verified' };

export class BoardPage extends BasePage {
  readonly heading: Locator;
  readonly board: Locator;
  readonly newIssueButton: Locator;
  readonly sprintSelect: Locator;
  readonly createDialog: CreateIssueDialog;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Sprint board' });
    this.board = page.getByTestId('kanban-board');
    this.newIssueButton = page.getByRole('button', { name: 'New issue' });
    this.sprintSelect = page.getByLabel('Sprint');
    this.createDialog = new CreateIssueDialog(page);
  }

  async goto(projectId: string) {
    await this.page.goto(`/projects/${projectId}/board`);
    await expect(this.board).toBeVisible();
  }

  /** Column located by its accessible name (the <h2> heading). */
  column(status: Status): Locator {
    return this.page.getByRole('region', { name: COLUMN_TITLE[status], exact: true });
  }

  card(key: string): Locator {
    return this.board.getByRole('article', { name: new RegExp(`^${key}:`) });
  }

  cardIn(status: Status, key: string): Locator {
    return this.column(status).getByRole('article', { name: new RegExp(`^${key}:`) });
  }

  async count(status: Status): Promise<number> {
    return Number(await this.column(status).getByTestId('column-count').innerText());
  }

  async counts(): Promise<Record<Status, number>> {
    const entries = await Promise.all((Object.keys(COLUMN_TITLE) as Status[]).map(async (s) => [s, await this.count(s)] as const));
    return Object.fromEntries(entries) as Record<Status, number>;
  }

  /** Native HTML5 drag and drop of a card onto a column; resolves with the transition API response. */
  async drag(key: string, to: Status) {
    const response = this.page.waitForResponse((r) => r.url().includes('/transition') && r.request().method() === 'POST');
    // Drop on the column header area: long columns can be taller than the viewport, so their
    // centre point may be off-screen (this made the test flaky once the board filled up).
    await this.card(key).dragTo(this.column(to), { targetPosition: { x: 60, y: 20 } });
    return response;
  }

  /** Keyboard-accessible alternative to drag and drop. */
  async moveWithMenu(key: string, to: Status) {
    const response = this.page.waitForResponse((r) => r.url().includes('/transition'));
    await this.page.getByLabel(`Move ${key} to`).selectOption(to);
    return response;
  }

  async openCreateDialog() {
    await this.newIssueButton.click();
    await expect(this.createDialog.root).toBeVisible();
    return this.createDialog;
  }
}
