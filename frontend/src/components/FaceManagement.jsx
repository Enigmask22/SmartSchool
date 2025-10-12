import React, { useState, useEffect, useContext } from 'react';
import ApiService from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const FaceManagement = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [aiStatus, setAiStatus] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  useEffect(() => {
    fetchStudentsData();
    setCurrentPage(1); // Reset to page 1 when class changes
  }, [selectedClass]);

  useEffect(() => {
    fetchAvailableClasses();
  }, [user]);

  // Fetch available classes based on user role
  const fetchAvailableClasses = async () => {
    try {
      console.log('👤 Face Management - User role check:', {
        user,
        isHomeroomTeacher: isHomeroomTeacher(),
        userRole: user?.role
      });

      let classesResponse;
      
      if (isHomeroomTeacher()) {
        console.log('📚 Fetching homeroom classes for face management...');
        // If homeroom teacher, only get their homeroom classes
        classesResponse = await ApiService.getHomeroomClasses();
        
        if (classesResponse.success && classesResponse.data) {
          // For homeroom classes, extract class_name from objects
          const classNames = classesResponse.data.map(cls => cls.class_name).sort();
          console.log('📚 Setting homeroom classes:', classNames);
          setAvailableClasses(classNames);
        } else {
          console.warn('📚 Invalid homeroom classes response:', classesResponse);
          setAvailableClasses([]);
        }
      } else {
        console.log('📚 Fetching all students to extract classes for admin...');
        // If admin, get all students and extract unique class names
        const studentsResponse = await ApiService.getStudents({});
        
        if (studentsResponse.success && studentsResponse.data) {
          // Extract unique class names from students
          const uniqueClasses = [...new Set(
            studentsResponse.data
              .map(student => student.class_name)
              .filter(className => className) // Remove null/undefined
          )].sort();
          
          console.log('📚 Extracted unique classes from students:', uniqueClasses);
          setAvailableClasses(uniqueClasses);
        } else {
          console.warn('📚 Invalid students response for classes:', studentsResponse);
          setAvailableClasses([]);
        }
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
      setAvailableClasses([]);
    }
  };

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If homeroom teacher but no class selected, don't fetch
      if (isHomeroomTeacher() && !selectedClass) {
        console.log('🚫 No class selected for homeroom teacher, skipping face management students fetch');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      let studentsResponse;
      
      if (isHomeroomTeacher()) {
        // If homeroom teacher, get only their homeroom students
        studentsResponse = await ApiService.getHomeroomStudents(selectedClass);
      } else {
        // If admin or other roles, get all students
        studentsResponse = await ApiService.getStudents({});
      }
      
      // Handle students response properly
      if (studentsResponse.success && studentsResponse.data) {
        let studentsData = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
        
        // Apply class filter for non-homeroom users
        if (!isHomeroomTeacher() && selectedClass) {
          studentsData = studentsData.filter(student => student.class_name === selectedClass);
        }
        
        // Filter chỉ hiển thị học sinh đang hoạt động (is_active !== false)
        studentsData = studentsData.filter(student => student.is_active !== false);
        
        // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
        studentsData = studentsData.sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });
        
        setStudents(studentsData);
      } else {
        setStudents([]);
      }
      
      // Log để debug
      console.log('Face Management Students data:', studentsResponse);
      
    } catch (error) {
      console.error('Error fetching students data:', error);
      setError('Không thể tải thông tin học sinh');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const statusResponse = await fetch(`${API_BASE_URL}/ai/status`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAiStatus(statusData.data);
      }
    } catch (error) {
      console.error('Error fetching AI status:', error);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchAIStatus(),
      fetchStudentsData()
    ]);
  };

  const deleteFaceEncoding = async (studentId, studentName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khuôn mặt đã đăng ký của ${studentName}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/student/${studentId}/encoding`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Xóa khuôn mặt thành công!');
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting face encoding:', error);
      alert('Có lỗi xảy ra khi xóa khuôn mặt');
    }
  };

  const reloadModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/reload-models`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Reload models thành công!');
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error reloading models:', error);
      alert('Có lỗi xảy ra khi reload models');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-32 h-32 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="face-management">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-800">Quản lý khuôn mặt AI</h2>
        <p className="text-gray-600">Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký</p>
        {error && (
          <div className="p-3 mt-2 text-red-700 bg-red-100 rounded border border-red-400">
            {error}
          </div>
        )}
      </div>

      {/* AI Status Card */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-xl font-semibold">Trạng thái hệ thống AI</h3>
        
        {aiStatus ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {aiStatus.service_status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
              </div>
              <div className="text-sm text-gray-600">Trạng thái service</div>
              <div className="mt-1 text-xs text-gray-500">{aiStatus.service_name}</div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {aiStatus.database_encodings || 0}
              </div>
              <div className="text-sm text-gray-600">Khuôn mặt đã đăng ký</div>
              <div className="mt-1 text-xs text-gray-500">Database: {aiStatus.database_encodings}, Local: {aiStatus.local_ai_encodings}</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {aiStatus.accuracy || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Độ chính xác</div>
              <div className="mt-1 text-xs text-gray-500">
                {aiStatus.similarity_threshold ? `Threshold: ${aiStatus.similarity_threshold}` : 'Advanced AI'}
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {aiStatus.sync_status === 'synced' ? '✅' : '⚠️'}
              </div>
              <div className="text-sm text-gray-600">Trạng thái đồng bộ</div>
              <div className="mt-1 text-xs text-gray-500 capitalize">{aiStatus.sync_status?.replace('_', ' ')}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Không thể tải thông tin AI status</div>
        )}

        <div className="mt-4">
          <button
            onClick={reloadModels}
            className="px-4 py-2 mr-3 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Reload Models
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Lớp
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Show placeholder for homeroom teachers, "Tất cả lớp" for others */}
              {isHomeroomTeacher() ? (
                <option value="">Chọn lớp chủ nhiệm</option>
              ) : (
                <option value="">Tất cả lớp</option>
              )}
              {availableClasses.map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                fetchAIStatus();
                fetchStudentsData();
              }}
              className="px-4 py-2 text-white bg-blue-600 rounded-md transition-colors hover:bg-blue-700"
            >
              Làm mới dữ liệu
            </button>
          </div>
        </div>
      </div>

      {/* Students with Face Registration */}
      <div className="overflow-hidden bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Học sinh đã đăng ký khuôn mặt</h3>
              <p className="mt-1 text-gray-600">
                Danh sách học sinh có thể được nhận diện bằng AI
                {selectedClass && ` - Lớp ${selectedClass}`}
              </p>
            </div>
            {students.length > pageSize && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Số lượng/trang:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase bg-gray-50 border-b">
          <div className="col-span-2">Mã HS</div>
          <div className="col-span-3">Họ tên</div>
          <div className="col-span-1">Lớp</div>
          <div className="col-span-4">Trạng thái khuôn mặt</div>
          <div className="col-span-2 text-center">Thao tác</div>
        </div>

        {/* Body */}
        <div className="divide-y divide-gray-200">
          {students.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              {isHomeroomTeacher() && !selectedClass ? (
                <div>
                  <div className="mb-4 text-6xl text-gray-400">🎯</div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Chọn lớp chủ nhiệm để xem dữ liệu</h3>
                  <p className="text-gray-500">Vui lòng chọn lớp từ dropdown phía trên</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-6xl text-gray-400">👤</div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Chưa có học sinh nào đăng ký khuôn mặt</h3>
                  <p className="text-gray-500">Hãy vào tab "Học sinh" để đăng ký khuôn mặt cho học sinh</p>
                </div>
              )}
            </div>
          ) : (
            (() => {
              // Apply pagination
              const startIndex = (currentPage - 1) * pageSize;
              const endIndex = startIndex + pageSize;
              const paginatedStudents = students.slice(startIndex, endIndex);
              
              return paginatedStudents.map((student) => (
              <div key={student.id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-gray-50">
                <div className="col-span-2 text-sm font-medium text-gray-900 truncate">
                  {student.student_id}
                </div>
                <div className="col-span-3 text-sm text-gray-900 truncate">
                  <div className="font-medium">{student.full_name}</div>
                </div>
                <div className="col-span-1 text-sm text-gray-900">
                  <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                    {student.class_name}
                  </span>
                </div>
                <div className="col-span-4 text-sm text-gray-900">
                  {(student.face_encoding || student.insightface_encoding) ? (
                    <span className="inline-flex items-center px-3 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                      ✅ Đã đăng ký {student.insightface_encoding ? '(InsightFace)' : '(MediaPipe)'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 text-xs text-red-800 bg-red-100 rounded-full">
                      ❌ Chưa đăng ký
                    </span>
                  )}
                </div>
                <div className="flex col-span-2 justify-center text-sm font-medium">
                  {(student.face_encoding || student.insightface_encoding) ? (
                    <button 
                      onClick={() => deleteFaceEncoding(student.id, student.full_name)}
                      className="inline-flex gap-1 items-center px-3 py-1 text-xs text-red-700 bg-red-100 rounded transition-colors hover:bg-red-200"
                      title="Xóa khuôn mặt đã đăng ký"
                    >
                      🗑️ Xóa
                    </button>
                  ) : (
                    <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded">
                      Không có dữ liệu
                    </span>
                  )}
                </div>
              </div>
            ));
            })()
          )}
        </div>
        
        {/* Pagination Controls */}
        {(() => {
          const totalStudents = students.length;
          const totalPages = Math.ceil(totalStudents / pageSize);
          
          if (totalPages <= 1) return null;
          
          return (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="text-sm text-gray-700">
                  Hiển thị <span className="font-semibold">{((currentPage - 1) * pageSize) + 1}</span> đến <span className="font-semibold">{Math.min(currentPage * pageSize, totalStudents)}</span> trong tổng số <span className="font-semibold">{totalStudents}</span> học sinh
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Trước
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
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Instructions */}
      <div className="p-6 mt-6 bg-blue-50 rounded-lg">
        <h4 className="mb-2 text-lg font-semibold text-blue-800">Hướng dẫn sử dụng</h4>
        <div className="space-y-1 text-blue-700">
          <p>• Để đăng ký khuôn mặt cho học sinh, vào tab "Học sinh" và bấm nút "Đăng ký mặt"</p>
          <p>• Hệ thống sẽ mở camera để chụp ảnh khuôn mặt và lưu vào database</p>
          <p>• Sau khi đăng ký, học sinh có thể được nhận diện tự động trong chức năng điểm danh</p>
          <p>• Sử dụng nút "Reload Models" để cập nhật lại mô hình AI sau khi có thay đổi</p>
        </div>
      </div>
    </div>
  );
};

export default FaceManagement; 