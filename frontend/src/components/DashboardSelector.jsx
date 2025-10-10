import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DashboardSelector = ({ onSelectDashboard }) => {
  const [hasHomeroomRole, setHasHomeroomRole] = useState(false);
  const [hasSubjectRole, setHasSubjectRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRoles();
  }, []);

  const checkUserRoles = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra xem có phải giáo viên chủ nhiệm không
      try {
        const homeroomResponse = await api.getHomeroomClasses();
        if (homeroomResponse.success && homeroomResponse.data && homeroomResponse.data.length > 0) {
          setHasHomeroomRole(true);
        }
      } catch (error) {
        console.log('Không phải giáo viên chủ nhiệm');
      }

      // Kiểm tra xem có phải giáo viên bộ môn không
      try {
        const teacherResponse = await api.getTeacherInfo();
        if (teacherResponse.success && teacherResponse.data) {
          setHasSubjectRole(true);
        }
      } catch (error) {
        console.log('Không phải giáo viên bộ môn');
      }
      
    } catch (error) {
      console.error('Error checking user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDashboard = (type) => {
    onSelectDashboard(type);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-pink-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Nếu chỉ có 1 role, tự động chuyển
  if (hasHomeroomRole && !hasSubjectRole) {
    onSelectDashboard('homeroom');
    return null;
  }

  if (hasSubjectRole && !hasHomeroomRole) {
    onSelectDashboard('subject');
    return null;
  }

  // Nếu có cả 2 role, hiển thị lựa chọn
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg mb-6">
            <span className="text-4xl">🎯</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Chọn Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Bạn vừa là Giáo viên chủ nhiệm vừa là Giáo viên bộ môn
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Vui lòng chọn dashboard bạn muốn xem
          </p>
        </div>

        {/* Dashboard Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Homeroom Teacher Dashboard */}
          {hasHomeroomRole && (
            <div
              onClick={() => handleSelectDashboard('homeroom')}
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden border-2 border-transparent hover:border-blue-500"
            >
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                    <span className="text-white text-xl">→</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Dashboard Chủ Nhiệm</h3>
                <p className="text-blue-100 text-sm">
                  Quản lý lớp chủ nhiệm của bạn
                </p>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Theo dõi điểm danh học sinh</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Quản lý thông tin học sinh</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Thống kê chuyên cần theo tuần</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Quản lý khuôn mặt AI</span>
                  </li>
                </ul>
              </div>

              <div className="px-6 pb-6">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg">
                  Chọn Dashboard Chủ Nhiệm
                </button>
              </div>
            </div>
          )}

          {/* Subject Teacher Dashboard */}
          {hasSubjectRole && (
            <div
              onClick={() => handleSelectDashboard('subject')}
              className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden border-2 border-transparent hover:border-purple-500"
            >
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                    <span className="text-white text-xl">→</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Dashboard Bộ Môn</h3>
                <p className="text-purple-100 text-sm">
                  Phân tích điểm số các lớp bạn dạy
                </p>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Phân tích điểm số chuyên sâu</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Phân nhóm học lực chi tiết</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">Học sinh cần quan tâm</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-sm">So sánh giữa các lớp</span>
                  </li>
                </ul>
              </div>

              <div className="px-6 pb-6">
                <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                  Chọn Dashboard Bộ Môn
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            💡 <span className="font-medium">Lưu ý:</span> Bạn có thể chuyển đổi giữa các dashboard bất cứ lúc nào thông qua menu bên trái
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSelector;

