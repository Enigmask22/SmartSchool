import { useState, useContext } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/common/Sidebar";
import { AuthContext } from "@/contexts/AuthContext";

const MainLayout = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('MainLayout must be used within AuthProvider');
  }
  const { user, loading, isAuthenticated, isAdmin } = context;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDashboardType, setSelectedDashboardType] = useState<'homeroom' | 'subject' | null>(null);
  const location = useLocation();

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Protect routes
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to appropriate dashboard from root
  if (location.pathname === "/") {
    if (isAdmin()) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (!selectedDashboardType) {
      return <Navigate to="/select-dashboard" replace />;
    } else {
      return <Navigate to={`/${selectedDashboardType}/dashboard`} replace />;
    }
  }

  // Determine dashboard type from URL path if not set
  const getDashboardTypeFromPath = () => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/homeroom')) return 'homeroom';
    if (location.pathname.startsWith('/subject')) return 'subject';
    // If on profile or other common routes, use the selected dashboard type or default to subject/homeroom
    return selectedDashboardType || (isAdmin() ? 'admin' : 'subject');
  };

  const dashboardType = getDashboardTypeFromPath();

  return (
    <div className="flex h-screen bg-gray-50 App">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
        selectedDashboardType={dashboardType}
        // Pass a function to switch context if needed
        onDashboardSwitch={() => setSelectedDashboardType(prev => (prev === 'homeroom' ? 'subject' : 'homeroom'))}
      />
      <main
        className={`
          flex-1 transition-all duration-300 overflow-auto bg-white
          ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}
          ml-0
        `}
      >
        <div className="p-4 lg:p-6">
          <Outlet context={{ dashboardType }} />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;