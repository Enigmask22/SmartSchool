import { test, expect } from '@playwright/test';test.describe('Visual Regression - Key Pages', () => {
  test('Admin Dashboard snapshot', async ({ page }) => {
    // Assume authenticated    await page.goto('/admin/dashboard');    await page.waitForLoadState('networkidle');    await expect(page).toHaveScreenshot('admin-dashboard.png');  });  test('Homeroom Dashboard snapshot', async ({ page }) => {
    await page.goto('/homeroom/dashboard');    await page.waitForLoadState('networkidle');    await expect(page).toHaveScreenshot('homeroom-dashboard.png');  });  test('StudentList page snapshot', async ({ page }) => {
    await page.goto('/homeroom/students');    await page.waitForLoadState('networkidle');    await expect(page).toHaveScreenshot('student-list.png');  });});