import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const ReportView = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0
  });
  
  const [timeRange, setTimeRange] = useState('today');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadReportData();
      loadClasses();
    }
  }, [isOpen, timeRange, classFilter]);

  if (!isOpen) return null;

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [statsResponse, attendanceResponse] = await Promise.all([
        ApiService.getAttendanceStats(),
        ApiService.getAttendance()
      ]);
      
      console.log('Debug - Stats response:', statsResponse);
      console.log('Debug - Attendance response:', attendanceResponse);
      
      // Extract data from API responses
      const statsData = statsResponse.success ? statsResponse.data : null;
      const attendanceData = attendanceResponse.success ? attendanceResponse.data : [];
      
      console.log('Debug - Extracted stats:', statsData);
      console.log('Debug - Extracted attendance:', attendanceData);
      
      if (statsData) {
        setStats({
          totalStudents: statsData.total_students || 0,
          presentToday: statsData.present_count || 0,
          absentToday: statsData.absent_count || 0,
          lateToday: statsData.late_count || 0,
          attendanceRate: statsData.attendance_rate || 0
        });
      } else {
        setStats({
          totalStudents: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          attendanceRate: 0
        });
      }
      
      setAttendanceData(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (error) {
      console.error('Error loading report data:', error);
      // Set mock data on error
      setStats({
        totalStudents: 150,
        presentToday: 142,
        absentToday: 6,
        lateToday: 2,
        attendanceRate: 94.7
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const students = await ApiService.getStudents({});
      const uniqueClasses = [...new Set(
        (Array.isArray(students.data) ? students.data : students)
          .map(student => student.class_name)
          .filter(Boolean)
      )];
      setClasses(uniqueClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const getFilteredAttendance = () => {
    let filtered = attendanceData;
    console.log('Debug - Raw attendance data:', attendanceData);
    console.log('Debug - Time range:', timeRange);
    console.log('Debug - Class filter:', classFilter);
    
    if (classFilter) {
      filtered = filtered.filter(record => 
        record.students?.class_name === classFilter
      );
    }
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Debug - Today date:', today);
    
    switch (timeRange) {
      case 'today':
        filtered = filtered.filter(record => {
          console.log('Debug - Record date:', record.date, 'vs Today:', today);
          return record.date === today;
        });
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(record => 
          new Date(record.date) >= weekAgo
        );
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(record => 
          new Date(record.date) >= monthAgo
        );
        break;
    }
    
    console.log('Debug - Filtered attendance:', filtered);
    return filtered;
  };

  const getAttendanceByStatus = () => {
    const filtered = getFilteredAttendance();
    const statusCounts = {
      present: 0,
      absent: 0,
      late: 0
    };
    
    filtered.forEach(record => {
      if (statusCounts.hasOwnProperty(record.status)) {
        statusCounts[record.status]++;
      }
    });
    
    return statusCounts;
  };

  const getClassAttendanceStats = () => {
    const filtered = getFilteredAttendance();
    const classStats = {};
    
    filtered.forEach(record => {
      const className = record.students?.class_name || 'Không rõ';
      if (!classStats[className]) {
        classStats[className] = {
          present: 0,
          absent: 0,
          late: 0,
          total: 0
        };
      }
      
      classStats[className][record.status]++;
      classStats[className].total++;
    });
    
    return Object.entries(classStats).map(([className, stats]) => ({
      className,
      ...stats,
      attendanceRate: stats.total > 0 ? ((stats.present + stats.late) / stats.total * 100).toFixed(1) : 0
    }));
  };

  const statusCounts = getAttendanceByStatus();
  const classStats = getClassAttendanceStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-7xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">📊 Báo cáo điểm danh</h2>
              <p className="text-purple-100 mt-1">Thống kê chi tiết về tình hình điểm danh</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-3xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">🔍 Bộ lọc</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khoảng thời gian
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="today">Hôm nay</option>
                  <option value="week">7 ngày qua</option>
                  <option value="month">30 ngày qua</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lớp học
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tất cả lớp</option>
                  {classes.map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Có mặt"
                  value={statusCounts.present}
                  icon="✅"
                  color="bg-green-500"
                  textColor="text-green-600"
                />
                <StatCard
                  title="Vắng mặt"
                  value={statusCounts.absent}
                  icon="❌"
                  color="bg-red-500"
                  textColor="text-red-600"
                />
                <StatCard
                  title="Đi muộn"
                  value={statusCounts.late}
                  icon="⏰"
                  color="bg-yellow-500"
                  textColor="text-yellow-600"
                />
                <StatCard
                  title="Tổng cộng"
                  value={statusCounts.present + statusCounts.absent + statusCounts.late}
                  icon="📊"
                  color="bg-purple-500"
                  textColor="text-purple-600"
                />
              </div>

              {/* Attendance Rate Chart */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">📈 Tỷ lệ điểm danh</h3>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-purple-600 mb-2">
                      {statusCounts.present + statusCounts.absent + statusCounts.late > 0 
                        ? ((statusCounts.present + statusCounts.late) / (statusCounts.present + statusCounts.absent + statusCounts.late) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-gray-600">Tỷ lệ có mặt + đi muộn</p>
                  </div>
                </div>
              </div>

              {/* Class Statistics */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">🏫 Thống kê theo lớp</h3>
                {classStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Có mặt</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vắng mặt</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đi muộn</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ (%)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classStats.map((stat) => (
                          <tr key={stat.className} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stat.className}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                              {stat.present}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              {stat.absent}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                              {stat.late}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className="bg-purple-600 h-2 rounded-full" 
                                    style={{ width: `${stat.attendanceRate}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{stat.attendanceRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu điểm danh trong khoảng thời gian được chọn
                  </div>
                )}
              </div>

              {/* Recent Attendance */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">🕒 Điểm danh gần đây</h3>
                {getFilteredAttendance().slice(0, 10).length > 0 ? (
                  <div className="space-y-3">
                    {getFilteredAttendance().slice(0, 10).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            record.status === 'present' ? 'bg-green-500' :
                            record.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900">{record.students?.full_name || 'Không rõ'}</p>
                            <p className="text-sm text-gray-500">{record.students?.class_name || 'Không rõ'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {record.status === 'present' ? 'Có mặt' :
                             record.status === 'late' ? 'Đi muộn' : 'Vắng mặt'}
                          </p>
                          <p className="text-xs text-gray-500">{record.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu điểm danh gần đây
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, textColor }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center">
      <div className={`${color} text-white p-3 rounded-lg mr-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  </div>
);

export default ReportView;
