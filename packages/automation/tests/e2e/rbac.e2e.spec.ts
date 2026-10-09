import { test, expect, authFile } from '../../fixtures/test';

test.describe('Role-based access in the UI', () => {
  test.describe('as a developer', () => {
    test.use({ storageState: authFile('developer') });

    test('dragging a Done issue to Verified is refused by the API and rolled back in the UI', async ({ page, boardPage, dfProject, apiAs, uniqueTitle }) => {
      const admin = await apiAs('admin');
      const issue = (await admin.createIssue({ projectId: dfProject.id, sprintId: dfProject.sprintId, title: uniqueTitle('Dev tries to verify') })).body.data;
      for (const s of ['IN_PROGRESS', 'QA', 'DONE']) await admin.transition(issue.id, s);

      await boardPage.goto(dfProject.id);
      const before = await boardPage.counts();
      const res = await boardPage.drag(issue.key, 'VERIFIED');
      expect(res.status()).toBe(403);
      await boardPage.expectErrorToast('Only QA or Admin users can verify an issue');
      await expect(boardPage.cardIn('DONE', issue.key)).toBeVisible();
      await expect(boardPage.cardIn('VERIFIED', issue.key)).toHaveCount(0);
      expect(await boardPage.counts()).toEqual(before);

      await page.reload();
      await expect(boardPage.cardIn('DONE', issue.key)).toBeVisible();
      expect((await admin.getIssue(issue.id)).body.data.status).toBe('DONE');
    });
  });

  test.describe('as a viewer', () => {
    test.use({ storageState: authFile('viewer') });

    test('the board is read-only: no New issue button, no drag, no move menu', async ({ boardPage, dfProject }) => {
      await boardPage.goto(dfProject.id);
      await expect(boardPage.newIssueButton).toHaveCount(0);
      const firstCard = boardPage.board.getByRole('article').first();
      await expect(firstCard).toHaveAttribute('draggable', 'false');
      await expect(boardPage.page.getByRole('combobox', { name: /^Move .* to$/ })).toHaveCount(0);
    });
  });
});
