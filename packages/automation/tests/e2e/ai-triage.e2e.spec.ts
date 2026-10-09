import { test, expect, authFile } from '../../fixtures/test';

test.describe('AI triage in the UI', () => {
  test.use({ storageState: authFile('qa') });

  test('AI suggests severity and test steps while filing a bug, and the suggestion can be applied', async ({ boardPage, dfProject, uniqueTitle }) => {
    await boardPage.goto(dfProject.id);
    const dialog = await boardPage.openCreateDialog();
    await expect(dialog.suggestWithAi).toBeDisabled(); // needs a description first
    await dialog.fill({
      title: uniqueTitle('Checkout crashes with coupon'),
      description: 'The checkout page crashes after applying a coupon and the customer is charged twice.',
      steps: '1. Add an item to the cart\n2. Apply coupon SAVE10\n3. Click Pay',
    });
    await dialog.suggestWithAi.click();

    await expect(dialog.aiPanel).toBeVisible();
    await expect(dialog.aiPanel.getByTestId('severity-badge')).toHaveText('CRITICAL');
    await expect(dialog.aiPanel.getByTestId('ai-priority')).toHaveText('URGENT');
    await expect(dialog.aiPanel.getByTestId('ai-test-steps')).toContainText('Apply coupon SAVE10');

    await dialog.applyAi.click();
    await expect(dialog.severity).toHaveValue('CRITICAL');
    await expect(dialog.priority).toHaveValue('URGENT');

    const res = await dialog.submit();
    const { data } = await res.json();
    await expect(boardPage.cardIn('BACKLOG', data.key).getByTestId('severity-badge')).toHaveText('CRITICAL');
  });

  test('running AI triage on an issue generates test cases', async ({ issuePage, apiAs, dfProject, uniqueTitle }) => {
    const issue = (await (await apiAs('qa')).createIssue({ projectId: dfProject.id, title: uniqueTitle('Export fails'), description: 'CSV export returns a 500 error for large sprints.' })).body.data;
    await issuePage.goto(issue.id);
    await issuePage.runAiTriage.click();
    await issuePage.expectSuccessToast('AI triage applied');
    await expect(issuePage.aiPanel.getByTestId('severity-badge')).toHaveText('HIGH');
    await expect(issuePage.testCases.getByRole('row')).toHaveCount(1 + 3); // header + 3 AI cases
    await expect(issuePage.history).toContainText('AI (mock) suggested HIGH');
  });
});
