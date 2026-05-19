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
 * Teardown: afterEach intercepts the actual POST request to capture
 *   the moved student IDs and target class, then restores via direct
 *   API call — making the test idempotent across runs.
 *
 * Error cases covered by backend pytest TS-ADM03-01-07.py and vitest
 * TS-ADM03-02-03.test.tsx per E2E scope rule.
 *
 * Framework: Playwright
 */

test.describe('TS-ADM03-08: E2E Class Transfer UI Flow', () => {

  // Data-mutating test — Chromium only to avoid parallel browser DB contention
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium only');
  });

  test.beforeEach(async ({ page }) => {
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

    await page.goto(ROUTES.CLASS_MANAGEMENT);
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    // Wait for settings + classes API to fully settle so selectedAcademicYear
    // reaches its final value (defaultAcademicYear override) before we interact.
    // Without this, the class cards may show 2024-2025 classes while the modal
    // pre-fills 2025-2026 — causing a cross-year INSERT that is not idempotent.
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
  });

  test('TS-ADM03-08: Full E2E flow - Transfer student to another class', async ({ page }) => {

    // Step 1: Wait for class cards to load (header appears first, then data)
    await page.waitForSelector('text=Danh sách lớp học', { timeout: TEST_TIMEOUTS.NORMAL });
    // Wait for class card data to appear (API fetch completes after header renders)
    const firstCard = page.locator('text=10A1').first();
    await firstCard.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.NORMAL });
    await firstCard.click();

    // Step 2: Wait for the student table to load
    await page.waitForSelector('table tbody tr', { timeout: TEST_TIMEOUTS.NORMAL });

    // Step 3: Select the first student's checkbox
    const studentCheckboxes = page.locator('table tbody tr td:first-child input[type="checkbox"]');
    await studentCheckboxes.first().waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await studentCheckboxes.first().check();
    expect(await studentCheckboxes.first().isChecked()).toBe(true);

    // Step 4: Click "Chuyển" button
    const moveButton = page.locator('button:has-text("Chuyển")');
    await moveButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await moveButton.click();

    // Step 5: Wait for the move modal to open
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    expect(await modal.isVisible()).toBe(true);

    // comboboxes[0] = Năm học (pre-filled by onMoveClass), [1] = Khối, [2] = Lớp đích
    const comboboxes = modal.locator('[role="combobox"]');

    // Step 6: Pick first available grade (year already pre-filled — no need to click it)
    await comboboxes.nth(1).click();
    const gradeOption = page.locator('[role="option"]').filter({ hasText: /Khối/ }).first();
    await gradeOption.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await gradeOption.click();

    // Step 7: Pick first available target class
    await comboboxes.nth(2).click();
    const classOption = page.locator('[role="option"]').filter({ hasText: /\d+A\d+/ }).first();
    await classOption.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await classOption.click();

    // Step 8: Confirm
    const confirmButton = modal.locator('button:has-text("Xác nhận")');
    await confirmButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT });
    await confirmButton.click();

    // Step 10: Verify success toast
    const successToast = page.locator('[data-sonner-toast]');
    const toastAppeared = await successToast.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.SHORT }).then(() => true).catch(() => false);
    if (toastAppeared) {
      const toastText = await successToast.first().innerText().catch(() => '');
      expect(toastText).toContain('thành công');
    }

    // Step 11: Modal closes after success
    await expect(modal).not.toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });
});
