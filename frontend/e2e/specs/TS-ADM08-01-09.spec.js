/**
 * E2E Test Suite: TS-ADM08-01-09 - Class-Subject Teacher Assignment Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Management page, clicks "Phan cong giang day" tab,
 *   verifies the assignment list loads with data.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM08-01-09: Class-Subject Teacher Assignment E2E', () => {

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

  test('TS-ADM08-01: Admin can view class-subject assignment list', async ({ page }) => {
    // Step 1: Click the assignment tab
    const assignmentTab = page.locator('button:has-text("Phân công giảng dạy")');
    await assignmentTab.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.NORMAL });
    await assignmentTab.click();

    // Step 2: Wait for the assignment table to load
    await page.waitForSelector('table tbody tr', { timeout: TEST_TIMEOUTS.NORMAL });

    // Step 3: Verify at least one assignment row is present
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});