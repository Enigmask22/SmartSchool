/**
 * E2E Test Suite: TS-SUB01-06 - Subject Dashboard Happy Path
 *
 * Scope: Happy path only (E2E scope rule).
 *   Subject teacher logs in and views the subject dashboard.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-SUB01-06: Subject Dashboard E2E', () => {
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

    await page.goto(ROUTES.SUBJECT_DASHBOARD);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-SUB01-06: Subject teacher can view subject dashboard', async ({ page }) => {
    // Verify the subject dashboard title is visible
    await expect(
      page.locator('text=Thống kê điểm số').first()
    ).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});