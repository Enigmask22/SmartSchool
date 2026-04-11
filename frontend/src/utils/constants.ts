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
  CONTINUOUS: '/homeroom/continuous',
};

// ==================== SUBJECT TEACHER ROUTES ====================
export const SUBJECT_ROUTES = {
  DASHBOARD: '/subject/dashboard',
  GRADES: '/subject/scores',
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

// ==================== ACADEMIC YEAR CONSTANTS ====================
/**
 * Generate academic year list with current year as newest, going back 20 years
 * Example: If current year is 2026, generates: ["2026-2027", "2025-2026", ..., "2006-2007"]
 * 
 * @param startYear - The starting year (defaults to current system year)
 * @param yearsBack - How many years to go back (default: 20)
 * @returns Array of academic year strings in format "YYYY-YYYY", newest first
 */
export const generateAcademicYears = (
  startYear: number = new Date().getFullYear(),
  yearsBack: number = 20
): string[] => {
  const years: string[] = [];
  
  // Generate current year and 20 years back
  for (let i = 0; i <= yearsBack; i++) {
    const year = startYear - i;
    years.push(`${year}-${year + 1}`);
  }
  
  return years;
};

/**
 * Default academic years for dropdown (current year + 20 years back)
 * Example: ["2026-2027", "2025-2026", "2024-2025", ..., "2006-2007"]
 */
export const ACADEMIC_YEAR_OPTIONS = generateAcademicYears(
  new Date().getFullYear(),
  20  // Show 20 years in past
);

/**
 * Academic year display format
 * Example: "2025-2026" → "Năm học 2025-2026"
 */
export const formatAcademicYear = (academicYear: string): string => {
  return `Năm học ${academicYear}`;
};
