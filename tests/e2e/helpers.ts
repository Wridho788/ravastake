import { expect, type Locator, type Page } from '@playwright/test';

/** Fixture reference time from DATA_MODEL: 2026-10-01T00:00:00Z. */
export const T0 = Date.UTC(2026, 9, 1);
export const DAY_MS = 86_400_000;

/** Pins the app's real clock to `nowMs` before the app boots and seeds the database (e2e build only). */
export async function startAt(page: Page, nowMs = T0): Promise<void> {
  await page.addInitScript((ms) => {
    window.__ravastakeTestConfig = { nowMs: ms };
  }, nowMs);
}

export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByTestId('time-badge')).toBeVisible();
}

export function nav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navigasi utama' });
}

export function positionCard(page: Page, section: 'Draft' | 'Aktif' | 'Ditutup'): Locator {
  return page.getByRole('region', { name: new RegExp(`^${section}`) }).locator('[data-testid^="position-"]');
}

export async function createDraft(page: Page, amount: string, days: string, asset = 'ETH'): Promise<void> {
  await page.getByLabel('Aset').selectOption(asset);
  await page.getByLabel('Jumlah (contoh: 1,5)').fill(amount);
  await page.getByLabel('Durasi (hari, 1–365)').fill(days);
  await page.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(page.getByTestId('notice')).toContainText('Draft disimpan');
}

export async function activateFirstDraft(page: Page): Promise<void> {
  await positionCard(page, 'Draft').first().getByRole('button', { name: 'Aktifkan' }).click();
  const dialog = page.getByRole('dialog', { name: 'Aktifkan staking simulasi?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Konfirmasi aktivasi' }).click();
  await expect(dialog).toBeHidden();
}

/**
 * Advances simulated time through the "Majukan N hari" form. The first advance per database
 * shows an explanation dialog that must be confirmed (DESIGN_SPEC "Konfirmasi pertama").
 */
export async function advanceDays(page: Page, days: number, { firstTime }: { firstTime: boolean }): Promise<void> {
  const badge = page.getByTestId('time-badge');
  const before = (await badge.textContent()) ?? '';
  await page.getByLabel('Majukan N hari').fill(String(days));
  await page.getByRole('button', { name: 'Majukan', exact: true }).click();
  if (firstTime) {
    const confirm = page.getByRole('dialog', { name: 'Majukan waktu simulasi?' });
    await confirm.getByRole('button', { name: `Ya, majukan ${days} hari` }).click();
    await expect(confirm).toBeHidden();
  }
  await expect(badge).not.toHaveText(before);
}

export async function units(locator: Locator): Promise<string | null> {
  return locator.getAttribute('data-units');
}

/** Reads raw object stores straight from IndexedDB to verify what was (not) written. */
export async function storeCounts(page: Page): Promise<{ ledger: number; activity: number; operations: number }> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ravastake');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = (store: string) =>
      new Promise<number>((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    const result = { ledger: await count('ledger'), activity: await count('activity'), operations: await count('operations') };
    db.close();
    return result;
  });
}
