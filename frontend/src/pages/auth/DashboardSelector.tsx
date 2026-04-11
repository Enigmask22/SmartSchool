/**
 * DashboardSelector.tsx - Dashboard Role Selection Page Component
 * 
 * Refactored following Rule-of-Refactor:
 * - UI State: loading, hasHomeroomRole, hasSubjectRole (kept in component)
 * - Reusable Logic: useAuthProtection (auth guard for protected routes)
 * - Domain Logic: useRoleDetection (API calls to check user roles)
 * 
 * Manages role-based dashboard selection for teachers with multiple roles:
 * - Auto-redirects to login if not authenticated
 * - Auto-redirects to dashboard if user has only one role
 * - Shows dashboard options if user has multiple roles
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthProtection } from '@/hooks/useAuthProtection';
import { useRoleDetection } from '@/hooks/dashboard-selector/useRoleDetection';
import {
  LoadingCard,
  DashboardHeader,
  HomeroomDashboardCard,
  SubjectDashboardCard,
} from '@/components/dashboard-selector';

/**
 * DashboardSelector Component
 * 
 * Manages dashboard selection for users with multiple roles
 * Coordinates between:
 * - useAuthProtection: Ensures user is authenticated
 * - useRoleDetection: Detects which roles user has
 * - Navigation logic: Handles auto-redirect for single role, manual selection for multiple
 */
export function DashboardSelector() {
  const navigate = useNavigate();
  
  // ============ Reusable Hooks ============
  // Protect this route - redirect to login if not authenticated
  useAuthProtection();
  
  // Detect user roles
  const { loading, hasHomeroomRole, hasSubjectRole } = useRoleDetection();

  // ============ Auto-redirect Logic ============
  /**
   * Auto-redirect if user has only one role
   * - Only one homeroom role → redirect to homeroom dashboard
   * - Only one subject role → redirect to subject dashboard
   * - Multiple roles → continue to show selection cards
   */
  useEffect(() => {
    if (!loading) {
      // Only one role detected - auto-redirect
      if (hasHomeroomRole && !hasSubjectRole) {
        navigate('/homeroom/dashboard', { replace: true });
      } else if (hasSubjectRole && !hasHomeroomRole) {
        navigate('/subject/dashboard', { replace: true });
      }
      // Both roles or no roles - continue to show this page
    }
  }, [loading, hasHomeroomRole, hasSubjectRole, navigate]);

  // ============ Event Handlers ============
  /**
   * Handle dashboard selection
   * Navigates to the selected dashboard type
   */
  const handleSelectDashboard = (type: 'homeroom' | 'subject') => {
    navigate(`/${type}/dashboard`, { replace: true });
  };

  // Loading state
  if (loading) {
    return <LoadingCard />;
  }

  // Single role auto-redirect handled in useEffect above
  // This component only renders if multiple roles or both exist

  return (
    <div className="flex justify-center items-center p-6 min-h-screen"
      style={{ backgroundImage: 'url(/background_login.jpg)' }}
      >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <DashboardHeader />

        {/* Dashboard Options */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Homeroom Teacher Dashboard */}
          {hasHomeroomRole && (
            <HomeroomDashboardCard
              onClick={() => handleSelectDashboard('homeroom')}
            />
          )}

          {/* Subject Teacher Dashboard */}
          {hasSubjectRole && (
            <SubjectDashboardCard
              onClick={() => handleSelectDashboard('subject')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardSelector;