/**
 * Homeroom Teacher Test Fixtures
 * Provides pre-authenticated pages for homeroom teacher tests
 * 
 * This fixture ALWAYS logs in as a homeroom teacher (nguyen_thi_lan account)
 * and navigates to the homeroom dashboard, simulating a real user flow
 */
import { test as base, expect } from '@playwright/test';
import { ROUTES, SELECTORS, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

export const test = base.extend({
  /**
   * An authenticated homeroom teacher page for homeroom-specific tests
   * Always logs in as: nguyen_thi_lan.chuyen_le_quy_don.tphcm
   * 
   * Navigation flow:
   * 1. Go to login page
   * 2. Login with homeroom credentials
   * 3. DashboardSelector page appears
   * 4. Click "Dashboard Chủ Nhiệm" (Homeroom Dashboard)
   * 5. Homeroom dashboard loads with sidebar
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

    // ALWAYS use homeroom teacher credentials for this fixture
    const username = TEST_USER.homeroom.username;
    const password = TEST_USER.homeroom.password;

    // Fill and submit login form using SELECTORS from test-data
    const usernameInput = page.locator(SELECTORS.USERNAME_INPUT);
    const passwordInput = page.locator(SELECTORS.PASSWORD_INPUT);
    // Use simpler selector - find first button[type="submit"]
    const loginButton = page.locator('button[type="submit"]').first();

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();

    // Wait for DashboardSelector page to load
    // The page shows "Chọn Dashboard" with two buttons:
    // - "Dashboard Chủ Nhiệm" (Homeroom Dashboard) - blue button
    // - "Dashboard Bộ Môn" (Subject Dashboard) - purple button
    try {
      await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
      
      // Click "Dashboard Chủ Nhiệm" button to go to homeroom dashboard
      // Look for the button with text containing "Chọn Dashboard" or "Chủ Nhiệm"
      const homeroomDashboardButton = page.locator('button, a', { 
        has: page.locator('text=Chủ Nhiệm') 
      }).first();
      
      await homeroomDashboardButton.click();
    } catch (error) {
      // Alternative: try clicking by role and name
      const selectDashboardButton = page.locator('button:has-text("Chọn Dashboard Chủ Nhiệm")');
      if (await selectDashboardButton.isVisible()) {
        await selectDashboardButton.click();
      } else {
        // If that doesn't work, try navigating directly to homeroom dashboard
        await page.goto(ROUTES.HOMEROOM_DASHBOARD);
      }
    }

    // Wait for homeroom dashboard to load and sidebar to be visible
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });

    // Provide authenticated page to test
    await use(page);
  },
});

export { expect };
