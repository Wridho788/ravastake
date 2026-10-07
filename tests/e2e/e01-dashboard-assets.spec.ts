import { expect, test, type Page } from '@playwright/test';
import { gotoReady, startAt, storeCounts } from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

function rows(page: Page) {
  return page.getByTestId('asset-list').locator('[data-testid^="asset-row-"]');
}

async function rowOrder(page: Page): Promise<string[]> {
  const ids = await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-testid') ?? ''));
  return ids.map((id) => id.replace('asset-row-', ''));
}

test('STK-E01: dashboard menampilkan label demo, saldo dan posisi seed, harga; reload tidak menggandakan seed', async ({ page }) => {
  await gotoReady(page, '/dashboard');
  await expect(page.getByText('Data simulasi', { exact: true })).toBeVisible();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '200000000');
  await expect(page.getByTestId('available-SOL')).toHaveAttribute('data-units', '4000000000');
  await expect(page.getByTestId('available-AVAX')).toHaveAttribute('data-units', '10000000000');
  await expect(page.getByTestId('active-principal-SOL')).toHaveAttribute('data-units', '1000000000');
  // Oracle 7: seed SOL estimate at T0.
  await expect(page.getByTestId('estimated-reward-SOL')).toHaveText('0,05753424 SOL');
  await expect(page.getByTestId('asset-ETH')).toContainText(/US\$\s?2\.000,00/);
  await expect(page.getByTestId('total-usd')).toHaveText(/US\$\s?11\.500,00/);
  await expect(page.getByTestId('dashboard-active')).toContainText('10 SOL');

  const before = await storeCounts(page);
  expect(before).toEqual({ ledger: 4, activity: 1, operations: 2 });

  await page.getByRole('link', { name: 'Detail ETH' }).click();
  await expect(page).toHaveURL(/\/assets\?asset=ETH$/);
  const detail = page.getByTestId('asset-detail');
  await expect(detail.getByRole('heading', { name: /Detail ETH/ })).toBeVisible();
  await expect(detail).toContainText('5% · Rava Node ETH (demo)');
  await expect(detail).toContainText('1 ETH = 100.000.000 unit');

  await page.reload();
  await expect(page.getByTestId('time-badge')).toBeVisible();
  expect(await storeCounts(page)).toEqual(before);
});

test('STK-E02: cari, urutkan, ganti rentang grafik, empty state yang bisa dipulihkan', async ({ page }) => {
  await gotoReady(page, '/assets');
  await expect(rows(page)).toHaveCount(3);
  expect(await rowOrder(page)).toEqual(['ETH', 'SOL', 'AVAX']);

  await page.getByLabel('Cari aset').fill('eth');
  expect(await rowOrder(page)).toEqual(['ETH']);
  await page.getByLabel('Cari aset').fill('Solana');
  expect(await rowOrder(page)).toEqual(['SOL']);
  await page.getByLabel('Cari aset').fill('');

  await page.getByLabel('Urutkan').selectOption({ label: 'APR tertinggi' });
  expect(await rowOrder(page)).toEqual(['SOL', 'AVAX', 'ETH']);
  await page.getByLabel('Urutkan').selectOption({ label: 'Harga terendah' });
  expect(await rowOrder(page)).toEqual(['AVAX', 'SOL', 'ETH']);

  await page.getByTestId('asset-row-SOL').getByRole('button', { name: /^SOL/ }).click();
  const detail = page.getByTestId('asset-detail');
  await expect(detail.getByRole('heading', { name: /Detail SOL/ })).toBeVisible();
  await expect(detail.getByTestId('chart-table').locator('tbody tr')).toHaveCount(30);
  await detail.getByRole('button', { name: 'Grafik 7 hari' }).click();
  await expect(detail.getByTestId('chart-table').locator('tbody tr')).toHaveCount(7);
  await detail.getByText('Tabel data (7 hari)').click();
  await expect(detail.getByTestId('chart-table').locator('tbody tr').last()).toContainText(/US\$\s?100,00/);
  await expect(detail.getByRole('img')).toHaveAttribute('aria-label', /Harga SOL 7 hari: terendah .* terakhir US\$\s?100,00/);
  await detail.getByRole('button', { name: 'Grafik 30 hari' }).click();
  await expect(detail.getByTestId('chart-table').locator('tbody tr')).toHaveCount(30);

  await page.getByLabel('Cari aset').fill('zzz');
  await expect(page.getByTestId('assets-empty')).toContainText('Tidak ada aset yang cocok.');
  await page.getByRole('button', { name: 'Hapus pencarian dan filter' }).click();
  await expect(rows(page)).toHaveCount(3);
});

test('STK-E03: watchlist bertahan setelah reload, filter, lalu dihapus', async ({ page }) => {
  await gotoReady(page, '/assets');
  await page.getByRole('button', { name: 'Tambah ETH ke watchlist' }).click();
  await expect(page.getByRole('button', { name: 'Hapus ETH dari watchlist' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Hapus ETH dari watchlist' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Hanya watchlist').check();
  expect(await rowOrder(page)).toEqual(['ETH']);

  await page.getByRole('button', { name: 'Hapus ETH dari watchlist' }).click();
  await expect(page.getByTestId('assets-empty')).toContainText('Watchlist masih kosong.');
  await page.getByLabel('Hanya watchlist').uncheck();
  await expect(page.getByRole('button', { name: 'Tambah ETH ke watchlist' })).toHaveAttribute('aria-pressed', 'false');
});
