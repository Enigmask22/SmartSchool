import { useState, useContext, useEffect } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/common/Sidebar";
import { AuthContext } from "@/contexts/AuthContext";

const MainLayout = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('MainLayout must be used within AuthProvider');
  }
  const { user, loading, isAuthenticated, isAdmin } = context;
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDashboardType, setSelectedDashboardType] = useState<'homeroom' | 'subject' | null>(null);
  const location = useLocation();

  // Determine dashboard type from URL path
  const getDashboardTypeFromPath = () => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/homeroom')) return 'homeroom';
    if (location.pathname.startsWith('/subject')) return 'subject';
    return null;
  };

  // Sync selectedDashboardType with URL path
  useEffect(() => {
    const dashboardTypeFromUrl = getDashboardTypeFromPath();
    if (dashboardTypeFromUrl && dashboardTypeFromUrl !== 'admin') {
      setSelectedDashboardType(dashboardTypeFromUrl as 'homeroom' | 'subject');
    }
  }, [location.pathname]);

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50"
      style={{backgroundImage: 'url(/background-login.jpg)'}}>
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

  // Determine current dashboard type for Sidebar (prefer URL, fallback to state)
  const currentDashboardType = getDashboardTypeFromPath() || selectedDashboardType || (isAdmin() ? 'admin' : 'subject');

  const handleDashboardSwitch = () => {
    const newType = selectedDashboardType === 'homeroom' ? 'subject' : 'homeroom';
    setSelectedDashboardType(newType);
    // Navigate to the new dashboard
    navigate(`/${newType}/dashboard`);
  };

  return (
    <div className="flex h-screen bg-gray-50 App">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
        selectedDashboardType={currentDashboardType}
        onDashboardSwitch={handleDashboardSwitch}
      />
      <main
        className={`
          flex-1 transition-all duration-300 overflow-auto bg-white
          ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}
          ml-0
        `}
      >
        <div className="px-4 lg:px-6 bg-gray-50">
          <Outlet context={{ dashboardType: currentDashboardType }} />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;