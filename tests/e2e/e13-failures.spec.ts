import { expect, test } from '@playwright/test';
import {
  activateDialog,
  activateFirstDraft,
  advanceDays,
  closeDialog,
  createDraft,
  failNextWrite,
  gotoReady,
  positionCard,
  startAt,
  storeCounts,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

test('STK-E13: fault saat aktivasi dibatalkan utuh, error terlihat, retry menghasilkan satu aktivasi', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  const before = await storeCounts(page);

  await failNextWrite(page, 'activity');
  await positionCard(page, 'Draft').getByRole('button', { name: 'Aktifkan' }).click();
  const dialog = activateDialog(page);
  await dialog.getByRole('button', { name: 'Konfirmasi aktivasi' }).click();
  await expect(dialog.getByTestId('dialog-error')).toContainText('Penulisan ke activity gagal');
  expect(await storeCounts(page)).toEqual(before);
  await expect(page.getByTestId('notice')).not.toContainText('Posisi ETH aktif');

  // Retry in the same dialog reuses the operation ID: exactly one activation.
  await dialog.getByRole('button', { name: 'Konfirmasi aktivasi' }).click();
  await expect(dialog).toBeHidden();
  expect(await storeCounts(page)).toEqual({ ledger: before.ledger + 1, activity: before.activity + 1, operations: before.operations + 1 });
});

test('STK-E13: fault ledger saat tutup tidak meninggalkan credit parsial', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 73, { firstTime: true });
  const before = await storeCounts(page);

  await failNextWrite(page, 'ledger');
  const card = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await card.getByRole('button', { name: 'Tutup posisi' }).click();
  const dialog = closeDialog(page);
  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog.getByTestId('dialog-error')).toContainText('Penulisan ke ledger gagal');
  expect(await storeCounts(page)).toEqual(before);
  await expect(card.getByTestId('reward')).toHaveText('0,01 ETH');

  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog).toBeHidden();
  expect((await storeCounts(page)).ledger).toBe(before.ledger + 2);
});

test('STK-E16: kuota penuh saat tutup menampilkan pesan jelas tanpa sukses palsu', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  const before = await storeCounts(page);
  await failNextWrite(page, 'positions', 'QuotaExceededError');
  await positionCard(page, 'Aktif').filter({ hasText: 'ETH' }).getByRole('button', { name: 'Tutup posisi' }).click();
  await closeDialog(page).getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(closeDialog(page).getByTestId('dialog-error')).toContainText('Penyimpanan browser penuh');
  expect(await storeCounts(page)).toEqual(before);
  await expect(positionCard(page, 'Ditutup')).toHaveCount(0);
});

test('STK-E16: schema tak dikenal tidak dihapus otomatis; pemulihan hanya lewat konfirmasi', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  const before = await storeCounts(page);

  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ravastake');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      const get = store.get('meta');
      get.onsuccess = () => store.put({ ...get.result, schemaVersion: 2 });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await page.reload();
  const panel = page.getByRole('alert').filter({ hasText: 'Data demo tidak bisa dimuat' });
  await expect(panel).toContainText('versi yang tidak dikenali');
  await expect(panel).toContainText('unsupported-schema');
  expect(await storeCounts(page)).toEqual(before);

  await panel.getByRole('button', { name: 'Hapus data lokal dan mulai ulang' }).click();
  const confirm = page.getByRole('dialog', { name: 'Hapus data lokal?' });
  await confirm.getByRole('button', { name: 'Batal' }).click();
  expect(await storeCounts(page)).toEqual(before);

  await panel.getByRole('button', { name: 'Hapus data lokal dan mulai ulang' }).click();
  await confirm.getByRole('button', { name: 'Hapus dan mulai ulang' }).click();
  await expect(page.getByTestId('time-badge')).toBeVisible();
  expect(await storeCounts(page)).toEqual({ ledger: 4, activity: 1, operations: 2 });
});

test('STK-E16: versi data lebih baru dari tab lain menutup koneksi dan meminta reload', async ({ page, context }) => {
  await gotoReady(page, '/dashboard');
  const before = await storeCounts(page);

  const other = await context.newPage();
  await other.goto('/favicon.svg');
  await other.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('ravastake', 2);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  });

  await expect(page.getByRole('alert').filter({ hasText: 'Versi data yang lebih baru dibuka di tab lain' })).toBeVisible();
  await page.reload();
  const panel = page.getByRole('alert').filter({ hasText: 'Data demo tidak bisa dimuat' });
  await expect(panel).toContainText('versi RavaStake yang lebih baru');
  // Data was not deleted by the failed open.
  const after = await other.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ravastake');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = await new Promise<number>((resolve) => {
      const req = db.transaction('ledger', 'readonly').objectStore('ledger').count();
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    return count;
  });
  expect(after).toBe(before.ledger);
});
