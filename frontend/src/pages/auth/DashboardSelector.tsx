/**
 * DashboardSelector.jsx - Dashboard Role Selection Page Component
 * 
 * Main dashboard selector page component
 * - Manages role checking and auto-redirect via useDashboardSelector hook
 * - Displays dashboard options for teachers with multiple roles
 * - Handles dashboard selection navigation
 */

import { useDashboardSelector } from '@/hooks/useDashboardSelector';
import {
  LoadingCard,
  DashboardHeader,
  HomeroomDashboardCard,
  SubjectDashboardCard,
} from '@/components/dashboard-selector';

/**
 * DashboardSelector - Role-based dashboard selection component
 * 
 * Auto-redirects if user has only one role
 * Shows dashboard options if user has multiple roles
 * Shows loading state while checking roles
 */
export function DashboardSelector() {
  const {
    loading,
    hasHomeroomRole,
    hasSubjectRole,
    handleSelectDashboard,
  } = useDashboardSelector();

  // Loading state
  if (loading) {
    return <LoadingCard />;
  }

  // Single role auto-redirect handled in hook
  // This component only renders if multiple roles exist

  return (
    <div className="flex justify-center items-center p-6 min-h-screen bg-gray-50">
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

