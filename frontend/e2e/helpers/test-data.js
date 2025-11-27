/**
 * Test Data and Constants
 * Centralized test data for E2E tests
 */

export const TEST_USER = {
  admin: {
    username: process.env.TEST_ADMIN_USER || 'admin.chuyen_le_quy_don.tphcm',
    password: process.env.TEST_ADMIN_PASS || 'password',
    role: 'admin',
  },
  homeroom: {
    username: process.env.TEST_HOMEROOM_USER || 'nguyen_thi_lan.chuyen_le_quy_don.tphcm',
    password: process.env.TEST_HOMEROOM_PASS || 'password',
    role: 'homeroom',
  },
  subject: {
    username: process.env.TEST_SUBJECT_USER || 'nguyen_thi_lan.chuyen_le_quy_don.tphcm',
    password: process.env.TEST_SUBJECT_PASS || 'password',
    role: 'subject',
  },
};

export const TEST_TIMEOUTS = {
  SHORT: 5000,
  NORMAL: 10000,
  LONG: 30000,
};

export const ROUTES = {
  LOGIN: '/',
  DASHBOARD_SELECTOR: '/dashboard-selector',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_MANAGEMENT: '/admin/management',
  HOMEROOM_DASHBOARD: '/homeroom/dashboard',
  HOMEROOM_STUDENTS: '/homeroom/students',
  HOMEROOM_GRADES: '/homeroom/grades',
  SUBJECT_DASHBOARD: '/subject/dashboard',
};

export const SELECTORS = {
  // Login page - VERIFIED from actual HTML
  USERNAME_INPUT: 'input[name="username"]',
  PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_BUTTON: 'button[type="submit"]',
  FORGOT_PASSWORD_BUTTON: 'button:has-text("Quên mật khẩu")',

  // Dashboard common - ACTUAL STRUCTURE from MainLayout
  // The actual layout is: div.flex > Sidebar + main > div.p-4 > Outlet(dashboard)
  // So we can look for main tag which always exists in MainLayout
  SIDEBAR: 'aside, nav, [role="navigation"]',
  MAIN_CONTENT: 'main',
  LOADING_SPINNER: '[role="status"], .spinner, .loading',
  ERROR_MESSAGE: '[role="alert"], .error, .alert-danger',
};
