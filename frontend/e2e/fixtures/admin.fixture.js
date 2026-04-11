/**
 * Admin Test Fixtures
 * Provides pre-authenticated pages for admin tests
 * 
 * This fixture ALWAYS logs in as an admin
 * and navigates to the admin dashboard, simulating a real user flow
 */
import { test as base, expect } from '@playwright/test';
import { ROUTES, SELECTORS, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

export const test = base.extend({
  /**
   * An authenticated admin page for admin-specific tests
   * Always logs in as: admin.chuyen_le_quy_don.tphcm
   * 
   * Navigation flow:
   * 1. Go to login page
   * 2. Login with admin credentials
   * 3. Admin dashboard loads
   */
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto(ROUTES.LOGIN);
    
    // Wait for login form to be visible
    await page.waitForSelector(SELECTORS.USERNAME_INPUT, {
      timeout: TEST_TIMEOUTS.NORMAL,
    }).catch(() => {
      throw new Error('Could not find login form. Make sure dev server is running on http://localhost:3000');
    });

    // ALWAYS use admin credentials for this fixture
    const username = TEST_USER.admin.username;
    const password = TEST_USER.admin.password;

    // Fill and submit login form using SELECTORS from test-data
    const usernameInput = page.locator(SELECTORS.USERNAME_INPUT);
    const passwordInput = page.locator(SELECTORS.PASSWORD_INPUT);
    // Use simpler selector - find first button[type="submit"]
    const loginButton = page.locator('button[type="submit"]').first();

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();

    // Wait for admin dashboard to load
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });

    // Provide authenticated page to test
    await use(page);
  },
});

export { expect };
