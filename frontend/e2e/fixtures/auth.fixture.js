/**
 * Test Fixtures for E2E Tests
 * Provides pre-authenticated pages and common setup
 */
import { test as base, expect } from '@playwright/test';
import { ROUTES, SELECTORS, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

export const test = base.extend({
  /**
   * An authenticated page for testing logged-in user flows
   * 
   * IMPORTANT: Update test credentials below or use environment variables:
   * TEST_USERNAME=admin TEST_PASSWORD=password npm run test:e2e
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

    // Get test credentials from TEST_USER constant (properly formatted usernames)
    const username = TEST_USER.admin.username;
    const password = TEST_USER.admin.password;

    // Fill and submit login form using SELECTORS from test-data
    const usernameInput = page.locator(SELECTORS.USERNAME_INPUT);
    const passwordInput = page.locator(SELECTORS.PASSWORD_INPUT);
    const loginButton = page.locator(SELECTORS.LOGIN_BUTTON);

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();

    // Wait for navigation to dashboard or home
    try {
      await page.waitForURL('**/dashboard', { timeout: TEST_TIMEOUTS.LONG });
    } catch {
      // Alternative: wait for a specific element that indicates successful login
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    }

    // Provide authenticated page to test
    await use(page);
  },
});

export { expect };
