/**
 * Test Suite: TS-GEN01-01-04 — Login Happy Path E2E Tests (Playwright)
 * =====================================================================
 *
 * Use Case: UC-GEN-01 — Đăng nhập vào hệ thống
 *
 * Rule: E2E covers happy path only — purpose is to replace manual hand-click
 * verification of the core login flow, not to duplicate backend/unit test coverage.
 *
 * Scenarios covered:
 *   GEN01-01: Teacher logs in with valid credentials → redirected to /select-dashboard
 *   GEN01-04: Admin logs in with valid credentials → redirected to /admin/dashboard
 *
 * Scenarios NOT covered here (covered by other test layers):
 *   GEN01-02: Wrong password → 401 (backend: TS-GEN01-01-07.py)
 *   GEN01-03: Disabled account → 401 (backend: TS-GEN01-01-07.py)
 *   GEN01-05: Empty field validation (frontend unit: TS-GEN01-05.test.ts)
 *   GEN01-06: Server error handling (backend: TS-GEN01-01-07.py)
 *   GEN01-07: Performance under load (Locust: TS-GEN01-07-login-load.py)
 *
 * Credentials (must exist in DB):
 *   Teacher : nguyen_thi_lan / password
 *   Admin   : admin / password
 */

import { test, expect } from '@playwright/test';

const SELECTORS = {
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  SUBMIT_BUTTON: 'button[type="submit"]',
};

test.describe('TS-GEN01 — Login Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Always start from login page with a clean state
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.USERNAME_INPUT, { timeout: 10000 });
  });

  /**
   * GEN01-01: Homeroom/subject teacher logs in successfully
   * Expected: token stored, URL changes to /select-dashboard
   */
  test('GEN01-01: teacher login → redirected to select-dashboard', async ({ page }) => {
    await page.fill(SELECTORS.USERNAME_INPUT, 'nguyen_thi_lan');
    await page.fill(SELECTORS.PASSWORD_INPUT, 'password');
    await page.click(SELECTORS.SUBMIT_BUTTON);

    // Wait for redirect away from login
    await page.waitForURL('**/select-dashboard', { timeout: 15000 });

    // Verify JWT stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  /**
   * GEN01-04: Admin logs in successfully
   * Expected: token stored, URL changes to /admin/dashboard (role-based redirect)
   */
  test('GEN01-04: admin login → redirected to /admin/dashboard', async ({ page }) => {
    await page.fill(SELECTORS.USERNAME_INPUT, 'admin');
    await page.fill(SELECTORS.PASSWORD_INPUT, 'password');
    await page.click(SELECTORS.SUBMIT_BUTTON);

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // Verify JWT stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});
