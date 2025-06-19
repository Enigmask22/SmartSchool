import React from 'react';

const Header = ({ currentView, setCurrentView, user }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: '🏠' },
    { id: 'students', label: 'Học sinh', icon: '👥' },
    { id: 'attendance', label: 'Điểm danh', icon: '📋' },
    // { id: 'camera', label: 'AI Camera', icon: '📷' },
    { id: 'continuous', label: 'Điểm danh tự động', icon: '🎥' },
    { id: 'faces', label: 'Quản lý khuôn mặt', icon: '🤖' },
    { id: 'feedback', label: 'AI Nhận xét', icon: '💬' },
    { id: 'school-config', label: 'Cấu hình học tập', icon: '⚙️' },
  ];

  const handleMenuClick = (viewId) => {
    setCurrentView(viewId);
  };

  return (
    <header className="text-white bg-blue-600 shadow-lg">
      <div className="container px-4 py-3 mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Smart School System</h1>
          </div>
          
          <nav className="hidden space-x-6 md:flex">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm">Xin chào, {user.full_name}</span>
                <button className="px-3 py-1 text-sm bg-blue-700 rounded hover:bg-blue-800">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button className="px-3 py-1 text-sm bg-blue-700 rounded hover:bg-blue-800">
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <nav className="flex overflow-x-auto mt-3 space-x-2 md:hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                currentView === item.id
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header; 