/**
 * Test Suite: TS-GEN02-01 — Logout Happy Path E2E (Playwright)
 * =============================================================
 *
 * Use Case: UC-GEN-02 — Đăng xuất khỏi hệ thống
 *
 * Rule: E2E covers happy path only — replaces manual hand-click verification.
 * Other layers:
 *   - Stateless JWT architecture: documented in plan.md (no server-side blacklist)
 *   - ProtectedRoute redirect: handled by React component logic (not E2E)
 *   - Token cleared on logout: asserted here as part of the happy path
 *
 * Logout flow (2-step confirmation):
 *   1. Click "Đăng xuất" button in Sidebar → opens confirmation Dialog
 *   2. Click "Đăng xuất" (destructive) inside Dialog → executes logout
 *
 * Credentials: nguyen_thi_lan / password (homeroom teacher, seeded in DB)
 */

import { test, expect } from '@playwright/test';

const SELECTORS = {
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  SUBMIT_BUTTON:  'button[type="submit"]',
  // Sidebar logout trigger — first button containing the text "Đăng xuất"
  SIDEBAR_LOGOUT:  'button:has-text("Đăng xuất")',
  // Confirmation dialog confirm button (destructive — second button with that text, inside dialog)
  CONFIRM_LOGOUT:  '[role="dialog"] button:has-text("Đăng xuất")',
};

test.describe('TS-GEN02 — Logout Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Use admin account — redirects directly to /admin/dashboard which renders the Sidebar
    // (nguyen_thi_lan has 2 roles → goes to /select-dashboard which has no Sidebar)
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.USERNAME_INPUT, { timeout: 10000 });
    await page.fill(SELECTORS.USERNAME_INPUT, 'admin');
    await page.fill(SELECTORS.PASSWORD_INPUT, 'password');
    await page.click(SELECTORS.SUBMIT_BUTTON);
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
  });

  /**
   * GEN02-01: User logs out successfully
   * Expected: tokens cleared from localStorage, redirected to /login
   */
  test('GEN02-01: logout → tokens cleared → redirected to /login', async ({ page }) => {
    // Step 1: open confirmation dialog via sidebar button
    await page.click(SELECTORS.SIDEBAR_LOGOUT);

    // Step 2: confirm logout in dialog
    await page.waitForSelector(SELECTORS.CONFIRM_LOGOUT, { timeout: 5000 });
    await page.click(SELECTORS.CONFIRM_LOGOUT);

    // Should redirect back to login page
    await page.waitForURL('**/login', { timeout: 10000 });

    // Both tokens must be gone from localStorage
    const accessToken  = await page.evaluate(() => localStorage.getItem('access_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
