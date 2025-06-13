import React from 'react';

const Header = ({ currentView, setCurrentView, user }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: '🏠' },
    { id: 'students', label: 'Học sinh', icon: '👥' },
    { id: 'attendance', label: 'Điểm danh', icon: '📋' },
    { id: 'camera', label: 'AI Camera', icon: '📷' },
    { id: 'continuous', label: 'Điểm danh tự động', icon: '🎥' },
    { id: 'faces', label: 'Quản lý khuôn mặt', icon: '🤖' },
  ];

  const handleMenuClick = (viewId) => {
    setCurrentView(viewId);
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Smart School System</h1>
          </div>
          
          <nav className="hidden md:flex space-x-6">
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
                <button className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <nav className="md:hidden mt-3 flex space-x-2 overflow-x-auto">
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