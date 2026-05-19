/**
 * E2E Test Suite: TS-ADM10-08 - System Settings Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Management page, clicks "Cai dat he thong" tab,
 *   verifies the settings UI loads (academic year, semester fields visible).
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM10-08: System Settings E2E', () => {

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

    await page.goto(ROUTES.ADMIN_MANAGEMENT);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-ADM10-08: Admin can view system settings', async ({ page }) => {
    // Step 1: Click the "Cai dat he thong" tab
    const settingsTab = page.locator('button:has-text("Cài đặt hệ thống")');
    await settingsTab.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.NORMAL });
    await settingsTab.click();

    // Step 2: Wait for settings UI to load
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });

    // Step 3: Verify academic year label is visible
    await expect(page.locator('text=Năm học').first()).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});