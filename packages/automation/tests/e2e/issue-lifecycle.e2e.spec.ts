import { test, expect, authFile } from '../../fixtures/test';
import { BoardPage, type Status } from '../../pages/BoardPage';

test.describe('Issue lifecycle on the Kanban board', () => {
  test.use({ storageState: authFile('developer') });

  test('create an issue, drag it across the board, then QA verifies it', async ({ page, browser, boardPage, issuePage, dfProject, uniqueTitle, apiAs }) => {
    const title = uniqueTitle('Profile photo upload fails');

    // 1. Create through the UI
    await boardPage.goto(dfProject.id);
    const before = await boardPage.counts();
    const dialog = await boardPage.openCreateDialog();
    await dialog.fill({ title, type: 'Bug', priority: 'HIGH', severity: 'HIGH', assignee: 'Devi Developer', description: 'Uploading a PNG profile photo fails with an error.' });
    const createRes = await dialog.submit();
    expect(createRes.status()).toBe(201);
    const { data: created } = await createRes.json();
    await dialog.expectClosed();
    await boardPage.expectSuccessToast(`${created.key} created`);
    await expect(boardPage.cardIn('BACKLOG', created.key)).toBeVisible();
    await expect(boardPage.cardIn('BACKLOG', created.key)).toContainText(title);
    await expect.poll(() => boardPage.count('BACKLOG')).toBe(before.BACKLOG + 1);

    // 2. Drag through the developer part of the workflow
    let previous: Status = 'BACKLOG';
    for (const to of ['IN_PROGRESS', 'QA', 'DONE'] as const) {
      const res = await boardPage.drag(created.key, to);
      expect(res.status(), await res.text()).toBe(200);
      await expect(boardPage.cardIn(to, created.key)).toBeVisible();
      await expect(boardPage.cardIn(previous, created.key)).toHaveCount(0);
      await boardPage.expectSuccessToast(`${created.key} moved to`);
      previous = to;
    }

    // 3. The UI state is persisted: reload and check the server-rendered board + API agree
    await page.reload();
    await expect(boardPage.cardIn('DONE', created.key)).toBeVisible();
    const api = await apiAs('developer');
    expect((await api.getIssue(created.id)).body.data.status).toBe('DONE');

    // 4. QA verifies it in their own browser session
    const qaContext = await browser.newContext({ storageState: authFile('qa') });
    const qaBoard = new BoardPage(await qaContext.newPage());
    await qaBoard.goto(dfProject.id);
    const verifiedBefore = await qaBoard.count('VERIFIED');
    const verifyRes = await qaBoard.drag(created.key, 'VERIFIED');
    expect(verifyRes.status()).toBe(200);
    await expect(qaBoard.cardIn('VERIFIED', created.key)).toBeVisible();
    await expect.poll(() => qaBoard.count('VERIFIED')).toBe(verifiedBefore + 1);
    await qaContext.close();

    // 5. The issue page shows the full audit trail
    await issuePage.goto(created.id);
    await expect(issuePage.status).toHaveText('Verified');
    for (const step of ['BACKLOG → IN_PROGRESS', 'IN_PROGRESS → QA', 'QA → DONE', 'DONE → VERIFIED']) {
      await expect(issuePage.history).toContainText(step);
    }
  });

  test('cards can also be moved with the keyboard-accessible "Move to" menu', async ({ boardPage, dfProject, apiAs, uniqueTitle }) => {
    const issue = (await (await apiAs('developer')).createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Menu move') })).body.data;
    await boardPage.goto(dfProject.id);
    const res = await boardPage.moveWithMenu(issue.key, 'IN_PROGRESS');
    expect(res.status()).toBe(200);
    await expect(boardPage.cardIn('IN_PROGRESS', issue.key)).toBeVisible();
  });

  test('an invalid jump (Backlog → Done) is rejected and the card snaps back', async ({ page, boardPage, dfProject, apiAs, uniqueTitle }) => {
    const issue = (await (await apiAs('developer')).createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Skip QA') })).body.data;
    await boardPage.goto(dfProject.id);
    const before = await boardPage.counts();
    const res = await boardPage.drag(issue.key, 'DONE');
    expect(res.status()).toBe(409);
    await boardPage.expectErrorToast('Cannot move an issue from BACKLOG to DONE');
    await expect(boardPage.cardIn('BACKLOG', issue.key)).toBeVisible();
    expect(await boardPage.counts()).toEqual(before);
    await page.reload();
    await expect(boardPage.cardIn('BACKLOG', issue.key)).toBeVisible();
  });
});
