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
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="spinner-dual">
          <div className="spinner-primary"></div>
          <div className="spinner-secondary"></div>
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
    <div className="flex justify-center items-center p-6 min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex justify-center items-center mb-6 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg">
            <span className="text-4xl">🎯</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Chọn Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Bạn vừa là Giáo viên chủ nhiệm vừa là Giáo viên bộ môn
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Vui lòng chọn dashboard bạn muốn xem
          </p>
        </div>

        {/* Dashboard Options */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Homeroom Teacher Dashboard */}
          {hasHomeroomRole && (
            <div
              onClick={() => handleSelectDashboard('homeroom')}
              className="overflow-hidden bg-white rounded-2xl border-2 border-transparent shadow-lg transition-all duration-300 transform cursor-pointer group hover:shadow-2xl hover:scale-105 hover:border-blue-500"
            >
              <div className="p-6 text-white bg-gradient-to-br from-blue-500 to-blue-600">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex justify-center items-center w-14 h-14 bg-white bg-opacity-20 rounded-xl">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <div className="flex justify-center items-center w-8 h-8 bg-white bg-opacity-20 rounded-full transition-all group-hover:bg-opacity-30">
                    <span className="text-xl text-white">→</span>
                  </div>
                </div>
                <h3 className="mb-2 text-2xl font-bold">Dashboard Chủ Nhiệm</h3>
                <p className="text-sm text-blue-100">
                  Quản lý lớp chủ nhiệm của bạn
                </p>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Theo dõi điểm danh học sinh</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Quản lý thông tin học sinh</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Thống kê chuyên cần theo tuần</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Quản lý khuôn mặt AI</span>
                  </li>
                </ul>
              </div>

              <div className="px-6 pb-6">
                <button className="px-6 py-3 w-full font-semibold text-white bg-blue-500 rounded-lg shadow-md transition-colors duration-200 hover:bg-blue-600 hover:shadow-lg">
                  Chọn Dashboard Chủ Nhiệm
                </button>
              </div>
            </div>
          )}

          {/* Subject Teacher Dashboard */}
          {hasSubjectRole && (
            <div
              onClick={() => handleSelectDashboard('subject')}
              className="overflow-hidden bg-white rounded-2xl border-2 border-transparent shadow-lg transition-all duration-300 transform cursor-pointer group hover:shadow-2xl hover:scale-105 hover:border-purple-500"
            >
              <div className="p-6 text-white bg-gradient-to-br from-purple-500 to-pink-500">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex justify-center items-center w-14 h-14 bg-white bg-opacity-20 rounded-xl">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="flex justify-center items-center w-8 h-8 bg-white bg-opacity-20 rounded-full transition-all group-hover:bg-opacity-30">
                    <span className="text-xl text-white">→</span>
                  </div>
                </div>
                <h3 className="mb-2 text-2xl font-bold">Dashboard Bộ Môn</h3>
                <p className="text-sm text-purple-100">
                  Phân tích điểm số các lớp bạn dạy
                </p>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Phân tích điểm số chuyên sâu</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Phân nhóm học lực chi tiết</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Học sinh cần quan tâm</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">So sánh giữa các lớp</span>
                  </li>
                </ul>
              </div>

              <div className="px-6 pb-6">
                <button className="px-6 py-3 w-full font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md transition-all duration-200 hover:from-purple-600 hover:to-pink-600 hover:shadow-lg">
                  Chọn Dashboard Bộ Môn
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            💡 <span className="font-medium">Lưu ý:</span> Bạn có thể chuyển đổi giữa các dashboard bất cứ lúc nào thông qua menu bên trái
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardSelector;

