import { expect, test, type Page } from '@playwright/test';
import {
  DAY_MS,
  activateDialog,
  activateFirstDraft,
  advanceDays,
  closeDialog,
  createDraft,
  gotoReady,
  ledgerKinds,
  nav,
  positionCard,
  shiftRealClock,
  startAt,
  storeCounts,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

async function secondTab(page: Page, path: string): Promise<Page> {
  const other = await page.context().newPage();
  await gotoReady(other, path);
  return other;
}

test('STK-E14: dua tab mengaktifkan dua draft 1,5 ETH bersamaan: tepat satu sukses, saldo 0,5', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1,5', '365');
  await createDraft(page, '1,5', '30');
  const tab2 = await secondTab(page, '/positions');
  await expect(positionCard(tab2, 'Draft')).toHaveCount(2);

  await positionCard(page, 'Draft').nth(0).getByRole('button', { name: 'Aktifkan' }).click();
  await positionCard(tab2, 'Draft').nth(1).getByRole('button', { name: 'Aktifkan' }).click();
  await Promise.all([
    activateDialog(page).getByRole('button', { name: 'Konfirmasi aktivasi' }).click(),
    activateDialog(tab2).getByRole('button', { name: 'Konfirmasi aktivasi' }).click(),
  ]);

  const errors = [activateDialog(page).getByTestId('dialog-error'), activateDialog(tab2).getByTestId('dialog-error')];
  await expect.poll(async () => (await Promise.all(errors.map((e) => e.count()))).reduce((a, b) => a + b, 0)).toBe(1);
  const failed = (await errors[0]!.count()) > 0 ? errors[0]! : errors[1]!;
  await expect(failed).toContainText('Saldo ETH tidak cukup');

  expect(await ledgerKinds(page, 'ETH')).toEqual(['seed', 'reserve']);
  await page.keyboard.press('Escape');
  await nav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByTestId('available-ETH')).toHaveAttribute('data-units', '50000000');
});

test('STK-E11: posisi yang sudah ditutup tidak bisa ditutup lagi dari tab lama; snapshot tetap', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 73, { firstTime: true });

  const tab2 = await secondTab(page, '/positions');
  await positionCard(tab2, 'Aktif').filter({ hasText: 'ETH' }).getByRole('button', { name: 'Tutup posisi' }).click();
  await expect(closeDialog(tab2).getByTestId('close-reward')).toHaveText('0,01 ETH');

  await positionCard(page, 'Aktif').filter({ hasText: 'ETH' }).getByRole('button', { name: 'Tutup posisi' }).click();
  await closeDialog(page).getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(closeDialog(page)).toBeHidden();
  const afterFirst = await storeCounts(page);

  // The stale tab learns about the close and cannot credit again.
  await expect(closeDialog(tab2)).toContainText('Posisi ini sudah ditutup.');
  await expect(closeDialog(tab2).getByRole('button', { name: 'Konfirmasi tutup' })).toBeDisabled();
  expect(await storeCounts(tab2)).toEqual(afterFirst);

  await advanceDays(page, 30, { firstTime: false });
  await expect(positionCard(page, 'Ditutup').filter({ hasText: 'ETH' }).getByTestId('reward')).toHaveText('0,01 ETH');
  expect(await ledgerKinds(page, 'ETH')).toEqual(['seed', 'reserve', 'return', 'reward']);
});

test('STK-E21b: dua tab memajukan +30 dari offset yang sama menghasilkan satu lompatan', async ({ page }) => {
  await gotoReady(page, '/dashboard');
  // Acknowledge the first-time dialog so both tabs advance directly.
  await advanceDays(page, 1, { firstTime: true });
  const tab2 = await secondTab(page, '/dashboard');
  await expect(tab2.getByTestId('time-badge')).toContainText('(+1 hari)');

  const clickPlus30 = () => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent === '+30 hari');
    button?.click();
  };
  await Promise.all([page.evaluate(clickPlus30), tab2.evaluate(clickPlus30)]);

  await expect(page.getByTestId('time-badge')).toContainText('(+31 hari)');
  await expect(tab2.getByTestId('time-badge')).toContainText('(+31 hari)');
  const staleMessage = 'Waktu simulasi berubah di tab lain';
  const shown = (await page.getByRole('alert').filter({ hasText: staleMessage }).count()) + (await tab2.getByRole('alert').filter({ hasText: staleMessage }).count());
  expect(shown).toBe(1);
});

test('STK-E21c: dialog tutup di tab lain menolak commit setelah waktu maju, lalu menampilkan nilai baru', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  const tab2 = await secondTab(page, '/positions');
  await positionCard(tab2, 'Aktif').filter({ hasText: 'ETH' }).getByRole('button', { name: 'Tutup posisi' }).click();
  const dialog = closeDialog(tab2);
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '0');

  await advanceDays(page, 30, { firstTime: true });
  await expect(tab2.getByTestId('time-badge')).toContainText('(+30 hari)');
  // The dialog keeps the values the user is looking at until a confirm attempt.
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '0');

  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog.getByTestId('dialog-error')).toContainText('Waktu simulasi berubah');
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '410958');
  expect(await ledgerKinds(tab2, 'ETH')).toEqual(['seed', 'reserve']);

  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog).toBeHidden();
  expect(await ledgerKinds(tab2, 'ETH')).toEqual(['seed', 'reserve', 'return', 'reward']);
});

test('STK-E21d: batas hari terlewati saat dialog tutup terbuka (hanya build e2e)', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 10, { firstTime: true });

  await positionCard(page, 'Aktif').filter({ hasText: 'ETH' }).getByRole('button', { name: 'Tutup posisi' }).click();
  const dialog = closeDialog(page);
  await expect(dialog.getByTestId('close-elapsed')).toHaveText('10 / 365');
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '136986');

  await shiftRealClock(page, DAY_MS);
  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog.getByTestId('dialog-error')).toContainText('batas hari terlewati');
  await expect(dialog.getByTestId('close-elapsed')).toHaveText('11 / 365');
  await expect(dialog.getByTestId('close-reward')).toHaveAttribute('data-units', '150684');

  await dialog.getByRole('button', { name: 'Konfirmasi tutup' }).click();
  await expect(dialog).toBeHidden();
  await expect(positionCard(page, 'Ditutup').filter({ hasText: 'ETH' }).getByTestId('reward')).toHaveAttribute('data-units', '150684');
});

test('STK-E23: "Buka di tab kedua" membuka draft yang sama; hanya satu aktivasi', async ({ page, context }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  const before = await storeCounts(page);
  await positionCard(page, 'Draft').getByRole('button', { name: 'Aktifkan' }).click();

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    activateDialog(page).getByRole('link', { name: 'Buka di tab kedua' }).click(),
  ]);
  await expect(activateDialog(popup)).toBeVisible();
  await expect(activateDialog(popup).getByTestId('activate-principal')).toHaveText('1 ETH');

  await activateDialog(page).getByRole('button', { name: 'Konfirmasi aktivasi' }).click();
  await expect(activateDialog(page)).toBeHidden();

  await expect(activateDialog(popup).getByText('Draft ini sudah diaktifkan di tab lain.')).toBeVisible();
  await expect(activateDialog(popup).getByRole('button', { name: 'Konfirmasi aktivasi' })).toBeDisabled();
  expect(await storeCounts(popup)).toEqual({ ledger: before.ledger + 1, activity: before.activity + 1, operations: before.operations + 1 });
});
