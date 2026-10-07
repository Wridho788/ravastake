import { expect, test } from '@playwright/test';

test('smoke: aplikasi terbuka dan hook e2e tersedia', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'RavaStake' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__ravastakeTest?.ready)).toBe(true);
});
