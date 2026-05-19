/**
 * E2E Test Suite: TS-ADM09-08 - Teacher Management Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Management page, views "Giao vien" tab
 *   (default tab) and verifies teacher list loads with data.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM09-08: Teacher Management E2E', () => {

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

  test('TS-ADM09-08: Admin can view teacher list in Management page', async ({ page }) => {
    // "Giáo viên" is the default first tab - click it to be explicit
    const teacherTab = page.locator('button:has-text("Giáo viên")');
    await teacherTab.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.NORMAL });
    await teacherTab.click();

    // Wait for the teacher table to load
    await page.waitForSelector('table tbody tr', { timeout: TEST_TIMEOUTS.NORMAL });

    // Verify at least one teacher row is present
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});