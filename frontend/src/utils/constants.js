/**
 * Application Route Constants
 * Centralized route definitions for the SmartSchool application
 */

// ==================== AUTH ROUTES ====================
export const AUTH_ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  SELECT_DASHBOARD: '/select-dashboard',
};

// ==================== COMMON ROUTES ====================
export const COMMON_ROUTES = {
  PROFILE: '/profile',
  ROOT: '/',
};

// ==================== ADMIN ROUTES ====================
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/dashboard',
  MANAGEMENT: '/admin/management',
  CLASSES: '/admin/classes',
  CONTINUOUS: '/admin/continuous',
  UI_DEMO: '/admin/ui-demo',
};

// ==================== HOMEROOM ROUTES ====================
export const HOMEROOM_ROUTES = {
  DASHBOARD: '/homeroom/dashboard',
  STUDENTS: '/homeroom/students',
  ATTENDANCE: '/homeroom/attendance',
  FACES: '/homeroom/faces',
};

// ==================== SUBJECT TEACHER ROUTES ====================
export const SUBJECT_ROUTES = {
  DASHBOARD: '/subject/dashboard',
  GRADES: '/subject/grades',
};

// ==================== ALL ROUTES ====================
export const ROUTES = {
  ...AUTH_ROUTES,
  ...COMMON_ROUTES,
  ADMIN: ADMIN_ROUTES,
  HOMEROOM: HOMEROOM_ROUTES,
  SUBJECT: SUBJECT_ROUTES,
};

// ==================== ROUTE HELPERS ====================
export const getDefaultRouteByRole = (role) => {
  switch (role) {
    case 'admin':
      return ADMIN_ROUTES.DASHBOARD;
    case 'homeroom_teacher':
      return HOMEROOM_ROUTES.DASHBOARD;
    case 'teacher':
      return SUBJECT_ROUTES.DASHBOARD;
    default:
      return AUTH_ROUTES.SELECT_DASHBOARD;
  }
};

// ==================== ROLE CONSTANTS ====================
export const USER_ROLES = {
  ADMIN: 'admin',
  HOMEROOM_TEACHER: 'homeroom_teacher',
  SUBJECT_TEACHER: 'teacher',
};
