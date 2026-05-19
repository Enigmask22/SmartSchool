/**
 * E2E Test Suite: TS-SUB02EXT-10 - Score File Import Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Subject teacher selects a class and the file import button is visible.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-SUB02EXT-10: Score File Import E2E', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });

    await page.locator('input[name="username"]').fill(TEST_USER.subject.username);
    await page.locator('input[name="password"]').fill(TEST_USER.subject.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForFunction(() => !!localStorage.getItem('access_token'), { timeout: TEST_TIMEOUTS.LONG });

    const hasToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(hasToken).toBeTruthy();

    await page.goto('/subject/scores');
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-SUB02EXT-10: Subject teacher can access file import', async ({ page }) => {
    // Verify class selector is shown
    await expect(
      page.locator('text=Chọn lớp - môn học').first()
    ).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Click the first class card
    const firstCard = page.locator('.cursor-pointer').first();
    await firstCard.click();

    // Verify "Nhap diem tu file" button is visible after class selection
    await expect(
      page.locator('text=Nhập điểm từ file').first()
    ).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});