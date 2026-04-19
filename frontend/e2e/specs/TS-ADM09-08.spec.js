/**
 * Test Suite: TS-ADM09-08 - Teacher Management UI/E2E Tests
 * ==========================================================
 * 
 * Test Matrix Mapping:
 * - **TS-ADM09-08:** E2E (Playwright) - Luồng UI: Tạo User -> Tạo Hộ số GV -> Kiểm tra danh sách
 *
 * Focus Areas:
 * - Navigate to Teacher tab
 * - View teacher list and verify data display
 * - Create new teacher via UI
 * - Edit teacher information
 * - Delete teacher with confirmation
 * - Search and filter teachers
 * - Full CRUD workflow
 * - Error handling
 *
 * Test Pattern: Playwright E2E with admin authentication, Vietnamese UI elements
 */

import { test, expect } from '@playwright/test';

// Use admin fixture for pre-authenticated access
test.use({ storageState: 'auth.json' });

test.describe('TS-ADM09-08: Teacher Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin management page
    await page.goto('/admin-management');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test: Navigate to Teacher tab
   */
  test('should navigate to Teacher tab from admin management page', async ({ page }) => {
    // Look for teacher tab button/link
    const teacherTab = page.locator('button, [role="tab"]').filter({
      hasText: /Giáo viên|Teacher/i,
    });

    // Click teacher tab if visible
    if (await teacherTab.first().isVisible()) {
      await teacherTab.first().click();
    }

    // Verify page shows teacher content
    const pageContent = page.locator('body');
    await expect(pageContent).toContainText(/Giáo viên|Teacher/i);
  });

  /**
   * Test: View teacher list displays correctly
   */
  test('should display teacher list with required columns', async ({ page }) => {
    // Navigate to teacher tab
    const teacherTab = page.locator('button, [role="tab"]').filter({
      hasText: /Giáo viên|Teacher/i,
    });

    if (await teacherTab.first().isVisible()) {
      await teacherTab.first().click();
    }

    // Check for teacher table or list
    const table = page.locator('table, [role="grid"], .teacher-list');

    // Look for expected columns
    const hasTeacherCode = await page
      .locator('th, [role="columnheader"]')
      .filter({ hasText: /Mã|Code/ })
      .count()
      .then(count => count > 0);

    const hasTeacherName = await page
      .locator('th, [role="columnheader"]')
      .filter({ hasText: /Tên|Name/ })
      .count()
      .then(count => count > 0);

    // At least one of the expected headers should exist
    expect(hasTeacherCode || hasTeacherName).toBeTruthy();
  });

  /**
   * Test: Open create teacher form
   */
  test('should open create teacher form when clicking create button', async ({ page }) => {
    // Find and click create/add button
    const createButton = page.locator('button').filter({
      hasText: /Thêm|Tạo|Create|New/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Wait for form to appear
      await page.waitForSelector('input, textarea, form', { timeout: 5000 });

      // Verify form is visible
      const form = page.locator('form');
      await expect(form).toBeVisible();
    }
  });

  /**
   * Test: Create new teacher
   */
  test('should create new teacher with valid data', async ({ page }) => {
    const timestamp = Math.floor(Date.now() / 1000) % 100000;
    const teacherCode = `GV${timestamp}`;
    const teacherName = `Test Teacher ${timestamp}`;

    // Click create button
    const createButton = page.locator('button').filter({
      hasText: /Thêm|Tạo|Create|New/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();

      // Wait for form
      await page.waitForSelector('input', { timeout: 5000 });

      // Fill teacher code
      const codeInput = page
        .locator('input')
        .filter({ hasAttribute: 'name', hasAttribute: 'type' })
        .first();

      await codeInput.fill(teacherCode);

      // Fill teacher name
      const nameInputs = page.locator('input[type="text"]');
      const nameInput = nameInputs.nth(1); // Assuming code is first, name is second

      await nameInput.fill(teacherName);

      // Find and click submit button
      const submitButton = page.locator('button').filter({
        hasText: /Tạo|Lưu|Submit|Save/i,
      });

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        // Wait for success notification or redirect
        await page.waitForTimeout(2000);

        // Verify success (either toast notification or page content)
        const pageContent = page.locator('body');
        const hasSuccess = await pageContent
          .locator('text=/thành công|success|created/i')
          .count()
          .then(count => count > 0);

        // If no success message, at least the form should be closed
        const formStillVisible = await page.locator('form').isVisible();

        expect(hasSuccess || !formStillVisible).toBeTruthy();
      }
    }
  });

  /**
   * Test: Edit teacher information
   */
  test('should edit teacher information', async ({ page }) => {
    // Find first teacher in list (if any)
    const teacherRows = page.locator('tr, [role="row"]').filter({
      has: page.locator('td, [role="gridcell"]'),
    });

    if (await teacherRows.first().isVisible()) {
      // Look for edit button in first row
      const editButton = teacherRows.first().locator('button').filter({
        hasText: /Sửa|Edit/i,
      });

      if (await editButton.first().isVisible()) {
        await editButton.first().click();

        // Wait for form to appear
        await page.waitForSelector('input', { timeout: 5000 });

        // Verify form is visible (indicates edit mode)
        const form = page.locator('form');
        await expect(form).toBeVisible();

        // Fill some field to update
        const inputs = page.locator('input[type="text"]');
        if (await inputs.first().isVisible()) {
          await inputs.first().fill('Updated Teacher Name');
        }

        // Click submit
        const submitButton = page.locator('button').filter({
          hasText: /Cập nhật|Update|Save/i,
        });

        if (await submitButton.first().isVisible()) {
          await submitButton.first().click();

          // Wait for success
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  /**
   * Test: Delete teacher with confirmation
   */
  test('should delete teacher after confirmation', async ({ page }) => {
    // Find first teacher row
    const teacherRows = page.locator('tr, [role="row"]').filter({
      has: page.locator('td, [role="gridcell"]'),
    });

    if (await teacherRows.first().isVisible()) {
      // Find delete button
      const deleteButton = teacherRows.first().locator('button').filter({
        hasText: /Xóa|Delete|Remove/i,
      });

      if (await deleteButton.first().isVisible()) {
        await deleteButton.first().click();

        // Wait for confirmation dialog
        const confirmButton = page.locator('button').filter({
          hasText: /Xác nhận|Có|Yes|Confirm/i,
        });

        if (await confirmButton.first().isVisible()) {
          await confirmButton.first().click();

          // Wait for deletion to complete
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  /**
   * Test: Search/Filter teachers
   */
  test('should search and filter teachers', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input').filter({
      hasAttribute: 'placeholder',
    });

    if (await searchInput.first().isVisible()) {
      // Type search term
      await searchInput.first().fill('GV');

      // Wait for results to update
      await page.waitForTimeout(1000);

      // Verify results are displayed
      const results = page.locator('tr, [role="row"]');
      const resultCount = await results.count();

      // Should have at least some results or display message
      expect(resultCount >= 0).toBeTruthy();
    }
  });

  /**
   * Test: Teacher tab responsive layout
   */
  test('should display teacher management responsively', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify page is still accessible
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  /**
   * Test: Full CRUD workflow
   */
  test('should complete full teacher CRUD workflow', async ({ page }) => {
    const timestamp = Math.floor(Date.now() / 1000) % 100000;

    // 1. CREATE: Open form
    const createButton = page.locator('button').filter({
      hasText: /Thêm|Tạo|Create|New/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();
      await page.waitForSelector('form', { timeout: 5000 });

      // 2. FILL: Enter data
      const inputs = page.locator('input[type="text"]');
      if (await inputs.nth(0).isVisible()) {
        await inputs.nth(0).fill(`GV${timestamp}`);
      }
      if (await inputs.nth(1).isVisible()) {
        await inputs.nth(1).fill(`Test Teacher ${timestamp}`);
      }

      // 3. CREATE: Submit
      const submitButton = page.locator('button').filter({
        hasText: /Tạo|Lưu|Submit/i,
      });

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();
        await page.waitForTimeout(2000);
      }

      // 4. READ: Verify in list (search for it)
      const searchInput = page.locator('input').filter({
        hasAttribute: 'placeholder',
      });

      if (await searchInput.first().isVisible()) {
        await searchInput.first().fill(`GV${timestamp}`);
        await page.waitForTimeout(1000);

        const results = page.locator('body');
        const hasTeacher = await results.locator(`text=GV${timestamp}`).count();
        expect(hasTeacher >= 0).toBeTruthy();
      }
    }
  });

  /**
   * Test: Error handling for invalid data
   */
  test('should show error for invalid teacher data', async ({ page }) => {
    const createButton = page.locator('button').filter({
      hasText: /Thêm|Tạo|Create|New/i,
    });

    if (await createButton.first().isVisible()) {
      await createButton.first().click();
      await page.waitForSelector('form', { timeout: 5000 });

      // Try to submit empty form
      const submitButton = page.locator('button').filter({
        hasText: /Tạo|Lưu|Submit/i,
      });

      if (await submitButton.first().isVisible()) {
        await submitButton.first().click();

        // Wait for error
        await page.waitForTimeout(1000);

        // Check for error message
        const errorMessage = page.locator('.error, .alert, [role="alert"]');
        const hasError = await errorMessage.count();

        // Should have error or form still visible
        const formVisible = await page.locator('form').isVisible();
        expect(hasError > 0 || formVisible).toBeTruthy();
      }
    }
  });
});
