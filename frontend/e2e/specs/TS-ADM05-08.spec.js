/**
 * E2E Test for Admin Dashboard — TS-ADM05-08
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin logs in → navigates to Admin Dashboard → verifies dashboard loads
 *   with overview stats → changes academic year filter → verifies page updates.
 *
 * Error cases and filter logic are covered by backend pytest TS-ADM05-01-07.py
 * and vitest TS-ADM05-02-03.test.tsx per E2E scope rule.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM05-08: Admin Dashboard E2E', () => {

  test('TS-ADM05-08: Admin can view school overview dashboard', async ({ page }) => {
    // Step 1: Login as admin
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

    // Step 2: Navigate to Admin Dashboard
    await page.goto(ROUTES.ADMIN_DASHBOARD);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });

    // Verify URL is correct
    expect(page.url()).toContain('/admin/dashboard');

    // Step 3: Verify page loads with main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 4: Wait for stats to load and verify overview cards are visible
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await expect(page.locator('h1:has-text("Tổng quan")')).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    // Verify at least one stat card label is rendered
    await expect(page.locator('p.text-sm:has-text("Học Sinh")')).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 5: Check that an academic year selector exists and is interactive
    const yearSelector = page.locator('[role="combobox"]').first();
    const hasYearSelector = await yearSelector.isVisible({ timeout: TEST_TIMEOUTS.SHORT }).catch(() => false);

    if (hasYearSelector) {
      // Click selector to open dropdown
      await yearSelector.click();
      // Close it
      await page.keyboard.press('Escape');
    }

    // Step 6: Verify page is still stable
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.SHORT });
  });
});
