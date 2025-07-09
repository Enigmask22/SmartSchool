import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import AddStudentModal from './AddStudentModal';
import ReportView from './ReportView';

const Dashboard = ({ setCurrentView }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsData = await ApiService.getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Không thể tải dữ liệu từ server. Đang hiển thị dữ liệu mẫu.');
      
      // Fallback to mock data
      setStats({
        totalStudents: 150,
        presentToday: 142,
        absentToday: 8,
        attendanceRate: 94.7
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation to AI attendance
  const handleAIAttendance = () => {
    // Navigate to continuous recognition page
    if (setCurrentView) {
      setCurrentView('continuous');
    }
  };

  // Handle add student success
  const handleAddStudentSuccess = () => {
    fetchStats(); // Refresh dashboard stats
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Trang chủ</h2>
        <p className="text-gray-600">Tổng quan hệ thống Smart School</p>
        {error && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Tổng học sinh"
          value={stats.totalStudents}
          icon="👥"
          color="bg-blue-500"
        />
        <StatCard
          title="Có mặt hôm nay"
          value={stats.presentToday}
          icon="✅"
          color="bg-green-500"
        />
        <StatCard
          title="Vắng mặt"
          value={stats.absentToday}
          icon="❌"
          color="bg-red-500"
        />
        <StatCard
          title="Tỷ lệ điểm danh"
          value={`${stats.attendanceRate}%`}
          icon="📊"
          color="bg-purple-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            title="Điểm danh AI"
            description="Sử dụng camera để điểm danh tự động"
            icon="📷"
            color="bg-blue-600"
            onClick={handleAIAttendance}
          />
          <QuickActionButton
            title="Thêm học sinh"
            description="Đăng ký học sinh mới"
            icon="➕"
            color="bg-green-600"
            onClick={() => setShowAddStudentModal(true)}
          />
          <QuickActionButton
            title="Xem báo cáo"
            description="Thống kê chi tiết điểm danh"
            icon="📈"
            color="bg-purple-600"
            onClick={() => setShowReportModal(true)}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Hoạt động gần đây</h3>
        <div className="space-y-3">
          <ActivityItem
            time="9:30 AM"
            message="Nguyễn Văn An đã được điểm danh bằng AI"
            type="success"
          />
          <ActivityItem
            time="9:25 AM"
            message="Trần Thị Bình đã được điểm danh thủ công"
            type="info"
          />
          <ActivityItem
            time="9:20 AM"
            message="Lê Minh Châu vắng mặt không phép"
            type="warning"
          />
        </div>
      </div>

      {/* Modals */}
      <AddStudentModal 
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onSuccess={handleAddStudentSuccess}
      />
      
      <ReportView 
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center">
      <div className={`${color} text-white p-3 rounded-lg mr-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

const QuickActionButton = ({ title, description, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
  >
    <div className={`${color} text-white p-2 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform`}>
      <span className="text-xl">{icon}</span>
    </div>
    <h4 className="font-semibold text-gray-800">{title}</h4>
    <p className="text-sm text-gray-600">{description}</p>
  </button>
);

const ActivityItem = ({ time, message, type }) => {
  const typeColors = {
    success: 'text-green-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500 font-mono">{time}</span>
      <span className={`text-sm ${typeColors[type]}`}>{message}</span>
    </div>
  );
};

export default Dashboard; 