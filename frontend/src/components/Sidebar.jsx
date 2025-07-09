import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ currentView, setCurrentView, user, isOpen, setIsOpen }) => {
  const { logout, isTeacher, isHomeroomTeacher, isSubjectTeacher, isAdmin, hasRole } = useContext(AuthContext);
  
  // Menu items based on user role (đồng bộ với Header)
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Trang chủ', icon: '🏠' }
    ];

    if (isAdmin()) {
      // Admin có tất cả menu bao gồm cấu hình học tập
      return [
        ...baseItems,
        { id: 'students', label: 'Học sinh', icon: '👥' },
        { id: 'attendance', label: 'Điểm danh', icon: '📋' },
        { id: 'continuous', label: 'Điểm danh tự động', icon: '🎥' },
        { id: 'faces', label: 'Quản lý khuôn mặt', icon: '🤖' },
        // { id: 'feedback', label: 'AI Nhận xét', icon: '💬' }, // Tạm ẩn AI Nhận xét
        { id: 'grades', label: 'Quản lý điểm', icon: '📝' },
        { id: 'school-config', label: 'Cấu hình học tập', icon: '⚙️' },
        { id: 'admin-management', label: 'Quản trị hệ thống', icon: '🛠️' },
      ];
    } else if (isHomeroomTeacher()) {
      // Giáo viên chủ nhiệm - không có cấu hình học tập
      const homeroomMenus = [
        ...baseItems,
        { id: 'students', label: 'Học sinh lớp chủ nhiệm', icon: '👥' },
        { id: 'attendance', label: 'Điểm danh lớp', icon: '📋' },
        { id: 'continuous', label: 'Điểm danh tự động', icon: '🎥' },
        { id: 'faces', label: 'Quản lý khuôn mặt', icon: '🤖' },
        // { id: 'feedback', label: 'AI Nhận xét', icon: '💬' }, // Tạm ẩn AI Nhận xét
      ];
      
      // Thêm quản lý điểm nếu họ cũng là subject teacher
      homeroomMenus.push({ id: 'grades', label: 'Quản lý điểm', icon: '📝' });
      
      return homeroomMenus;
    } else if (isSubjectTeacher()) {
      // Giáo viên bộ môn - chỉ có menu Quản lý điểm
      return [
        { id: 'grades', label: 'Quản lý điểm', icon: '📝' }
      ];
    } else {
      // Default fallback
      return baseItems;
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
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
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        ${!isOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      `}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white bg-blue-600 border-b border-gray-200">
          {isOpen && (
            <div className="flex items-center">
              <h1 className="text-lg font-bold">Smart School</h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg transition-colors hover:bg-blue-700"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className={`p-4 border-b border-gray-200 bg-blue-50 ${!isOpen && 'px-2'}`}>
            {isOpen ? (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name}
                </div>
                <div className="text-xs text-gray-500">
                  {user.role === 'admin' 
                    ? 'Quản trị viên' 
                    : user.role === 'homeroom_teacher' 
                      ? 'Giáo viên chủ nhiệm' 
                      : user.role === 'teacher' 
                        ? 'Giáo viên bộ môn' 
                        : 'Nhân viên'}
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
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`
                w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${currentView === item.id
                  ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
                ${!isOpen && 'justify-center px-2'}
              `}
              title={!isOpen ? item.label : ''}
            >
              <span className="text-lg">{item.icon}</span>
              {isOpen && (
                <span className="ml-3 truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors
              ${!isOpen && 'justify-center px-2'}
            `}
            title={!isOpen ? 'Đăng xuất' : ''}
          >
            <span className="text-lg">🚪</span>
            {isOpen && (
              <span className="ml-3">Đăng xuất</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-30 p-2 text-white bg-blue-600 rounded-lg shadow-lg transition-colors lg:hidden hover:bg-blue-700"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
};

export default Sidebar; 