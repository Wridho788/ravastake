import { expect, test, type Locator, type Page } from '@playwright/test';
import { activateFirstDraft, advanceDays, closeActive, createDraft, gotoReady, nav, positionCard, startAt } from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

function drawer(page: Page): Locator {
  return page.getByRole('dialog', { name: /^Ledger X-ray/ });
}

async function expectSameNumber(trigger: Locator, total: Locator) {
  await expect(total).toHaveAttribute('data-units', (await trigger.getAttribute('data-units')) ?? 'missing');
  await expect(total).toHaveText((await trigger.textContent()) ?? 'missing');
}

test('STK-E22: X-ray saldo tersedia dan principal aktif sama persis dengan angka dashboard', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await nav(page).getByRole('link', { name: 'Dashboard' }).click();

  await page.getByRole('button', { name: 'X-ray saldo tersedia ETH' }).click();
  await expect(drawer(page).getByTestId('xray-entries').locator('tbody tr')).toHaveCount(2);
  await expectSameNumber(page.getByTestId('available-ETH'), drawer(page).getByTestId('xray-total'));
  await expect(drawer(page).getByTestId('xray-total')).toHaveText('1 ETH');
  await drawer(page).getByRole('button', { name: 'Tutup' }).click();
  await expect(drawer(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'X-ray saldo tersedia ETH' })).toBeFocused();

  await page.getByRole('button', { name: 'X-ray principal aktif ETH' }).click();
  await expectSameNumber(page.getByTestId('active-principal-ETH'), drawer(page).getByTestId('xray-total'));
  await expect(drawer(page)).toContainText('tandanya dibalik');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'X-ray principal aktif SOL' }).click();
  await expectSameNumber(page.getByTestId('active-principal-SOL'), drawer(page).getByTestId('xray-total'));
});

test('STK-E22: X-ray detail posisi aktif dan closed; estimasi reward berlabel turunan', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 73, { firstTime: true });

  const active = positionCard(page, 'Aktif').filter({ hasText: 'ETH' });
  await active.getByRole('button', { name: 'X-ray principal posisi ETH' }).click();
  await expectSameNumber(active.getByTestId('principal'), drawer(page).getByTestId('xray-principal'));
  await expect(drawer(page).getByTestId('xray-derived')).toContainText('turunan');
  await expect(drawer(page).getByTestId('xray-derived')).toContainText('0,01');
  await page.keyboard.press('Escape');

  await closeActive(page);
  const closed = positionCard(page, 'Ditutup').filter({ hasText: 'ETH' });
  await closed.getByRole('button', { name: 'X-ray principal posisi ETH' }).click();
  const d = drawer(page);
  await expect(d.getByTestId('xray-entries').locator('tbody tr')).toHaveCount(3);
  await expectSameNumber(closed.getByTestId('principal'), d.getByTestId('xray-principal'));
  await expect(d.getByTestId('xray-returned')).toHaveAttribute('data-units', '100000000');
  await expectSameNumber(closed.getByTestId('reward'), d.getByTestId('xray-reward'));
  await expect(d.getByTestId('xray-derived')).toHaveCount(0);
});
