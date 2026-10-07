import { expect, test } from '@playwright/test';
import {
  DAY_MS,
  activateDialog,
  activateFirstDraft,
  advanceDays,
  createDraft,
  gotoReady,
  nav,
  positionCard,
  shiftRealClock,
  startAt,
  storeCounts,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

test('STK-E06: buat, lihat, edit, reload, hapus draft; saldo ETH tetap 2', async ({ page }) => {
  await gotoReady(page, '/positions');
  await page.getByRole('region', { name: 'Buat draft' }).getByLabel('Catatan (opsional, maks. 200 karakter)').fill('catatan awal');
  await createDraft(page, '1', '365');
  const draft = positionCard(page, 'Draft');
  await expect(draft).toHaveCount(1);
  await expect(draft).toContainText('catatan awal');

  await draft.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit draft' });
  await expect(dialog.getByLabel('Jumlah (contoh: 1,5)')).toHaveValue('1');
  await dialog.getByLabel('Jumlah (contoh: 1,5)').fill('1,5');
  await dialog.getByLabel('Durasi (hari, 1–365)').fill('30');
  await dialog.getByLabel('Catatan (opsional, maks. 200 karakter)').fill('diubah');
  await dialog.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(dialog).toBeHidden();
  await expect(draft.getByTestId('principal')).toHaveAttribute('data-units', '150000000');
  await expect(draft).toContainText('30 hari');
  await expect(draft).toContainText('diubah');

  await page.reload();
  await expect(draft.getByTestId('principal')).toHaveText('1,5 ETH');
  await expect(page.locator('.hint .amount')).toHaveAttribute('data-units', '200000000');
  await expect(positionCard(page, 'Aktif')).toHaveCount(1);

  await draft.getByRole('button', { name: 'Hapus' }).click();
  await page.getByRole('dialog', { name: 'Hapus draft?' }).getByRole('button', { name: 'Hapus draft' }).click();
  await expect(page.getByText('Belum ada draft.')).toBeVisible();

  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '200000000');
  await expect(page.getByTestId('active-principal-ETH')).toHaveAttribute('data-units', '0');
});

test('STK-E08: draft 3 ETH ditolak karena saldo kurang; draft tetap dan tidak ada tulisan', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '3', '365');
  const before = await storeCounts(page);
  await positionCard(page, 'Draft').getByRole('button', { name: 'Aktifkan' }).click();
  const dialog = activateDialog(page);
  await expect(dialog).toContainText('Saldo tersedia lebih kecil dari jumlah draft.');
  await dialog.getByRole('button', { name: 'Konfirmasi aktivasi' }).click();
  await expect(dialog.getByTestId('dialog-error')).toContainText('Saldo ETH tidak cukup: tersedia 2, dibutuhkan 3.');
  await dialog.getByRole('button', { name: 'Batal' }).click();
  expect(await storeCounts(page)).toEqual(before);
  await expect(positionCard(page, 'Draft')).toHaveCount(1);
});

test('STK-E09: klik ganda konfirmasi menghasilkan tepat satu aktivasi', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  const before = await storeCounts(page);
  await positionCard(page, 'Draft').getByRole('button', { name: 'Aktifkan' }).click();
  await activateDialog(page).getByRole('button', { name: 'Konfirmasi aktivasi' }).dblclick();
  await expect(activateDialog(page)).toBeHidden();
  await expect(positionCard(page, 'Aktif').filter({ hasText: 'ETH' })).toHaveCount(1);
  expect(await storeCounts(page)).toEqual({
    ledger: before.ledger + 1,
    activity: before.activity + 1,
    operations: before.operations + 1,
  });
  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '100000000');
});

test('STK-E12: reward dibatasi durasi 73 hari setelah maju 100 hari', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '73');
  await activateFirstDraft(page);
  await advanceDays(page, 100, { firstTime: true });
  const card = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await expect(card.getByTestId('elapsed-days')).toHaveText('73 / 73');
  await expect(card.getByTestId('reward')).toHaveText('0,01 ETH');
  await expect(card.getByRole('button', { name: 'Sudah jatuh tempo' })).toBeDisabled();
});

test('STK-E12: jam perangkat mundur memberi elapsed 0 dan timestamp aktivasi tidak mundur', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await shiftRealClock(page, -2 * DAY_MS);
  await activateFirstDraft(page);
  const card = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await expect(card.getByTestId('elapsed-days')).toHaveText('0 / 365');
  await expect(card.getByTestId('reward')).toHaveAttribute('data-units', '0');
  // Activation is stamped at lastCommittedSimMs (1 Okt 2026), not two days earlier.
  await expect(card).toContainText('Aktif sejak1 Okt 2026');
});
