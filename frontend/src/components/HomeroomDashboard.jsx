import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const HomeroomDashboard = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [homeroomInfo, setHomeroomInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isHomeroomTeacher()) {
      fetchHomeroomData();
    }
  }, [isHomeroomTeacher]);

  useEffect(() => {
    if (isHomeroomTeacher() && selectedDate) {
      fetchAttendanceStats();
    }
  }, [selectedDate, isHomeroomTeacher]);

  const fetchHomeroomData = async () => {
    try {
      setLoading(true);
      
      // Fetch homeroom info
      const infoResponse = await api.request('/homeroom/info');
      if (infoResponse.success) {
        setHomeroomInfo(infoResponse.data);
      }

      // Fetch students
      const studentsResponse = await api.request('/homeroom/students');
      console.log('👥 Students response:', studentsResponse);
      if (studentsResponse.success) {
        console.log('👥 Students data:', studentsResponse.data);
        setStudents(studentsResponse.data || []);
      }

      // Fetch attendance stats for today
      await fetchAttendanceStats();
      
    } catch (error) {
      console.error('Error fetching homeroom data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await api.request(`/homeroom/attendance/stats?target_date=${selectedDate}`);
      if (response.success) {
        setAttendanceStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  if (!isHomeroomTeacher()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Bạn không phải là giáo viên chủ nhiệm</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!homeroomInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy thông tin lớp chủ nhiệm</h2>
          <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được phân công lớp chủ nhiệm</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Lớp chủ nhiệm: {homeroomInfo.class_name}
                </h1>
                <div className="mt-2 space-y-1">
                  <p className="text-lg text-gray-600">Khối: {homeroomInfo.grade}</p>
                  <p className="text-sm text-gray-500">Phòng học: {homeroomInfo.room_number}</p>
                  <p className="text-sm text-gray-500">Năm học: {homeroomInfo.academic_year}</p>
                  <p className="text-sm text-gray-500">Tổng số học sinh: {homeroomInfo.total_students}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="bg-blue-100 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800">Giáo viên chủ nhiệm</h3>
                  <p className="text-lg font-semibold text-blue-900">{homeroomInfo.teacher_name}</p>
                  <p className="text-sm text-blue-600">{homeroomInfo.teacher_code}</p>
                  {homeroomInfo.is_subject_teacher && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Giáo viên bộ môn ({homeroomInfo.subject_count} môn)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="px-4 mb-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
                Chọn ngày xem điểm danh:
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Attendance Stats */}
        {attendanceStats && (
          <div className="px-4 mb-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Thống kê điểm danh ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{attendanceStats.total_students}</div>
                    <div className="text-sm text-blue-800">Tổng số HS</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{attendanceStats.present_count}</div>
                    <div className="text-sm text-green-800">Có mặt</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{attendanceStats.absent_count}</div>
                    <div className="text-sm text-red-800">Vắng mặt</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late_count}</div>
                    <div className="text-sm text-yellow-800">Muộn</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{attendanceStats.attendance_rate}%</div>
                    <div className="text-sm text-purple-800">Tỷ lệ có mặt</div>
                  </div>
                </div>
                
                {attendanceStats.auto_checkin_count > 0 && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-indigo-600 mr-2">🤖</div>
                      <div>
                        <span className="font-medium text-indigo-800">
                          {attendanceStats.auto_checkin_count} học sinh
                        </span>
                        <span className="text-indigo-600"> đã điểm danh tự động bằng AI</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Students Overview */}
        <div className="px-4 mb-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Danh sách học sinh lớp ({students?.length || 0} học sinh)
              </h3>
            </div>
            <div className="p-6">
              {students && students.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.slice(0, 6).map((student) => (
                      <div key={student.student_id || student.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {(student.full_name || student.student_name || 'N/A').charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.full_name || student.student_name || 'Không có tên'}
                            </p>
                            <p className="text-xs text-gray-500">{student.student_id || student.student_code || 'N/A'}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`w-2 h-2 rounded-full ${
                                student.encoding_type === 'insightface' 
                                  ? 'bg-green-400' 
                                  : student.encoding_type === 'mediapipe' 
                                    ? 'bg-yellow-400' 
                                    : 'bg-red-400'
                              }`}></span>
                              <span className="text-xs text-gray-500">
                                {student.encoding_type === 'insightface' 
                                  ? 'AI Ready' 
                                  : student.encoding_type === 'mediapipe' 
                                    ? 'Backup AI' 
                                    : 'Chưa đăng ký'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {students.length > 6 && (
                    <div className="mt-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Xem tất cả {students.length} học sinh →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">👥</div>
                  <p className="text-gray-500">Chưa có dữ liệu học sinh</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Thao tác nhanh</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all">
                  <div className="mr-3 text-blue-500">📋</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Điểm danh thủ công</div>
                    <div className="text-xs text-gray-500">Cập nhật điểm danh cho lớp</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-green-500 hover:shadow-md transition-all">
                  <div className="mr-3 text-green-500">🎥</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Điểm danh AI</div>
                    <div className="text-xs text-gray-500">Bắt đầu camera AI</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-purple-500 hover:shadow-md transition-all">
                  <div className="mr-3 text-purple-500">🤖</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Quản lý khuôn mặt</div>
                    <div className="text-xs text-gray-500">Đăng ký/cập nhật AI</div>
                  </div>
                </button>
                
                {homeroomInfo.is_subject_teacher && (
                  <button className="flex items-center p-4 border border-gray-300 rounded-lg hover:border-orange-500 hover:shadow-md transition-all">
                    <div className="mr-3 text-orange-500">📝</div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">Quản lý điểm</div>
                      <div className="text-xs text-gray-500">Nhập điểm các môn</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeroomDashboard; 