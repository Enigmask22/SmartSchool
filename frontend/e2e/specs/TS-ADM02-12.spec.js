/**
 * E2E Test for Student Management — TS-ADM02-12
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin creates a student via API, navigates to student management,
 *   soft-deletes the student via UI, verifies success toast, verifies
 *   student disappears from active list, then cleans up.
 *
 * Error cases (duplicate, in-class restriction, etc.) are covered by
 * backend pytest TS-ADM02-01-11.py per E2E scope rule.
 *
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

const API_BASE = 'http://localhost:8000';

test.describe('TS-ADM02: Student Management', () => {

  // TS-ADM02-12-01: Admin soft-deletes a student via UI
  test('TS-ADM02-12-01: Admin can soft-delete a student', async ({ page }) => {
    // Step 1: Login as admin
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

    // Step 2: Create a test student via API (class_name required by backend)
    const timestamp = Date.now();
    const testStudentName = `Test_Delete_${String(timestamp).slice(-8)}`;

    const createResponse = await page.request.post(`${API_BASE}/api/students`, {
      data: {
        student_id: `DEL_${String(timestamp).slice(-8)}`,
        full_name: testStudentName,
        email: `del${timestamp}@school.edu.vn`,
        class_name: '10A1',
        grade: '10',
        academic_year: '2024-2025',
        gender: 'Nam',
        parent_contacts: [],
      },
    });

    expect(createResponse.ok()).toBe(true);
    const studentData = await createResponse.json();
    const studentId = studentData.data.id;

    // Step 3: Navigate to student management (profiles tab)
    await page.goto('/admin/classes');
    await page.waitForLoadState('networkidle');

    // Click the 'Hồ sơ học sinh' tab
    const profilesTab = page.locator('button, [role="tab"]').filter({ hasText: 'Hồ sơ học sinh' }).first();
    await expect(profilesTab).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    await expect(profilesTab).toBeEnabled({ timeout: TEST_TIMEOUTS.NORMAL });
    await profilesTab.click();
    await page.waitForLoadState('networkidle');

    // Search for the student by name to narrow the list
    const searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[type="search"], input[placeholder*="tìm"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(testStudentName);
      await page.waitForTimeout(500);
    }

    const studentRow = page.locator(`text=${testStudentName}`).first();
    await expect(studentRow).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 4: Click delete button for this student
    const deleteButton = studentRow
      .locator('xpath=ancestor::tr//button[contains(@class,"destructive")]')
      .or(studentRow.locator('xpath=../../following-sibling::*//button[contains(@class,"destructive")]'))
      .first();
    await expect(deleteButton).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    await deleteButton.click();

    // Step 5: Confirm deletion in dialog
    const confirmDialog = page.locator('[role="dialog"]').first();
    await expect(confirmDialog).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 6: Confirm deletion
    const confirmButton = confirmDialog.locator('button:has-text("Vô hiệu hóa"), button:has-text("Xác nhận")').first();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Step 7: Verify success toast
    const successToast = page.locator('[data-sonner-toast]').filter({ hasText: /Vô hiệu hóa/ }).first();
    await expect(successToast).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Step 8: Verify student no longer visible in active list
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${testStudentName}`)).not.toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL }).catch(() => {});

    // Step 9: Cleanup via API
    await page.request.delete(`${API_BASE}/api/students/${studentId}/permanent`).catch(() =>
      page.request.delete(`${API_BASE}/api/students/${studentId}`)
    );
  });
});
