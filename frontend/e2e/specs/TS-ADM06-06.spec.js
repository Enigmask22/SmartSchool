/**
 * E2E Test Suite: TS-ADM06-06 - Subject Management Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Management -> Mon hoc tab -> verifies subjects
 *   list loads with data.
 *
 * Error cases covered by backend pytest and vitest unit tests
 * per E2E scope rule.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM06-06: Subject Management E2E', () => {

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

  test('TS-ADM06-06: Admin can view subjects list in Management page', async ({ page }) => {
    // Step 1: Click the "Môn học" tab
    const subjectsTab = page.locator('button:has-text("Môn học")');
    await subjectsTab.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.NORMAL });
    await subjectsTab.click();

    // Step 2: Wait for the subjects table to load
    await page.waitForSelector('table tbody tr', { timeout: TEST_TIMEOUTS.NORMAL });

    // Step 3: Verify at least one subject row is present
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});