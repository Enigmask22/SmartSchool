import { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Home,
  Users,
  Camera,
  Settings,
  LogOut,
  Menu,
  FileText,
  ClipboardList,
  Smile,
  MessageCircle,
  Cog,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  School,
  UserCircle,
  LayoutDashboard,
} from "lucide-react";
import api from "@/services/api";
import logger from "@/utils/logger";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({
  user,
  isOpen,
  setIsOpen,
  selectedDashboardType,
  onDashboardSwitch,
}) => {
  const { logout, isAdmin } = useContext(AuthContext);
  const [hasBothRoles, setHasBothRoles] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const checkBothRoles = useCallback(async () => {
    if (!user) return;

    try {
      let hasHomeroom = false;
      let hasSubject = false;

      // Check homeroom role
      try {
        const homeroomResponse = await api.getHomeroomClasses();
        if (
          homeroomResponse.success &&
          homeroomResponse.data &&
          homeroomResponse.data.length > 0
        ) {
          hasHomeroom = true;
        }
      } catch (error) {
        // Not a homeroom teacher
      }

      // Check subject teacher role
      try {
        const teacherResponse = await api.getTeacherInfo();
        if (teacherResponse.success && teacherResponse.data) {
          hasSubject = true;
        }
      } catch (error) {
        // Not a subject teacher
      }

      setHasBothRoles(hasHomeroom && hasSubject);
    } catch (error) {
      logger.error("Error checking roles:", error);
    }
  }, [user]);

  // Check if user has both roles
  useEffect(() => {
    checkBothRoles();
  }, [user, checkBothRoles]);

  // Icon mapping
  const getIcon = (iconName) => {
    const iconMap = {
      dashboard: LayoutDashboard,
      "personal-info": UserCircle,
      students: Users,
      attendance: ClipboardList,
      continuous: Camera,
      faces: Smile,
      feedback: MessageCircle,
      grades: FileText,
      "school-config": Settings,
      "class-management": School,
      "admin-management": Cog,
      "ui-demo": Cog,
      logout: LogOut,
      switch: RefreshCw,
    };
    const IconComponent = iconMap[iconName] || Home;
    return <IconComponent className="w-5 h-5 transition-colors" />;
  };

  // Menu items with proper routing paths
  const getMenuItems = () => {
    const profileItem = { 
      id: "personal-info", 
      label: "Thông tin cá nhân", 
      icon: "personal-info", 
      path: "/profile" 
    };

    if (isAdmin()) {
      return [
        { id: "dashboard", label: "Tổng quan", icon: "dashboard", path: "/admin/dashboard" },
        profileItem,
        { id: "admin-management", label: "Quản lý hệ thống", icon: "admin-management", path: "/admin/management" },
        { id: "class-management", label: "Quản lý lớp học", icon: "class-management", path: "/admin/classes" },
        { id: "continuous", label: "Điểm danh AI", icon: "continuous", path: "/admin/continuous" },
        { id: "ui-demo", label: "UI Demo", icon: "ui-demo", path: "/admin/ui-demo" },
      ];
    } 
    
    if (selectedDashboardType === "homeroom") {
      return [
        { id: "dashboard", label: "Trang chủ", icon: "dashboard", path: "/homeroom/dashboard" },
        profileItem,
        { id: "students", label: "Học sinh lớp chủ nhiệm", icon: "students", path: "/homeroom/students" },
        { id: "attendance", label: "Điểm danh lớp", icon: "attendance", path: "/homeroom/attendance" },
        { id: "faces", label: "Quản lý khuôn mặt", icon: "faces", path: "/homeroom/faces" },
        // { id: "continuous", label: "Camera AI", icon: "continuous", path: "/homeroom/continuous" },
        // { id: "grades", label: "Kết quả học tập", icon: "grades", path: "/homeroom/grades" },
      ];
    } 
    
    if (selectedDashboardType === "subject") {
      return [
        { id: "dashboard", label: "Tổng quan", icon: "dashboard", path: "/subject/dashboard" },
        profileItem,
        { id: "grades", label: "Quản lý điểm", icon: "grades", path: "/subject/grades" },
      ];
    }

    return [profileItem];
  };

  const menuItems = getMenuItems();

  // Helper to check active state
  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const handleSwitchDashboard = () => {
    onDashboardSwitch();
    const newType = selectedDashboardType === 'homeroom' ? 'subject' : 'homeroom';
    navigate(`/${newType}/dashboard`);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white z-50 
          transition-all duration-300 ease-in-out 
          border-r border-gray-200 flex flex-col
          ${isOpen ? "w-64" : "w-20"}
          ${!isOpen ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
        `}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 bg-blue-600 text-white">
          {isOpen ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <School className="w-6 h-6 shrink-0" />
              <span className="font-bold text-lg tracking-tight whitespace-nowrap">SynapseS</span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <School className="w-8 h-8" />
            </div>
          )}
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* User Profile Summary */}
        <div className="p-4 border-b border-gray-100 bg-slate-50/50">
          <div className={`flex items-center gap-3 ${!isOpen && "justify-center"}`}>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border-2 border-white shadow-sm">
              {user?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            
            {isOpen && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === "admin" ? "Quản trị viên" : 
                   selectedDashboardType === "homeroom" ? "Giáo viên chủ nhiệm" : 
                   selectedDashboardType === "subject" ? "Giáo viên bộ môn" : "Người dùng"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                  ${active 
                    ? "bg-blue-200 text-sky-700 shadow-sm border-r-2 border-sky-700" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                  ${!isOpen && "justify-center px-2"}
                `}
                title={!isOpen ? item.label : ""}
              >
                <div className={`${active ? "text-blue-600" : "text-slate-500"}`}>
                  {getIcon(item.icon)}
                </div>

                {isOpen && (
                  <span className="text-sm font-semibold truncate">
                    {item.label}
                  </span>
                )}

                {!isOpen && active && (
                  <div className="absolute right-1 top-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></div>
                )}
              </Link>
            );
          })}

          {/* Dashboard Switcher */}
          {hasBothRoles && onDashboardSwitch && !isAdmin() && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleSwitchDashboard}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100
                  ${!isOpen && "justify-center px-2"}
                `}
                title={!isOpen ? "Chuyển chế độ" : ""}
              >
                <RefreshCw className="w-5 h-5" />
                {isOpen && (
                  <span className="text-sm font-medium truncate">
                    {selectedDashboardType === "homeroom" ? "Chuyển sang Bộ môn" : "Chuyển sang Chủ nhiệm"}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
              text-red-600 hover:bg-red-50 hover:text-red-700
              ${!isOpen && "justify-center px-2"}
            `}
            title={!isOpen ? "Đăng xuất" : ""}
          >
            <LogOut className="w-5 h-5" />
            {isOpen && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      {!isOpen && (
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 bg-blue-600 text-white shadow-lg hover:bg-blue-700 lg:hidden rounded-full w-10 h-10"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;
