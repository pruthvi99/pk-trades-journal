import { expect, test } from '@playwright/test';

test('app loads and redirects to journal', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL('/journal');
	await expect(page.locator('h1')).toContainText('Trade journal');
});
