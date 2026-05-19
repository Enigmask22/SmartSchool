/**
 * E2E Test Suite: TS-HOM03-10 - Student Management Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Homeroom teacher logs in and views the student list page.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-HOM03-10: Student Management E2E', () => {
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

    await page.goto(ROUTES.HOMEROOM_STUDENTS);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-HOM03-10: Homeroom teacher can view student list', async ({ page }) => {
    // Verify the student list page title is visible
    await expect(
      page.locator('text=Danh sách học sinh').first()
    ).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});