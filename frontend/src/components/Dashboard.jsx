import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';
import AddStudentModal from './AddStudentModal';
import ReportView from './ReportView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import logger from "../utils/logger";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Camera, 
  Plus, 
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';

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
      logger.error('Error fetching stats:', error);
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Trang chủ</h1>
        <p className="text-gray-600">Tổng quan hệ thống SynapseS</p>
        {error && (
          <div className="p-3 text-yellow-700 bg-yellow-100 rounded-lg border border-yellow-400">
            {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng học sinh"
          value={stats.totalStudents}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Có mặt hôm nay"
          value={stats.presentToday}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Vắng mặt"
          value={stats.absentToday}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
        />
        <StatCard
          title="Tỷ lệ điểm danh"
          value={`${stats.attendanceRate}%`}
          icon={BarChart3}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Thao tác nhanh</span>
          </CardTitle>
          <CardDescription>
            Các chức năng chính của hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <QuickActionButton
              title="Điểm danh AI"
              description="Sử dụng camera để điểm danh tự động"
              icon={Camera}
              onClick={handleAIAttendance}
            />
            <QuickActionButton
              title="Thêm học sinh"
              description="Đăng ký học sinh mới"
              icon={Plus}
              onClick={() => setShowAddStudentModal(true)}
            />
            <QuickActionButton
              title="Xem báo cáo"
              description="Thống kê chi tiết điểm danh"
              icon={TrendingUp}
              onClick={() => setShowReportModal(true)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Hoạt động gần đây</span>
          </CardTitle>
          <CardDescription>
            Các hoạt động điểm danh mới nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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

const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const QuickActionButton = ({ title, description, icon: Icon, onClick }) => (
  <Button 
    variant="outline"
    onClick={onClick}
    className="h-auto p-6 flex flex-col items-start space-y-3 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
  >
    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-left">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </Button>
);

const ActivityItem = ({ time, message, type }) => {
  const typeConfig = {
    success: { color: 'text-green-600', bg: 'bg-green-50', icon: '✓' },
    info: { color: 'text-blue-600', bg: 'bg-blue-50', icon: 'ℹ' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '⚠' },
    error: { color: 'text-red-600', bg: 'bg-red-50', icon: '✗' }
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        {config.icon}
      </Badge>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{message}</span>
          <span className="text-xs text-gray-500 font-mono">{time}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;