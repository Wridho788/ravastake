import { chromium, expect, test } from '@playwright/test';
import {
  activateFirstDraft,
  advanceDays,
  createDraft,
  gotoReady,
  nav,
  positionCard,
  startAt,
  storeCounts,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

test('STK-E15: state committed bertahan setelah reload dan direct route; tidak ada seed ulang', async ({ page }) => {
  await gotoReady(page, '/assets');
  await page.getByRole('button', { name: 'Tambah ETH ke watchlist' }).click();
  await nav(page).getByRole('link', { name: 'Posisi' }).click();
  await createDraft(page, '0,5', '30');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 5, { firstTime: true });
  const before = await storeCounts(page);

  await page.reload();
  await expect(page.getByTestId('time-badge')).toContainText('(+5 hari)');
  await expect(positionCard(page, 'Draft')).toHaveCount(1);
  await expect(positionCard(page, 'Aktif').filter({ hasText: 'ETH' })).toHaveCount(1);

  for (const path of ['/activity', '/assets', '/settings', '/dashboard']) {
    await gotoReady(page, path);
  }
  await page.goto('/assets');
  await expect(page.getByRole('button', { name: 'Hapus ETH dari watchlist' })).toBeVisible();
  await page.goto('/activity');
  await expect(page.getByTestId('activity-list')).toContainText('Lompatan waktu +5 hari');
  expect(await storeCounts(page)).toEqual(before);
});

test('STK-E15: state bertahan setelah browser profile tes yang sama dibuka ulang', async ({ baseURL }, testInfo) => {
  const profile = testInfo.outputPath('profile');
  const first = await chromium.launchPersistentContext(profile, { baseURL, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  const page = first.pages()[0] ?? (await first.newPage());
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 7, { firstTime: true });
  const before = await storeCounts(page);
  await first.close();

  const second = await chromium.launchPersistentContext(profile, { baseURL, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  const again = second.pages()[0] ?? (await second.newPage());
  await gotoReady(again, '/positions');
  await expect(again.getByTestId('time-badge')).toContainText('(+7 hari)');
  await expect(positionCard(again, 'Aktif').filter({ hasText: 'ETH' })).toHaveCount(1);
  expect(await storeCounts(again)).toEqual(before);
  await second.close();
});

test('STK-E17 + STK-E21e: reset dibatalkan mempertahankan data; dikonfirmasi memulihkan fixture dan waktu nyata', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 30, { firstTime: true });
  await nav(page).getByRole('link', { name: 'Aset' }).click();
  await page.getByRole('button', { name: 'Tambah SOL ke watchlist' }).click();
  const before = await storeCounts(page);

  await nav(page).getByRole('link', { name: 'Pengaturan' }).click();
  await expect(page.getByTestId('data-status')).toContainText('+30 hari');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset demo?' });
  await dialog.getByRole('button', { name: 'Batal' }).click();
  await expect(dialog).toBeHidden();
  expect(await storeCounts(page)).toEqual(before);
  await expect(page.getByTestId('time-badge')).toContainText('(+30 hari)');

  await page.getByRole('button', { name: 'Reset demo' }).click();
  await dialog.getByRole('button', { name: 'Ya, reset demo' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('time-badge')).toContainText('Waktu nyata');
  await expect(page.getByTestId('data-status')).toContainText('+0 hari');

  await page.reload();
  await expect(page.getByTestId('time-badge')).toContainText('Waktu nyata');
  expect(await storeCounts(page)).toEqual({ ledger: 4, activity: 1, operations: 2 });
  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '200000000');
  await expect(page.getByTestId('active-principal-SOL')).toHaveAttribute('data-units', '1000000000');
  await nav(page).getByRole('link', { name: 'Aset' }).click();
  await expect(page.getByRole('button', { name: 'Tambah SOL ke watchlist' })).toHaveAttribute('aria-pressed', 'false');
});
