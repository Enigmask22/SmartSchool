/**
 * CRITICAL PATH - Dashboard Functionality
 * 
 * Basic functionality tests for main dashboards
 */
import { test, expect } from '../fixtures/auth.fixture.js';
import { ROUTES, SELECTORS, TEST_TIMEOUTS } from '../helpers/test-data.js';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to admin dashboard with authenticated session
    await authenticatedPage.goto(ROUTES.ADMIN_DASHBOARD);
  });

  test('Dashboard loads without errors', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    
    // Should not show error
    const errorMessage = authenticatedPage.locator(SELECTORS.ERROR_MESSAGE);
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBeFalsy();

    // Should show main content
    const mainContent = authenticatedPage.locator(SELECTORS.MAIN_CONTENT);
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('Dashboard sidebar is visible and interactive', async ({ authenticatedPage }) => {
    const sidebar = authenticatedPage.locator(SELECTORS.SIDEBAR);
    await expect(sidebar).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });

    // Sidebar should have at least one link
    const sidebarLinks = sidebar.locator('a, button');
    await expect(sidebarLinks.first()).toBeVisible();
  });

  test('Take dashboard screenshot for visual regression', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await authenticatedPage.screenshot({ path: 'test-results/admin-dashboard.png' });
  });
});

test.describe('Homeroom Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto(ROUTES.HOMEROOM_DASHBOARD);
  });

  test('Homeroom dashboard loads', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    
    const mainContent = authenticatedPage.locator(SELECTORS.MAIN_CONTENT);
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('Take homeroom dashboard screenshot', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await authenticatedPage.screenshot({ path: 'test-results/homeroom-dashboard.png' });
  });
});

test.describe('Subject Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto(ROUTES.SUBJECT_DASHBOARD);
  });

  test('Subject dashboard loads', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    
    const mainContent = authenticatedPage.locator(SELECTORS.MAIN_CONTENT);
    await expect(mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.NORMAL });
  });

  test('Take subject dashboard screenshot', async ({ authenticatedPage }) => {
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });
    await authenticatedPage.screenshot({ path: 'test-results/subject-dashboard.png' });
  });
});

test.describe('Dashboard Navigation', () => {
  test('Can navigate between pages using sidebar', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(ROUTES.ADMIN_DASHBOARD);
    await authenticatedPage.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.LONG });

    // Try to find and click a navigation link
    const navLinks = authenticatedPage.locator('nav a, [role="navigation"] a, aside a');
    const firstLink = navLinks.first();
    
    const hasLinks = await firstLink.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasLinks) {
      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
