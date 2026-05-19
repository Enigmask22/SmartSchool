/**
 * E2E Test Suite: TS-ADM07-08 - Class Management Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Class Management page and verifies classes load.
 *
 * Error cases covered by backend pytest and vitest unit tests
 * per E2E scope rule.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM07-08: Class Management E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });

    await page.locator('input[name="username"]').fill(TEST_USER.admin.username);
    await page.locator('input[name="password"]').fill(TEST_USER.admin.password);
    await page.locator('button[type="submit"]').click();

    try {
      await page.waitForURL('**/admin/**', { timeout: TEST_TIMEOUTS.LONG });
    } catch {
      await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
    }

    const hasToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(hasToken).toBeTruthy();

    await page.goto(ROUTES.CLASS_MANAGEMENT);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-ADM07-08: Admin can view class management page with classes', async ({ page }) => {
    // Verify the ClassManagementSelector header is visible
    await expect(page.locator('text=Danh sách lớp học')).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Verify at least one class card is visible (cards with cursor-pointer = clickable class items)
    const classCards = page.locator('[class*="cursor-pointer"]');
    const count = await classCards.count();
    expect(count).toBeGreaterThan(0);
  });
});