/**
 * E2E Test Suite: TS-HOM02-08 - Attendance Management Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Homeroom teacher logs in and views the attendance page.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-HOM02-08: Attendance Management E2E', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });

    await page.locator('input[name="username"]').fill(TEST_USER.homeroom.username);
    await page.locator('input[name="password"]').fill(TEST_USER.homeroom.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForFunction(() => !!localStorage.getItem('access_token'), { timeout: TEST_TIMEOUTS.LONG });

    const hasToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(hasToken).toBeTruthy();

    await page.goto('/homeroom/attendance');
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-HOM02-08: Homeroom teacher can view attendance page', async ({ page }) => {
    // Verify the attendance page title is visible
    await expect(
      page.locator('text=Điểm danh lớp học').first()
    ).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});