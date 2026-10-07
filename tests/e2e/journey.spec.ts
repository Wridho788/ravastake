import { expect, test } from '@playwright/test';
import {
  activateFirstDraft,
  advanceDays,
  createDraft,
  gotoReady,
  nav,
  positionCard,
  startAt,
  storeCounts,
  units,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

test('STK-E07: aktivasi 1 ETH pada T0 memindahkan principal tepat sekali', async ({ page }) => {
  await gotoReady(page, '/positions');
  await expect(page.getByTestId('time-badge')).toContainText('Waktu nyata');
  await createDraft(page, '1', '365');
  // Draft does not reserve balance (oracle 1).
  await expect(page.locator('.hint .amount')).toHaveAttribute('data-units', '200000000');

  const before = await storeCounts(page);
  await activateFirstDraft(page);

  const card = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('APR snapshot5%');
  expect(await units(card.getByTestId('principal'))).toBe('100000000');

  const after = await storeCounts(page);
  expect(after).toEqual({ ledger: before.ledger + 1, activity: before.activity + 1, operations: before.operations + 1 });

  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '100000000');
  await expect(page.getByTestId('active-principal-ETH')).toHaveAttribute('data-units', '100000000');
  await expect(page.getByTestId('available-ETH')).toHaveText('1 ETH');
});

test('STK-E10 + STK-E21: majukan 73 hari lewat UI, batal tidak menulis, tutup memberi saldo 2,01 ETH', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);

  // E21: simulated time moves forward 73 days in one step.
  await advanceDays(page, 73, { firstTime: true });
  await expect(page.getByTestId('time-badge')).toContainText('Waktu simulasi');
  await expect(page.getByTestId('time-badge')).toContainText('(+73 hari)');

  const active = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await expect(active.getByTestId('elapsed-days')).toHaveText('73 / 365');
  await expect(active.getByTestId('reward')).toHaveAttribute('data-units', '1000000');
  await expect(active.getByTestId('reward')).toHaveText('0,01 ETH');

  // Offset survives a reload (E21).
  await page.reload();
  await expect(page.getByTestId('time-badge')).toContainText('(+73 hari)');

  // E10: preview, cancel (no write), then confirm.
  const before = await storeCounts(page);
  await active.getByRole('button', { name: 'Tutup posisi' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tutup posisi simulasi?' });
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '1000000');
  await expect(dialog.getByTestId('close-elapsed')).toHaveText('73 / 365');
  await dialog.getByRole('button', { name: 'Batal' }).click();
  await expect(dialog).toBeHidden();
  expect(await storeCounts(page)).toEqual(before);

  await active.getByRole('button', { name: 'Tutup posisi' }).click();
  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog).toBeHidden();

  const closed = positionCard(page, 'Ditutup').filter({ hasText: 'ETH' });
  await expect(closed.getByTestId('reward')).toHaveAttribute('data-units', '1000000');
  expect(await storeCounts(page)).toEqual({
    ledger: before.ledger + 2,
    activity: before.activity + 1,
    operations: before.operations + 1,
  });

  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '201000000');
  await expect(page.getByTestId('available-ETH')).toHaveText('2,01 ETH');
  await expect(page.getByTestId('active-principal-ETH')).toHaveAttribute('data-units', '0');
  await expect(page.getByTestId('recent-activity')).toContainText('Lompatan waktu +73 hari');
  await expect(page.getByTestId('recent-activity')).toContainText('Penutupan 1 ETH, reward 0,01 ETH');

  // Closed snapshot does not move when time advances again (oracle 4). No confirmation the second time.
  await advanceDays(page, 30, { firstTime: false });
  await expect(page.getByTestId('time-badge')).toContainText('(+103 hari)');
  await nav(page).getByRole('link', { name: 'Posisi' }).click();
  await expect(positionCard(page, 'Ditutup').filter({ hasText: 'ETH' }).getByTestId('reward')).toHaveAttribute('data-units', '1000000');
});

test('STK-E21a: "Lompat ke jatuh tempo" mengisi input N lalu tombol menjadi "Sudah jatuh tempo"', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '73');
  await activateFirstDraft(page);

  const active = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await active.getByRole('button', { name: 'Lompat ke jatuh tempo' }).click();
  await expect(page.getByLabel('Majukan N hari')).toHaveValue('73');
  await expect(page.getByRole('button', { name: 'Majukan', exact: true })).toBeFocused();

  await page.getByRole('button', { name: 'Majukan', exact: true }).click();
  await page.getByRole('dialog', { name: 'Majukan waktu simulasi?' }).getByRole('button', { name: 'Ya, majukan 73 hari' }).click();

  await expect(active.getByTestId('elapsed-days')).toHaveText('73 / 73');
  await expect(active.getByRole('button', { name: 'Sudah jatuh tempo' })).toBeDisabled();
  await expect(active.getByTestId('reward')).toHaveText('0,01 ETH');
});

test('validasi draft per field tanpa tulisan (sebagian STK-E05)', async ({ page }) => {
  await gotoReady(page, '/positions');
  const before = await storeCounts(page);
  await page.getByLabel('Jumlah (contoh: 1,5)').fill('1e3');
  await page.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(page.getByText('Notasi ilmiah tidak didukung.')).toBeVisible();
  await expect(page.getByLabel('Jumlah (contoh: 1,5)')).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Jumlah (contoh: 1,5)').fill('1');
  await page.getByLabel('Durasi (hari, 1–365)').fill('366');
  await page.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(page.getByText('Rentang 1–365 hari.')).toBeVisible();
  expect(await storeCounts(page)).toEqual(before);
  await expect(page.getByText('Belum ada draft.')).toBeVisible();
});

test('direct route dan halaman 404 (sebagian STK-E20)', async ({ page }) => {
  await gotoReady(page, '/positions');
  await expect(page.getByRole('heading', { name: 'Posisi staking simulasi' })).toBeVisible();
  await page.goto('/tidak-ada');
  await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  await page.getByRole('link', { name: 'Kembali ke dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
});
