/**
 * Test Fixtures for E2E Tests
 * Provides pre-authenticated pages and common setup
 */
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  /**
   * An authenticated page for testing logged-in user flows
   * 
   * IMPORTANT: Update test credentials below or use environment variables:
   * TEST_USERNAME=admin TEST_PASSWORD=password npm run test:e2e
   */
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[type="text"], input[placeholder*="User"], input[placeholder*="user"]', {
      timeout: 5000,
    }).catch(() => {
      throw new Error('Could not find login form. Make sure dev server is running on http://localhost:3000');
    });

    // Get test credentials from env or use defaults
    const username = process.env.TEST_USERNAME || 'admin';
    const password = process.env.TEST_PASSWORD || 'password';

    // Fill and submit login form
    // ADJUST SELECTORS based on your actual Login.jsx structure
    const usernameInput = page.locator('input[type="text"], input[placeholder*="user"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("login"), button:has-text("Sign In")').first();

    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await loginButton.click();

    // Wait for navigation to dashboard or home
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    } catch {
      // Alternative: wait for a specific element that indicates successful login
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }

    // Provide authenticated page to test
    await use(page);
  },
});

export { expect };
