import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

/**
 * Test Suite: TS-ADM04-06 - E2E Kill-Switch UI Flow
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to the Continuous Recognition page and verifies
 *   that the kill-switch UI renders correctly with the initial "Đã dừng"
 *   state and the "Bắt đầu nhận diện" control button visible.
 *
 * Error cases covered by backend pytest and vitest unit tests
 * per E2E scope rule.
 *
 * Framework: Playwright
 */

const RECOGNITION_ROUTE = '/admin/continuous';

test.describe('TS-ADM04-06: E2E Kill-Switch UI Flow', () => {

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

    await page.goto(RECOGNITION_ROUTE);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-ADM04-06: Kill-switch page loads with correct initial stopped state', async ({ page }) => {
    // Step 1: Verify page title
    await expect(page.locator('text=Quản lý điểm danh tự động')).toBeVisible({
      timeout: TEST_TIMEOUTS.NORMAL,
    });

    // Step 2: Verify initial status badge shows stopped state
    const stoppedBadge = page.locator('text=Đã dừng');
    await expect(stoppedBadge).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 3: Verify kill-switch control button is present
    const startButton = page.locator('button:has-text("Bắt đầu nhận diện")');
    await expect(startButton).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});
