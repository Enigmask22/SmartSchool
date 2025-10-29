import React, { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
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
import api from "../services/api";
import logger from "../utils/logger";

const Sidebar = ({
  currentView,
  setCurrentView,
  user,
  isOpen,
  setIsOpen,
  selectedDashboardType,
  onDashboardSwitch,
}) => {
  const { logout, isHomeroomTeacher, isSubjectTeacher, isAdmin } =
    useContext(AuthContext);
  const [hasBothRoles, setHasBothRoles] = useState(false);

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
      { id: "dashboard", label: "Trang chủ", icon: "dashboard" },
      {
        id: "personal-info",
        label: "Thông tin cá nhân",
        icon: "personal-info",
      },
    ];

    if (isAdmin()) {
      // Admin chỉ có các menu cấu hình và quản trị
      return [
        { id: "dashboard", label: "Dashboard Thống Kê", icon: "dashboard" },
        {
          id: "personal-info",
          label: "Thông tin cá nhân",
          icon: "personal-info",
        },
        { id: "continuous", label: "Điểm danh tự động", icon: "continuous" },
        {
          id: "class-management",
          label: "Quản lý học sinh",
          icon: "class-management",
        },
        {
          id: "admin-management",
          label: "Quản lý hệ thống",
          icon: "admin-management",
        },
        { id: "ui-demo", label: "UI Demo", icon: "dashboard" },
      ];
    } else if (selectedDashboardType === "homeroom") {
      // Dashboard chủ nhiệm - chỉ hiển thị menu chủ nhiệm (không có quản lý điểm)
      return [
        ...baseItems,
        { id: "students", label: "Học sinh lớp chủ nhiệm", icon: "students" },
        { id: "attendance", label: "Điểm danh lớp", icon: "attendance" },
        { id: "faces", label: "Quản lý khuôn mặt", icon: "faces" },
      ];
    } else if (selectedDashboardType === "subject") {
      // Dashboard bộ môn - chỉ hiển thị menu bộ môn
      return [
        { id: "dashboard", label: "Dashboard Phân Tích", icon: "dashboard" },
        {
          id: "personal-info",
          label: "Thông tin cá nhân",
          icon: "personal-info",
        },
        { id: "grades", label: "Quản lý điểm", icon: "grades" },
      ];
    } else {
      // Fallback: sử dụng role functions nếu chưa có selectedDashboardType
      if (isHomeroomTeacher()) {
        return [
          ...baseItems,
          { id: "students", label: "Học sinh lớp chủ nhiệm", icon: "students" },
          { id: "attendance", label: "Điểm danh lớp", icon: "attendance" },
          { id: "continuous", label: "Điểm danh tự động", icon: "continuous" },
          { id: "faces", label: "Quản lý khuôn mặt", icon: "faces" },
        ];
      } else if (isSubjectTeacher()) {
        return [
          { id: "dashboard", label: "Dashboard Phân Tích", icon: "dashboard" },
          {
            id: "personal-info",
            label: "Thông tin cá nhân",
            icon: "personal-info",
          },
          { id: "grades", label: "Quản lý điểm", icon: "grades" },
        ];
      } else {
        return baseItems;
      }
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
      logout();
    }
  };

  const handleMenuClick = (viewId) => {
    setCurrentView(viewId);
    // Close sidebar on mobile after clicking menu item
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
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-all duration-300 ease-in-out border-0 rounded-none
        ${isOpen ? "w-64" : "w-16"}
        ${!isOpen ? "-translate-x-full lg:translate-x-0" : "translate-x-0"}
      `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-blue-600">
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
          <div
            className={`p-4 border-b border-gray-200 bg-blue-50 ${
              !isOpen && "px-2"
            }`}
          >
            {isOpen ? (
              <div className="space-y-2">
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
            ) : (
              <div className="flex justify-center">
                <div className="flex justify-center items-center w-8 h-8 text-sm font-bold text-white bg-blue-600 rounded-full">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="overflow-y-auto flex-1 px-2 py-4 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={currentView === item.id ? "secondary" : "ghost"}
              onClick={() => handleMenuClick(item.id)}
              className={`
                w-full justify-start h-10 px-3 text-sm font-medium
                ${
                  currentView === item.id
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
          ))}

          {/* Dashboard Switch Button - Only show if user has both roles AND not admin */}
          {hasBothRoles && onDashboardSwitch && !isAdmin() && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  onDashboardSwitch();
                  if (window.innerWidth < 1024) {
                    setIsOpen(false);
                  }
                }}
                className={`
                  w-full justify-start h-10 px-3 text-sm font-medium
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
        </nav>

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
      </Card>

      {/* Mobile toggle button */}
      {!isOpen && (
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-30 text-white bg-blue-600 shadow-lg hover:bg-blue-700 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}
    </>
  );
};

export default Sidebar;
