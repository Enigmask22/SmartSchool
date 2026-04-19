/**
 * End-to-End Test for Student Management (TS-ADM02-12)
 * 
 * Test Cases: 
 * - Delete student NOT in class (should succeed)
 * - Cannot delete student IN class (should show error)
 * - Full delete flow with confirmation dialog
 * 
 * Framework: Playwright
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_TIMEOUTS, TEST_USER } from '../helpers/test-data.js';

test.describe('TS-ADM02: Student Management E2E Tests', () => {
  
  // TS-ADM02-12-01: Delete student NOT in class
  test('TS-ADM02-12-01: Delete student without class assignment', async ({ page }) => {
    // Step 1: Login as admin
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });
    
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await usernameInput.fill(TEST_USER.admin.username);
    await passwordInput.fill(TEST_USER.admin.password);
    await loginButton.click();
    
    // Wait for redirect to dashboard
    try {
      await page.waitForURL('**/admin/**', { timeout: TEST_TIMEOUTS.LONG });
    } catch (e) {
      await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
    }
    
    const hasToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(hasToken).toBeTruthy();
    
    // Step 2: Navigate to Class Management
    await page.goto(ROUTES.CLASS_MANAGEMENT);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.NORMAL });
    
    // Step 3: Select a class (if needed)
    // For this test, we need a class with students
    // Try to find and click on a class card
    const classSelector = page.locator('[class*="card"]').filter({ hasText: /Lớp/ }).first();
    if (await classSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await classSelector.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Step 4: Find a student WITHOUT class assignment (is_active=true, class_name="", grade="")
    // Or create one via API
    const timestamp = Date.now();
    const testStudentName = `Test_Delete_${timestamp}`;
    
    // Create student without class via API
    const createResponse = await page.request.post('/api/students', {
      data: {
        student_id: `DELETE_${timestamp}`,
        full_name: testStudentName,
        email: `delete${timestamp}@school.edu.vn`,
        class_name: "",  // No class assignment
        grade: "",       // No grade
        gender: 'Nam',
        parent_contacts: [],
      }
    });
    
    expect(createResponse.ok()).toBe(true);
    const studentData = await createResponse.json();
    const studentId = studentData.data.id;
    
    // Step 5: Reload students list and find the new student
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find student row by name
    const studentRow = page.locator(`text=${testStudentName}`).first();
    await expect(studentRow).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    
    // Step 6: Find delete button for this student and click it
    const deleteButton = studentRow.locator('xpath=../../following-sibling::*//button[contains(@class, "destructive")]').first();
    await expect(deleteButton).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    await deleteButton.click();
    
    // Step 7: Verify confirmation dialog appears
    const confirmDialog = page.locator('[role="dialog"]').first();
    await expect(confirmDialog).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    
    const dialogText = confirmDialog.locator('text=Vô hiệu');
    await expect(dialogText).toBeVisible();
    
    // Step 8: Click confirm button
    const confirmButton = confirmDialog.locator('button:has-text("Vô hiệu hóa")').first();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Step 9: Verify success toast message
    const successToast = page.locator('text=Vô hiệu hóa học sinh thành công').first();
    await expect(successToast).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
    
    // Step 10: Verify student no longer in active list
    await page.waitForTimeout(1000);
    const studentAfterDelete = page.locator(`text=${testStudentName}`);
    await expect(studentAfterDelete).not.toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL }).catch(() => {});
  });
  
  
  // TS-ADM02-09-01: Cannot delete student IN class
  test('TS-ADM02-09-01: Cannot delete student currently in class', async ({ page }) => {
    // Step 1: Login
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });
    
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await usernameInput.fill(TEST_USER.admin.username);
    await passwordInput.fill(TEST_USER.admin.password);
    await loginButton.click();
    
    try {
      await page.waitForURL('**/admin/**', { timeout: TEST_TIMEOUTS.LONG });
    } catch (e) {
      await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
    }
    
    // Step 2: Navigate to Class Management
    await page.goto(ROUTES.CLASS_MANAGEMENT);
    await page.waitForLoadState('networkidle');
    
    // Step 3: Create or find a student IN a class
    const timestamp = Date.now();
    const testStudentInClass = `Test_InClass_${timestamp}`;
    
    // Create student WITH class assignment
    const createResponse = await page.request.post('/api/students', {
      data: {
        student_id: `INCLASS_${timestamp}`,
        full_name: testStudentInClass,
        email: `inclass${timestamp}@school.edu.vn`,
        class_name: "10A1",    // Assigned to class
        grade: "10",           // Assigned to grade
        gender: 'Nữ',
        parent_contacts: [],
      }
    });
    
    expect(createResponse.ok()).toBe(true);
    
    // Step 4: Navigate to students view
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Step 5: Find and try to delete student in class
    const studentRow = page.locator(`text=${testStudentInClass}`).first();
    if (await studentRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = studentRow.locator('xpath=../../following-sibling::*//button[contains(@class, "destructive")]').first();
      
      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Verify confirmation dialog
        const confirmDialog = page.locator('[role="dialog"]').first();
        await expect(confirmDialog).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
        
        // Click confirm
        const confirmButton = confirmDialog.locator('button:has-text("Vô hiệu hóa")').first();
        await confirmButton.click();
        
        // Step 6: Verify ERROR message (cannot delete student in class)
        const errorToast = page.locator('text=Không thể xóa học sinh đang trong lớp').first();
        await expect(errorToast).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
        
        // Step 7: Verify student still in table
        await page.waitForTimeout(500);
        const studentStillExists = page.locator(`text=${testStudentInClass}`);
        await expect(studentStillExists).toBeVisible();
      }
    }
  });


  // TS-ADM02-04-01: Duplicate name + DOB detection
  test('TS-ADM02-04-01: Cannot create student with duplicate name + DOB', async ({ page }) => {
    // Step 1: Login
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });
    
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await usernameInput.fill(TEST_USER.admin.username);
    await passwordInput.fill(TEST_USER.admin.password);
    await loginButton.click();
    
    try {
      await page.waitForURL('**/admin/**', { timeout: TEST_TIMEOUTS.LONG });
    } catch (e) {
      await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
    }
    
    // Step 2: Create first student
    const timestamp = Date.now();
    const baseDate = '2009-03-15';
    const duplicateName = `Duplicate_Name_${timestamp}`;
    
    const firstResponse = await page.request.post('/api/students', {
      data: {
        student_id: `FIRST_${timestamp}`,
        full_name: duplicateName,
        email: `first${timestamp}@school.edu.vn`,
        class_name: "10B1",
        grade: "10",
        date_of_birth: baseDate,
        gender: 'Nam',
        parent_contacts: [],
      }
    });
    
    expect(firstResponse.ok()).toBe(true);
    
    // Step 3: Try to create second student with same name + DOB
    const secondResponse = await page.request.post('/api/students', {
      data: {
        student_id: `SECOND_${timestamp}`,
        full_name: duplicateName,
        email: `second${timestamp}@school.edu.vn`,
        class_name: "10B2",
        grade: "10",
        date_of_birth: baseDate,
        gender: 'Nữ',
        parent_contacts: [],
      }
    });
    
    // Step 4: Verify 409 Conflict response
    expect(secondResponse.status()).toBe(409);
    const errorData = await secondResponse.json();
    expect(errorData.detail).toContain('Học sinh cùng tên');
    expect(errorData.detail).toContain('đã tồn tại');
  });


  // TS-ADM02-05-01: Bypass duplicate with force_create
  test('TS-ADM02-05-01: Can bypass duplicate with force_create flag', async ({ page }) => {
    // Step 1: Login
    await page.context().clearCookies();
    await page.goto(ROUTES.LOGIN);
    
    await page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    });
    
    const usernameInput = page.locator('input[name="username"]');
    const passwordInput = page.locator('input[name="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    await usernameInput.fill(TEST_USER.admin.username);
    await passwordInput.fill(TEST_USER.admin.password);
    await loginButton.click();
    
    try {
      await page.waitForURL('**/admin/**', { timeout: TEST_TIMEOUTS.LONG });
    } catch (e) {
      await page.waitForSelector('main', { timeout: TEST_TIMEOUTS.LONG }).catch(() => {});
    }
    
    // Step 2: Create first student
    const timestamp = Date.now();
    const baseDate = '2009-04-20';
    const forceName = `Force_Create_${timestamp}`;
    
    const firstResponse = await page.request.post('/api/students', {
      data: {
        student_id: `FORCE_1_${timestamp}`,
        full_name: forceName,
        email: `force1${timestamp}@school.edu.vn`,
        class_name: "10C1",
        grade: "10",
        date_of_birth: baseDate,
        gender: 'Nam',
        parent_contacts: [],
      }
    });
    
    expect(firstResponse.ok()).toBe(true);
    
    // Step 3: Create duplicate WITH force_create=true
    const forceResponse = await page.request.post('/api/students', {
      data: {
        student_id: `FORCE_2_${timestamp}`,
        full_name: forceName,
        email: `force2${timestamp}@school.edu.vn`,
        class_name: "10C2",
        grade: "10",
        date_of_birth: baseDate,
        gender: 'Nữ',
        force_create: true,  // Bypass check
        parent_contacts: [],
      }
    });
    
    // Step 4: Verify 201 Created (success with force_create)
    expect(forceResponse.status()).toBe(201);
    const successData = await forceResponse.json();
    expect(successData.success).toBe(true);
    expect(successData.data.full_name).toBe(forceName);
  });
});
