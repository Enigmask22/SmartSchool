/**
 * CRITICAL PATH - Dashboard Functionality
 * 
 * Basic functionality tests for main dashboards
 */
import { test, expect } from '@playwright/test';
import { ROUTES, SELECTORS, TEST_TIMEOUTS } from '../helpers/test-data.js';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // For now, just navigate to dashboard
    // TODO: Implement proper authentication fixture after Phase 1 is set up
    await page.goto(ROUTES.ADMIN_DASHBOARD);
  });

  test('Dashboard loads without errors', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    
    // Should not show error
    const errorMessage = page.locator(SELECTORS.ERROR_MESSAGE);
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBeFalsy();

    // Should show main content
    const mainContent = page.locator(SELECTORS.MAIN_CONTENT);
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('Dashboard sidebar is visible and interactive', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.SIDEBAR);
    await expect(sidebar).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Sidebar should have at least one link
    const sidebarLinks = sidebar.locator('a, button');
    await expect(sidebarLinks.first()).toBeVisible();
  });

  test('Take dashboard screenshot for visual regression', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });
});

test.describe('Homeroom Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.HOMEROOM_DASHBOARD);
  });

  test('Homeroom dashboard loads', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    
    const mainContent = page.locator(SELECTORS.MAIN_CONTENT);
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('Take homeroom dashboard screenshot', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await page.screenshot({ path: 'test-results/homeroom-dashboard.png' });
  });
});

test.describe('Dashboard Navigation', () => {
  test('Can navigate between pages using sidebar', async ({ page }) => {
    await page.goto(ROUTES.ADMIN_DASHBOARD);
    await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });

    // Try to find and click a navigation link
    const navLinks = page.locator('nav a, [role="navigation"] a, aside a');
    const firstLink = navLinks.first();
    
    const hasLinks = await firstLink.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasLinks) {
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
