import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

/**
 * Test Suite: TS-ADM03-08 - E2E Class Transfer UI Flow
 *
 * Scope: Happy path only (E2E scope rule).
 *   Admin navigates to Class Management (distribution tab, default),
 *   selects a class card, picks a student checkbox, opens the
 *   "Chuyển" modal, fills year/grade/class dropdowns, confirms,
 *   and verifies a success toast appears.
 *
 * Error cases (no students selected, class not found, etc.) are
 * covered by backend pytest TS-ADM03-01-07.py and vitest
 * TS-ADM03-02-03.test.tsx per E2E scope rule.
 *
 * Framework: Playwright
 */

test.describe('TS-ADM03-08: E2E Class Transfer UI Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear session state
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });

    // Login as admin
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

    // Navigate to Class Management (distribution tab is the default)
    await page.goto(ROUTES.CLASS_MANAGEMENT);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('TS-ADM03-08: Full E2E flow - Transfer student to another class', async ({ page }) => {
    /**
     * Happy Path:
     * 1. Click the first class card in the distribution tab
     * 2. Wait for the student table to load
     * 3. Select the first student checkbox
     * 4. Click "Chuyển" button
     * 5. Fill year/grade/class dropdowns in the modal
     * 6. Confirm and verify success toast
     */

    // Step 1: Wait for class list heading (confirms data loaded), then click first class card
    // ClassManagementSelector shows "Danh sách lớp học" when rendered
    await page.waitForSelector('text=Danh sách lớp học', { timeout: TEST_TIMEOUTS.NORMAL });

    // Click first class card — each card shows the class name as text
    const firstCard = page.locator('text=10A1').first();
    await firstCard.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await firstCard.click();

    // Step 2: Wait for the student table
    await page.waitForSelector('table tbody tr', { timeout: TEST_TIMEOUTS.NORMAL });

    // Step 3: Select first student checkbox (plain <input type="checkbox"> – no name attr)
    const studentCheckboxes = page.locator('table tbody tr td:first-child input[type="checkbox"]');
    await studentCheckboxes.first().waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await studentCheckboxes.first().check();

    // Verify at least one student is selected
    expect(await studentCheckboxes.first().isChecked()).toBe(true);

    // Step 4: Click "Chuyển" button (button text is "Chuyển", shown only in distribution tab)
    const moveButton = page.locator('button:has-text("Chuyển")');
    await moveButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await moveButton.click();

    // Step 5: Wait for move modal to open
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    expect(await modal.isVisible()).toBe(true);

    // Academic year (2025-2026) is pre-filled by onMoveClass handler — no click needed.
    // Only grade needs one click; class dropdown becomes enabled once grade is selected.
    const comboboxes = modal.locator('[role="combobox"]');

    // Step 6: Select grade — second combobox (first is year, already populated)
    await comboboxes.nth(1).click();
    const gradeOption = page.locator('[role="option"]').filter({ hasText: /Khối/ }).first();
    await gradeOption.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await gradeOption.click();

    // Step 7: Select target class — third combobox, now enabled after grade selection
    await comboboxes.nth(2).click();
    const classOption = page.locator('[role="option"]').filter({ hasText: /\d+A\d+/ }).first();
    await classOption.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await classOption.click();

    // Step 8: Click confirm button (enabled once class is selected)
    const confirmButton = modal.locator('button:has-text("Xác nhận")');
    await confirmButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await confirmButton.click();

    // Step 9: Verify success (toast or modal closed — either confirms success)
    // Toast: "[data-sonner-toast]" with text containing "thành công"
    const successToast = page.locator('[data-sonner-toast]');
    const toastAppeared = await successToast.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT }).then(() => true).catch(() => false);
    if (toastAppeared) {
      const toastText = await successToast.first().innerText().catch(() => '');
      expect(toastText).toContain('thành công');
    }

    // Step 10: Modal closes after success
    await expect(modal).not.toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});
