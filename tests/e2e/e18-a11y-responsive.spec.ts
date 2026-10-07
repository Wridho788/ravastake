import { expect, test, type Page } from '@playwright/test';
import {
  activateDialog,
  activateFirstDraft,
  advanceDays,
  closeActive,
  createDraft,
  gotoReady,
  nav,
  positionCard,
  startAt,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startAt(page);
});

const ROUTES = ['/dashboard', '/assets', '/calculator', '/positions', '/activity', '/settings'];

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test('STK-E18: filter aktivitas benar, riwayat tidak bisa diedit, tautan ke posisi', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 73, { firstTime: true });
  await closeActive(page);

  await nav(page).getByRole('link', { name: 'Aktivitas' }).click();
  const list = page.getByTestId('activity-list');
  await expect(list.locator('li')).toHaveCount(4);
  await page.getByRole('radio', { name: 'Aktivasi' }).check();
  await expect(list.locator('li')).toHaveCount(2);
  await expect(list.locator('li[data-kind="activate"]')).toHaveCount(2);
  await page.getByRole('radio', { name: 'Penutupan' }).check();
  await expect(list.locator('li')).toHaveCount(1);
  await expect(list).toContainText('Penutupan 1 ETH, reward 0,01 ETH');
  await page.getByRole('radio', { name: 'Lompatan waktu' }).check();
  await expect(list).toContainText('Lompatan waktu +73 hari');
  // History is read-only: no edit or delete controls.
  await expect(list.getByRole('button')).toHaveCount(0);

  // Time advances have no position; switch back to all events to follow a position link.
  await page.getByRole('radio', { name: 'Semua' }).check();
  await list.getByRole('link', { name: 'Lihat posisi' }).first().click();
  await expect(page).toHaveURL(/\/positions#position-/);
  await expect(page.locator('li[id^="position-"]:focus')).toHaveCount(1);
});

test('STK-E18: dialog bisa dipakai dengan keyboard; Escape membatalkan dan fokus kembali; slider bisa dioperasikan', async ({ page }) => {
  await gotoReady(page, '/positions');
  await createDraft(page, '1', '365');
  const trigger = positionCard(page, 'Draft').getByRole('button', { name: 'Aktifkan' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = activateDialog(page);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(positionCard(page, 'Draft')).toHaveCount(1);

  await nav(page).getByRole('link', { name: 'Kalkulator' }).click();
  const slider = page.getByLabel('Hari (slider)');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByLabel('Hari (1–365)')).toHaveValue('364');
  await page.keyboard.press('Home');
  await expect(page.getByLabel('Hari (1–365)')).toHaveValue('1');
  await page.keyboard.press('End');
  await expect(page.getByLabel('Hari (1–365)')).toHaveValue('365');
});

test('STK-E19: semua route tanpa overflow di 1440, 768, 720 (≈ zoom 200%), dan 360', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 768, 720, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await gotoReady(page, route);
      expect(await hasHorizontalOverflow(page), `${route} @ ${width}px`).toBe(false);
    }
  }
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  // Charts carry a text alternative.
  await gotoReady(page, '/assets');
  await expect(page.getByTestId('asset-detail').getByRole('img')).toHaveAttribute('aria-label', /terendah .* tertinggi/);
});

test('STK-E19: alur draft → aktif → tutup di layar 360px lewat menu ponsel', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await gotoReady(page, '/dashboard');
  await expect(nav(page).getByRole('link', { name: 'Posisi' })).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await nav(page).getByRole('link', { name: 'Posisi' }).click();
  await expect(page.getByRole('heading', { name: 'Posisi staking simulasi' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Posisi' })).toBeHidden();

  await createDraft(page, '1', '365');
  await activateFirstDraft(page);
  await advanceDays(page, 73, { firstTime: true });
  await closeActive(page);
  await expect(positionCard(page, 'Ditutup').filter({ hasText: 'ETH' }).getByTestId('reward')).toHaveText('0,01 ETH');
  expect(await hasHorizontalOverflow(page)).toBe(false);

  const box = await page.getByRole('button', { name: 'Majukan', exact: true }).boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});
