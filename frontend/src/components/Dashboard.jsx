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
        <div className="w-32 h-32 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-800">Trang chủ</h2>
        <p className="text-gray-600">Tổng quan hệ thống SynapseS</p>
        {error && (
          <div className="p-3 mt-2 text-yellow-700 bg-yellow-100 rounded border border-yellow-400">
            {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
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
      <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-xl font-semibold">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-xl font-semibold">Hoạt động gần đây</h3>
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
  <div className="p-6 bg-white rounded-lg shadow-md">
    <div className="flex items-center">
      <div className={`p-3 mr-4 text-white rounded-lg ${color}`}>
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
    className="p-4 text-left rounded-lg border-2 border-gray-200 transition-all duration-200 hover:border-blue-300 hover:shadow-md group"
  >
    <div className={`p-2 mb-3 text-white rounded-lg transition-transform ${color} w-fit group-hover:scale-110`}>
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
    <div className="flex items-center p-3 space-x-3 bg-gray-50 rounded-lg">
      <span className="font-mono text-sm text-gray-500">{time}</span>
      <span className={`text-sm ${typeColors[type]}`}>{message}</span>
    </div>
  );
};

export default Dashboard; 