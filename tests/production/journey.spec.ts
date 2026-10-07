import { expect, test } from '@playwright/test';
import { activateFirstDraft, advanceDays, createDraft, gotoReady, nav, positionCard } from '../e2e/helpers';

// Runs against the production artifact (or a deployed URL): real clock, no test hooks.
// Simulated time is moved only through the product's time machine UI.

test('STK-E20 (production-local): direct route, +30 hari lewat UI, reload, tutup; hook tes tidak ada', async ({ page }) => {
  await gotoReady(page, '/positions');
  expect(await page.evaluate(() => window.__ravastakeTest)).toBeUndefined();
  await expect(page.getByTestId('time-badge')).toContainText('Waktu nyata');

  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  const active = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  // Same-day close would give 0; the time machine makes the reward visible.
  await expect(active.getByTestId('reward')).toHaveAttribute('data-units', '0');

  await advanceDays(page, 30, { firstTime: true });
  await expect(page.getByTestId('time-badge')).toContainText('(+30 hari)');
  await expect(active.getByTestId('reward')).toHaveAttribute('data-units', '410958');
  await expect(active.getByTestId('reward')).toHaveText('0,00410958 ETH');

  await page.reload();
  await expect(page.getByTestId('time-badge')).toContainText('(+30 hari)');

  await active.getByRole('button', { name: 'Tutup posisi' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tutup posisi simulasi?' });
  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog).toBeHidden();

  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '200410958');
  await expect(page.getByTestId('available-ETH')).toHaveText('2,00410958 ETH');

  await page.goto('/route-tidak-ada');
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
});

test('aset yang hilang tetap 404, bukan HTML aplikasi (vercel.json)', async ({ request }) => {
  // `vite preview` always falls back to index.html; the /assets/ exclusion lives in vercel.json,
  // so this check is only meaningful against a deployment (PLAYWRIGHT_BASE_URL).
  test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Hanya bermakna terhadap deployment Vercel');
  const response = await request.get('/assets/tidak-ada.js');
  expect(response.status()).toBe(404);
});
