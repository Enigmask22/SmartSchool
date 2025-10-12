import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const HomeroomDashboard = () => {
  const { isHomeroomTeacher } = useContext(AuthContext);
  const [homeroomInfo, setHomeroomInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // State cho modal xem tất cả học sinh
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(12); // Hiển thị 12 học sinh mỗi trang

  const fetchAttendanceStats = useCallback(async () => {
    try {
      const response = await api.request(`/homeroom/attendance/stats?target_date=${selectedDate}`);
      if (response.success) {
        setAttendanceStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  }, [selectedDate]);

  const fetchHomeroomData = useCallback(async () => {
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
        // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
        const sortedStudents = (studentsResponse.data || []).sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });
        setStudents(sortedStudents);
      }

      // Fetch attendance stats for today
      await fetchAttendanceStats();
      
    } catch (error) {
      console.error('Error fetching homeroom data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAttendanceStats]);

  useEffect(() => {
    if (isHomeroomTeacher()) {
      fetchHomeroomData();
    }
  }, [isHomeroomTeacher, fetchHomeroomData]);

  useEffect(() => {
    if (isHomeroomTeacher() && selectedDate) {
      fetchAttendanceStats();
    }
  }, [selectedDate, isHomeroomTeacher, fetchAttendanceStats]);

  // Handler cho việc mở modal xem tất cả học sinh
  const handleViewAllStudents = () => {
    setShowAllStudents(true);
    setCurrentPage(1);
  };

  // Handler cho việc đóng modal
  const handleCloseAllStudents = () => {
    setShowAllStudents(false);
    setCurrentPage(1);
  };

  // Logic phân trang
  const totalPages = Math.ceil(students.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  // Handler cho việc thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of modal
    const modalContent = document.querySelector('.students-modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  };

  if (!isHomeroomTeacher()) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Không có quyền truy cập</h2>
          <p className="text-gray-600">Bạn không phải là giáo viên chủ nhiệm</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-32 h-32 rounded-full border-b-2 border-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (!homeroomInfo) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Không tìm thấy thông tin lớp chủ nhiệm</h2>
          <p className="text-gray-600">Vui lòng liên hệ quản trị viên để được phân công lớp chủ nhiệm</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="p-6 bg-white rounded-lg border-4 border-gray-200 border-dashed">
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
                <div className="p-4 bg-blue-100 rounded-lg">
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
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <label htmlFor="date-select" className="text-sm font-medium text-gray-700">
                Chọn ngày xem điểm danh:
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Attendance Stats */}
        {attendanceStats && (
          <div className="px-4 mb-6 sm:px-0">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Thống kê điểm danh ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div className="p-4 text-center bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{attendanceStats.total_students}</div>
                    <div className="text-sm text-blue-800">Tổng số HS</div>
                  </div>
                  <div className="p-4 text-center bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{attendanceStats.present_count}</div>
                    <div className="text-sm text-green-800">Có mặt</div>
                  </div>
                  <div className="p-4 text-center bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{attendanceStats.absent_count}</div>
                    <div className="text-sm text-red-800">Vắng mặt</div>
                  </div>
                  <div className="p-4 text-center bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late_count}</div>
                    <div className="text-sm text-yellow-800">Muộn</div>
                  </div>
                  <div className="p-4 text-center bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{attendanceStats.attendance_rate}%</div>
                    <div className="text-sm text-purple-800">Tỷ lệ có mặt</div>
                  </div>
                </div>
                
                {attendanceStats.auto_checkin_count > 0 && (
                  <div className="p-4 mt-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="mr-2 text-indigo-600">🤖</div>
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Danh sách học sinh lớp ({students?.length || 0} học sinh)
              </h3>
            </div>
            <div className="p-6">
              {students && students.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {students.slice(0, 6).map((student) => (
                      <div key={student.student_id || student.id} className="p-4 rounded-lg border transition-shadow hover:shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex justify-center items-center w-10 h-10 bg-gray-300 rounded-full">
                            <span className="text-sm font-medium text-gray-700">
                              {(student.full_name || student.student_name || 'N/A').charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.full_name || student.student_name || 'Không có tên'}
                            </p>
                            <p className="text-xs text-gray-500">{student.student_id || student.student_code || 'N/A'}</p>
                            <div className="flex items-center mt-1 space-x-2">
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
                      <button 
                        onClick={handleViewAllStudents}
                        className="text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-800 hover:underline"
                      >
                        Xem tất cả {students.length} học sinh →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="mb-4 text-4xl text-gray-400">👥</div>
                  <p className="text-gray-500">Chưa có dữ liệu học sinh</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Thao tác nhanh</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <button className="flex items-center p-4 rounded-lg border border-gray-300 transition-all hover:border-blue-500 hover:shadow-md">
                  <div className="mr-3 text-blue-500">📋</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Điểm danh thủ công</div>
                    <div className="text-xs text-gray-500">Cập nhật điểm danh cho lớp</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 rounded-lg border border-gray-300 transition-all hover:border-green-500 hover:shadow-md">
                  <div className="mr-3 text-green-500">🎥</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Điểm danh AI</div>
                    <div className="text-xs text-gray-500">Bắt đầu camera AI</div>
                  </div>
                </button>
                
                <button className="flex items-center p-4 rounded-lg border border-gray-300 transition-all hover:border-purple-500 hover:shadow-md">
                  <div className="mr-3 text-purple-500">🤖</div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Quản lý khuôn mặt</div>
                    <div className="text-xs text-gray-500">Đăng ký/cập nhật AI</div>
                  </div>
                </button>
                
                {homeroomInfo.is_subject_teacher && (
                  <button className="flex items-center p-4 rounded-lg border border-gray-300 transition-all hover:border-orange-500 hover:shadow-md">
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

      {/* Modal xem tất cả học sinh */}
      {showAllStudents && (
        <div className="overflow-y-auto fixed inset-0 z-50">
          <div className="flex justify-center items-center px-4 pt-4 pb-20 min-h-screen text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleCloseAllStudents}
            ></div>

            {/* Modal panel */}
            <div className="inline-block overflow-hidden text-left align-bottom bg-white rounded-lg shadow-xl transition-all transform sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Header */}
              <div className="px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Danh sách tất cả học sinh lớp {homeroomInfo?.class_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Tổng cộng {students.length} học sinh
                    </p>
                  </div>
                  <button
                    onClick={handleCloseAllStudents}
                    className="text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <span className="sr-only">Đóng</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="students-modal-content max-h-[60vh] overflow-y-auto">
                <div className="p-6">
                  {currentStudents.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {currentStudents.map((student) => (
                          <div key={student.student_id || student.id} className="p-4 rounded-lg border transition-shadow hover:shadow-md">
                            <div className="flex items-center space-x-3">
                              <div className="flex justify-center items-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                                <span className="text-sm font-bold text-white">
                                  {(student.full_name || student.student_name || 'N/A').charAt(0)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {student.full_name || student.student_name || 'Không có tên'}
                                </p>
                                <p className="text-xs text-gray-500">{student.student_id || student.student_code || 'N/A'}</p>
                                <div className="flex items-center mt-1 space-x-2">
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
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mb-4 text-4xl text-gray-400">👥</div>
                      <p className="text-gray-500">Không có học sinh nào</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      Hiển thị <span className="font-semibold">{startIndex + 1}</span> đến <span className="font-semibold">{Math.min(endIndex, students.length)}</span> trong tổng số <span className="font-semibold">{students.length}</span> học sinh
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                          const showPage = 
                            pageNum === 1 || 
                            pageNum === totalPages || 
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                          
                          if (!showPage) {
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                              return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                            }
                            return null;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeroomDashboard; 