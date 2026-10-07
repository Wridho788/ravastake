import { expect, test } from '@playwright/test';
import { createDraft, gotoReady, startAt, storeCounts } from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

test('STK-E04: kalkulator 1 ETH 5% 73 lalu 365 hari, lalu APR 0; tidak menulis apa pun', async ({ page }) => {
  await gotoReady(page, '/calculator');
  const before = await storeCounts(page);
  const reward = page.getByTestId('calc-reward');

  await page.getByLabel('Aset').selectOption('ETH');
  await page.getByLabel('Principal (contoh: 1,5)').fill('1');
  await page.getByLabel('APR simulasi (%)').fill('5');
  await page.getByLabel('Hari (1–365)').fill('73');
  await expect(reward).toHaveAttribute('data-units', '1000000');
  await expect(reward).toHaveText('0,01 ETH');
  await expect(page.getByLabel('Hari (slider)')).toHaveValue('73');

  await page.getByLabel('Hari (slider)').fill('365');
  await expect(page.getByLabel('Hari (1–365)')).toHaveValue('365');
  await expect(reward).toHaveText('0,05 ETH');

  await page.getByLabel('APR simulasi (%)').fill('0');
  await expect(reward).toHaveAttribute('data-units', '0');
  await expect(reward).toHaveText('0 ETH');

  expect(await storeCounts(page)).toEqual(before);
});

test('STK-E05: input tidak valid menampilkan error per field tanpa pembulatan diam-diam atau tulisan', async ({ page }) => {
  await gotoReady(page, '/calculator');
  const before = await storeCounts(page);
  const principal = page.getByLabel('Principal (contoh: 1,5)');
  const apr = page.getByLabel('APR simulasi (%)');
  const days = page.getByLabel('Hari (1–365)');

  for (const [value, message] of [
    ['-1', 'tanpa tanda plus atau minus'],
    ['0', 'Jumlah harus lebih dari 0.'],
    ['1,123456789', 'Maksimal 8 angka di belakang koma.'],
    ['1e3', 'Notasi ilmiah tidak didukung.'],
  ] as const) {
    await principal.fill(value);
    await expect(page.getByText(message)).toBeVisible();
    await expect(principal).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('calc-invalid')).toBeVisible();
  }
  await principal.fill('1');

  await apr.fill('100,01');
  await expect(page.getByText('APR maksimal 100%.')).toBeVisible();
  await apr.fill('0');
  await expect(page.getByTestId('calc-reward')).toHaveText('0 ETH');

  for (const value of ['0', '366']) {
    await days.fill(value);
    await expect(page.getByText('Rentang 1–365 hari.')).toBeVisible();
  }

  // The draft form applies the same rules and does not write on rejection.
  await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Posisi' }).click();
  const form = page.getByRole('region', { name: 'Buat draft' });
  await form.getByLabel('Jumlah (contoh: 1,5)').fill('-1');
  await form.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(form.getByText('tanpa tanda plus atau minus')).toBeVisible();
  await form.getByLabel('Jumlah (contoh: 1,5)').fill('0,123456789');
  await form.getByRole('button', { name: 'Simpan draft' }).click();
  await expect(form.getByText('Maksimal 8 angka di belakang koma.')).toBeVisible();
  expect(await storeCounts(page)).toEqual(before);

  // A valid value with a comma decimal is accepted as written.
  await createDraft(page, '0,12345678', '30');
  await expect(page.getByRole('region', { name: /^Draft/ }).getByTestId('principal')).toHaveAttribute('data-units', '12345678');
});
