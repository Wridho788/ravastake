import { expect, test } from '@playwright/test';

test('smoke production: aplikasi terbuka tanpa hook tes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'RavaStake' })).toBeVisible();
  expect(await page.evaluate(() => window.__ravastakeTest)).toBeUndefined();
});
