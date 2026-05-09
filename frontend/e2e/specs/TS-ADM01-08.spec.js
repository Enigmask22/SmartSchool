/**
 * End-to-End Test for Admin User Creation (TS-ADM01-08)
 * 
 * Test Case: Complete user creation workflow
 * Flow: Login → Admin Management → Users Tab → Create User → Verify in Table
 * Expected: Toast message appears + User visible in table without page refresh
 * 
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test('TS-ADM01-08: Complete user creation workflow', async ({ page }) => {
  // =========================================================
  // Step 1: Login as Admin
  // =========================================================
  
  await page.context().clearCookies();
  await page.goto(ROUTES.LOGIN);
  
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('adminManagement_activeTab');
  });
  
  // Fill login credentials
  const usernameInput = page.locator('input[name="username"]');
  const passwordInput = page.locator('input[name="password"]');
  const loginButton = page.locator('button[type="submit"]');
  
  await usernameInput.fill(TEST_USER.admin.username);
  await passwordInput.fill(TEST_USER.admin.password);
  await loginButton.click();
  
  // Wait for redirect to admin dashboard
  try {
    await page.waitForURL('**/admin/dashboard', { timeout: TEST_TIMEOUTS.LONG });
  } catch (e) {
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
  }
  
  // Verify login successful
  const hasToken = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(hasToken).toBeTruthy();
  
  // =========================================================
  // Step 2: Navigate to Admin Management
  // =========================================================
  
  await page.goto(ROUTES.ADMIN_MANAGEMENT);
  
  // Wait for page to fully load with all network requests complete
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
  
  // Verify page loaded - use more flexible text matcher
  // (allows for whitespace variations and handles text in nested elements)
  const header = page.locator('h1, h2, [role="heading"]').filter({ hasText: /Quản lý hệ thống/ });
  await expect(header).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  
  // =========================================================
  // Step 3: Click Users Tab
  // =========================================================
  
  const usersTab = page.locator('button:has-text("Người dùng")').first();
  await expect(usersTab).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  await usersTab.click();
  
  // Wait for table to load
  await page.waitForSelector('table tbody', { timeout: TEST_TIMEOUTS.NORMAL });
  
  // =========================================================
  // Step 4: Click "Add New" Button to Open Form
  // =========================================================
  
  const addButton = page.locator('button:has-text("Thêm mới")');
  await expect(addButton).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  await addButton.click();
  
  // Wait for form dialog to appear
  await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.NORMAL });
  await page.waitForTimeout(500);
  
  // =========================================================
  // Step 5: Fill User Form with Valid Data
  // =========================================================
  
  const timestamp = String(Date.now()).slice(-8); // 8 digits → username stays ≤20 chars
  const testUsername = `tch_${timestamp}`;
  const testEmail = `tch_${timestamp}@school.edu.vn`;
  const testFullName = 'Test Teacher';
  const testPassword = 'TestPass123!@#';
  
  // Fill username - use placeholder selector "ho_va_ten" (specific to username field)
  const formUsernameInput = page.locator('[role="dialog"] input[placeholder="ho_va_ten"]');
  await formUsernameInput.fill(testUsername);
  
  // Fill email - find input with type="email"
  const formEmailInput = page.locator('[role="dialog"] input[type="email"]');
  await formEmailInput.fill(testEmail);
  
  // Fill full name - find all text inputs and get the one that's not username/email
  // (it's the 3rd input in order: username, email, full_name)
  const allTextInputs = page.locator('[role="dialog"] input[type="text"]');
  const formFullNameInput = allTextInputs.nth(1); // 2nd text input after username
  await formFullNameInput.fill(testFullName);
  
  // Fill password - find input with type="password"
  const formPasswordInput = page.locator('[role="dialog"] input[type="password"]');
  await formPasswordInput.fill(testPassword);
  
  // Set role to "Giáo viên" (Teacher) - click the role Select dropdown
  const roleTrigger = page.locator('[role="dialog"] [role="combobox"]').first();
  await expect(roleTrigger).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  await roleTrigger.click();
  
  // Wait for dropdown options to appear (multiple possible selectors)
  try {
    // Try clicking the option (might be [role="option"] or just a div with text)
    const roleOption = page.locator('div[role="option"]:has-text("Giáo viên"), [role="option"]:has-text("Giáo viên")').first();
    await expect(roleOption).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    await roleOption.click();
  } catch (e) {
    // Fallback: try clicking text directly
    await page.click('text=Giáo viên');
  }
  
  // =========================================================
  // Step 6: Click Save Button to Create User
  // =========================================================
  
  // The button renders as "Tạo mới" (Create New) when creating a user
  const saveButton = page.locator('[role="dialog"] button:has-text("Tạo mới")');
  await expect(saveButton).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  await saveButton.click();
  
  // =========================================================
  // Step 7: Verify Success Message (Toast)
  // =========================================================
  
  // Toast must appear before it auto-dismisses (sonner toast renders as li[data-sonner-toast])
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  
  // =========================================================
  // Step 8: Verify User Appears in Table (Without Page Refresh)
  // =========================================================
  
  await page.waitForTimeout(1000);
  
  // Check that dialog is closed
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).not.toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL }).catch(() => {});
  
  // Verify table is visible
  const table = page.locator('table');
  await expect(table).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  
  // Look for newly created user in table
  const tableRows = page.locator('table tbody tr');
  const rowCount = await tableRows.count();
  
  // Should have at least one row (the created user or existing users)
  expect(rowCount).toBeGreaterThanOrEqual(1);
  
  // Try to find the newly created user by username in table
  let userFound = false;
  for (let i = 0; i < rowCount; i++) {
    const rowText = await tableRows.nth(i).textContent();
    if (rowText && rowText.includes(testUsername)) {
      userFound = true;
      break;
    }
  }
  
  // New user must be visible in the table without a page refresh
  expect(userFound).toBe(true);
  
  // =========================================================
  // Step 9: Verify No Page Refresh Occurred
  // =========================================================
  
  // Page URL should still be on admin management
  expect(page.url()).toContain('/admin/management');
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/TS-ADM01-08-complete-flow.png' });
  
  // =========================================================
  // Step 10: Cleanup — delete the created test user via API
  // =========================================================
  
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  if (token) {
    const apiBase = 'http://localhost:8000/api';
    const listResp = await page.request.get(`${apiBase}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (listResp.ok()) {
      const listData = await listResp.json();
      const createdUser = listData.data?.find((u) => u.username === testUsername);
      if (createdUser) {
        await page.request.delete(`${apiBase}/admin/users/${createdUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  }
});
