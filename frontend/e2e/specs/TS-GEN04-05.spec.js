/**
 * Test Suite: TS-GEN04-05 — Change Password E2E (Playwright)
 * =============================================================
 *
 * Use Case: UC-GEN-04 — Quản lý hồ sơ cá nhân
 *
 * Rule: E2E covers happy path only — replaces manual hand-click verification.
 * Other layers:
 *   - Profile update (phone/address): TS-GEN04-01-05.py (pytest)
 *   - Wrong current password: TS-GEN04-01-05.py (pytest)
 *   - Phone format validation: TS-GEN03-GEN04-FE.test.tsx (vitest)
 *
 * E2E scenario (GEN04-05):
 *   1. Login as teacher
 *   2. Navigate to /profile → click "Đổi mật khẩu"
 *   3. Fill in current password + new password → submit
 *   4. Logout → login with new password → assert success
 *   5. Cleanup: change password back to original
 *
 * Credentials: nguyen_thi_lan / password
 */

import { test, expect } from '@playwright/test';

const CREDENTIALS = {
  username: 'nguyen_thi_lan',
  password: 'password',
  newPassword: 'password_e2e_gen04',
};

const SELECTORS = {
  USERNAME_INPUT:     'input[name="username"]',
  PASSWORD_INPUT:     'input[name="password"]',
  SUBMIT_BUTTON:      'button[type="submit"]',
  // Profile page — "Đổi mật khẩu" toggle button
  CHANGE_PASS_TOGGLE: 'button:has-text("Đổi mật khẩu")',
  // Password fields (by id, rendered once toggle is clicked)
  CURRENT_PASSWORD:   '#current_password',
  NEW_PASSWORD:       '#new_password',
  CONFIRM_PASSWORD:   '#confirm_password',
  // Submit inside the password section (contains "Đổi mật khẩu" text + Save icon)
  CHANGE_PASS_SUBMIT: 'button:has-text("Đổi mật khẩu"):not([variant="outline"])',
  // Sidebar logout
  SIDEBAR_LOGOUT:     'button:has-text("Đăng xuất")',
  CONFIRM_LOGOUT:     '[role="dialog"] button:has-text("Đăng xuất")',
};

async function loginAs(page, username, password) {
  await page.goto('/login');
  await page.waitForSelector(SELECTORS.USERNAME_INPUT, { timeout: 10000 });
  await page.fill(SELECTORS.USERNAME_INPUT, username);
  await page.fill(SELECTORS.PASSWORD_INPUT, password);
  await page.click(SELECTORS.SUBMIT_BUTTON);
}

async function changePasswordOnProfilePage(page, currentPass, newPass) {
  await page.goto('/profile');
  await page.waitForSelector(SELECTORS.CHANGE_PASS_TOGGLE, { timeout: 10000 });

  // Click toggle to show the password form
  await page.click(SELECTORS.CHANGE_PASS_TOGGLE);

  // Fill in password fields
  await page.waitForSelector(SELECTORS.CURRENT_PASSWORD, { timeout: 5000 });
  await page.fill(SELECTORS.CURRENT_PASSWORD, currentPass);
  await page.fill(SELECTORS.NEW_PASSWORD, newPass);
  await page.fill(SELECTORS.CONFIRM_PASSWORD, newPass);

  // Click the submit button inside the password section
  // There are multiple "Đổi mật khẩu" buttons; the submit one is the first non-outline
  const buttons = page.locator('button:has-text("Đổi mật khẩu")');
  // The toggle button is now hidden; the submit button is the primary (non-outline) one
  await buttons.first().click();

  // Wait for success — the form collapses (toggle button reappears) or success toast
  await page.waitForSelector(SELECTORS.CHANGE_PASS_TOGGLE, { timeout: 10000 });
}

test.describe('TS-GEN04-05 — Change Password Happy Path', () => {

  /**
   * GEN04-05: Change password → logout → login with new password succeeds
   */
  test('GEN04-05: change password → logout → login with new password', async ({ page }) => {
    // ─── Step 1: Login ────────────────────────────────────────────────────────
    await loginAs(page, CREDENTIALS.username, CREDENTIALS.password);
    await page.waitForURL('**/select-dashboard', { timeout: 15000 });

    // ─── Step 2: Change password on /profile ──────────────────────────────────
    await changePasswordOnProfilePage(page, CREDENTIALS.password, CREDENTIALS.newPassword);

    // ─── Step 3: Logout ───────────────────────────────────────────────────────
    await page.click(SELECTORS.SIDEBAR_LOGOUT);
    await page.waitForSelector(SELECTORS.CONFIRM_LOGOUT, { timeout: 5000 });
    await page.click(SELECTORS.CONFIRM_LOGOUT);
    await page.waitForURL('**/login', { timeout: 10000 });

    // ─── Step 4: Login with new password ──────────────────────────────────────
    await loginAs(page, CREDENTIALS.username, CREDENTIALS.newPassword);
    await page.waitForURL('**/select-dashboard', { timeout: 15000 });

    // Assert: successfully logged in
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).not.toBeNull();
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    // ─── Step 5: Cleanup — restore original password ──────────────────────────
    await changePasswordOnProfilePage(page, CREDENTIALS.newPassword, CREDENTIALS.password);
  });
});
