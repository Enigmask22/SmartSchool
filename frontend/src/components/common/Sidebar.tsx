import { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import api from "@/utils/api";
import logger from "@/utils/logger";
import {
  ADMIN_ROUTES,
  HOMEROOM_ROUTES,
  SUBJECT_ROUTES,
  COMMON_ROUTES,
} from "@/utils/constants";

const Sidebar = ({
  user,
  isOpen,
  setIsOpen,
  selectedDashboardType,
  onDashboardSwitch,
}) => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('Sidebar must be used within AuthProvider');
  }
  const { logout, isHomeroomTeacher, isSubjectTeacher, isAdmin } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  const [hasBothRoles, setHasBothRoles] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const checkBothRoles = useCallback(async () => {
    if (!user) return;

    try {
      // Make both API calls in parallel for faster response
      const [homeroomResult, subjectResult] = await Promise.allSettled([
        api.getHomeroomClasses(),
        api.getTeacherInfo(),
      ]).then((results) => [results[0], results[1]]);

      let hasHomeroom = false;
      let hasSubject = false;

      // Check homeroom role
      if (
        homeroomResult.status === 'fulfilled' &&
        homeroomResult.value?.success &&
        homeroomResult.value?.data &&
        homeroomResult.value.data.length > 0
      ) {
        hasHomeroom = true;
      }

      // Check subject teacher role
      if (
        subjectResult.status === 'fulfilled' &&
        subjectResult.value?.success &&
        subjectResult.value?.data
      ) {
        hasSubject = true;
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
      dashboard: Home,
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
      logout: LogOut,
      switch: RefreshCw,
    };
    const IconComponent = iconMap[iconName] || Home;
    return <IconComponent className="w-5 h-5" />;
  };

  // Menu items based on selected dashboard type (ưu tiên selectedDashboardType hơn role functions)
  const getMenuItems = () => {
    const baseItems = [
      { label: "Tổng quan", icon: "dashboard", route: HOMEROOM_ROUTES.DASHBOARD },
    ];

    if (isAdmin()) {
      return [
        { label: "Tổng quan", icon: "dashboard", route: ADMIN_ROUTES.DASHBOARD },
        { label: "Điểm danh tự động", icon: "continuous", route: ADMIN_ROUTES.CONTINUOUS },
        { label: "Quản lý học sinh", icon: "class-management", route: ADMIN_ROUTES.CLASSES },
        { label: "Quản lý hệ thống", icon: "admin-management", route: ADMIN_ROUTES.MANAGEMENT },
      ];
    } else if (selectedDashboardType === "homeroom") {
      // Dashboard chủ nhiệm - chỉ hiển thị menu chủ nhiệm (không có quản lý điểm)
      return [
        ...baseItems,
        { label: "Học sinh lớp chủ nhiệm", icon: "students", route: HOMEROOM_ROUTES.STUDENTS },
        { label: "Điểm danh lớp", icon: "attendance", route: HOMEROOM_ROUTES.ATTENDANCE },
        { label: "Quản lý khuôn mặt", icon: "faces", route: HOMEROOM_ROUTES.FACES },
      ];
    } else if (selectedDashboardType === "subject") {
      // Dashboard bộ môn - chỉ hiển thị menu bộ môn
      return [
        { label: "Tổng quan", icon: "dashboard", route: SUBJECT_ROUTES.DASHBOARD },
        { label: "Quản lý điểm", icon: "grades", route: SUBJECT_ROUTES.GRADES },
      ];
    } else {
      // Fallback: sử dụng role functions nếu chưa có selectedDashboardType
      if (isHomeroomTeacher()) {
        return [
          ...baseItems,
          { label: "Học sinh lớp chủ nhiệm", icon: "students", route: HOMEROOM_ROUTES.STUDENTS },
          { label: "Điểm danh lớp", icon: "attendance", route: HOMEROOM_ROUTES.ATTENDANCE },
          { label: "Điểm danh tự động", icon: "continuous", route: HOMEROOM_ROUTES.CONTINUOUS },
          { label: "Quản lý khuôn mặt", icon: "faces", route: HOMEROOM_ROUTES.FACES },
        ];
      } else if (isSubjectTeacher()) {
        return [
          { label: "Dashboard Phân Tích", icon: "dashboard", route: SUBJECT_ROUTES.DASHBOARD },
          { label: "Quản lý điểm", icon: "grades", route: SUBJECT_ROUTES.GRADES },
        ];
      } else {
        return baseItems;
      }
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logout();
  };

  const handleMenuClick = (item) => {
    if (item.route) {
      navigate(item.route);
    }
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <Card
        className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-all duration-300 ease-in-out border-0 rounded-none flex flex-col
        ${isOpen ? "w-64" : "w-16"}
        ${!isOpen ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white bg-blue-600">
          {isOpen && (
            <div className="flex items-center space-x-2">
              <School className="w-6 h-6" />
              <h1 className="text-lg font-bold">SynapseS</h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-blue-700"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <button
            onClick={() => navigate(COMMON_ROUTES.PROFILE)}
            className={`w-full p-4 border-b border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors ${
              !isOpen && "px-2"
            }`}
          >
            {isOpen ? (
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2 flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.role === "admin"
                      ? "Quản trị viên"
                      : selectedDashboardType === "homeroom"
                      ? "Giáo viên chủ nhiệm"
                      : selectedDashboardType === "subject"
                      ? "Giáo viên bộ môn"
                      : user.role === "homeroom_teacher"
                      ? "Giáo viên chủ nhiệm"
                      : user.role === "teacher"
                      ? "Giáo viên bộ môn"
                      : "Nhân viên"}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <UserCircle className="w-10 h-10 text-blue-600" />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <UserCircle className="w-10 h-10 text-blue-600" />
              </div>
            )}
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.route;
            return (
            <Button
              key={item.route}
              variant={isActive ? "secondary" : "ghost"}
              onClick={() => handleMenuClick(item)}
              className={`
                w-full justify-start h-10 px-3 text-sm font-medium
                ${
                  isActive
                    ? "bg-blue-100 text-blue-900 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }
                ${!isOpen && "justify-center px-2"}
              `}
              title={!isOpen ? item.label : ""}
            >
              {getIcon(item.icon)}
              {isOpen && <span className="ml-3 truncate">{item.label}</span>}
            </Button>
            );
          })}
        </nav>

        {/* Bottom Section - Switch & Logout */}
        <div className="mt-auto">
          {/* Dashboard Switch Button - Only show if user has both roles AND not admin */}
          {hasBothRoles && onDashboardSwitch && !isAdmin() && (
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  onDashboardSwitch();
                  if (window.innerWidth < 1024) {
                    setIsOpen(false);
                  }
                }}
                className={`
                  w-full justify-start h-10 px-2 text-sm font-medium
                  bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800
                  ${!isOpen && "justify-center px-2"}
                `}
                title={!isOpen ? "Đổi Dashboard" : ""}
              >
                {getIcon("switch")}
                {isOpen && (
                  <span className="ml-3 truncate">
                    {selectedDashboardType === "homeroom"
                      ? "Chuyển sang Bộ môn"
                      : "Chuyển sang Chủ nhiệm"}
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`
              w-full justify-start h-10 px-3 text-sm font-medium text-red-600 hover:bg-red-50
              ${!isOpen && "justify-center px-2"}
            `}
            title={!isOpen ? "Đăng xuất" : ""}
          >
            {getIcon("logout")}
            {isOpen && <span className="ml-3">Đăng xuất</span>}
          </Button>
          </div>
        </div>
      </Card>

      {/* Mobile toggle button */}
      {!isOpen && (
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed z-30 text-white bg-blue-600 shadow-lg top-4 left-4 hover:bg-blue-700 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Logout confirmation dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đăng xuất</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn đăng xuất khỏi hệ thống? Mọi phiên làm việc hiện tại sẽ bị kết thúc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              Đăng xuất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Sidebar;