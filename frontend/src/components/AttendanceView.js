import React, { useState, useEffect, useContext } from 'react';
import ApiService from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const AttendanceView = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [classes, setClasses] = useState([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  
  // Edit states
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // View mode toggle
  const [showFullList, setShowFullList] = useState(true);

  useEffect(() => {
    loadAttendanceData();
    loadStats();
  }, [selectedDate, selectedClass, selectedStatus, page, showFullList]);

  // Load classes when user changes (for role-based filtering)
  useEffect(() => {
    loadClasses();
  }, [user]);

  // Initial load
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      console.log('📚 Loading classes for attendance filter...', {
        user,
        isHomeroomTeacher: isHomeroomTeacher(),
        userRole: user?.role
      });

      let classesResponse;
      
      if (isHomeroomTeacher()) {
        console.log('📚 Fetching homeroom classes for attendance...');
        // If homeroom teacher, only get their homeroom classes
        classesResponse = await ApiService.getHomeroomClasses();
        
        if (classesResponse.success && classesResponse.data) {
          const classNames = classesResponse.data.map(cls => cls.class_name).sort();
          console.log('📚 Setting homeroom classes:', classNames);
          setClasses(classNames);
        } else {
          console.warn('📚 Invalid homeroom classes response:', classesResponse);
          setClasses([]);
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
          setClasses(uniqueClasses);
        } else {
          console.warn('📚 Invalid students response for classes:', studentsResponse);
          setClasses([]);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    console.log('🔍 Loading attendance data...', { selectedDate, selectedClass, selectedStatus, page, showFullList });
    try {
      // If homeroom teacher but no class selected, don't fetch
      if (isHomeroomTeacher() && !selectedClass) {
        console.log('🚫 No class selected for homeroom teacher, skipping attendance fetch');
        setAttendanceRecords([]);
        setStats({ total_students: 0, present_count: 0, absent_count: 0, late_count: 0 });
        setLoading(false);
        return;
      }
      
      if (showFullList) {
        // Use full list API - shows all students with their attendance status
        const response = await ApiService.getFullAttendanceList(selectedDate, selectedClass);
        if (response.success) {
          let filteredData = response.data || [];
          
          // Apply status filter if specified
          if (selectedStatus) {
            filteredData = filteredData.filter(record => record.status === selectedStatus);
          }
          
          setAttendanceRecords(filteredData);
          setTotal(filteredData.length);
          
          // Calculate stats from full list data - but use full data not filtered data
          const fullData = response.data || [];
          console.log('📊 Calculating stats from full data:', fullData);
          const calculatedStats = calculateStatsFromData(fullData);
          console.log('📊 Calculated stats:', calculatedStats);
          setStats(calculatedStats);
        }
      } else {
        // Use existing logic for showing only students who have attendance records
        const params = {
          page: page,
          page_size: pageSize,
          date_from: selectedDate,
          date_to: selectedDate,
        };

        if (selectedClass) {
          // For class filter, we need to use today's attendance endpoint
          // because the main endpoint doesn't have direct class filtering
          if (selectedDate === new Date().toISOString().split('T')[0]) {
            const response = await ApiService.getTodayAttendance(selectedClass);
            if (response.success) {
              let filteredData = response.data || [];
              
              if (selectedStatus) {
                filteredData = filteredData.filter(record => record.status === selectedStatus);
              }
              
              setAttendanceRecords(filteredData);
              setTotal(filteredData.length);
            }
          } else {
            // For other dates, get all records and filter by class on frontend
            const response = await ApiService.getAttendanceRecords(params);
            if (response.success) {
              let filteredData = response.data || [];
              
              if (selectedClass) {
                filteredData = filteredData.filter(record => 
                  record.students && record.students.class_name === selectedClass
                );
              }
              
              if (selectedStatus) {
                filteredData = filteredData.filter(record => record.status === selectedStatus);
              }
              
              setAttendanceRecords(filteredData);
              setTotal(filteredData.length);
            }
          }
        } else {
          if (selectedStatus) {
            params.status = selectedStatus;
          }
          
          const response = await ApiService.getAttendanceRecords(params);
          console.log('📡 API Response:', response);
          if (response.success) {
            setAttendanceRecords(response.data || []);
            setTotal(response.total || 0);
          }
        }
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setError('Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Only load API stats when not in full list mode
      if (!showFullList) {
        const response = await ApiService.getAttendanceStats(selectedDate);
        if (response.success) {
          setStats(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      present: { bg: 'bg-green-100', text: 'text-green-800', label: 'Có mặt' },
      absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Vắng mặt' },
      late: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Muộn' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'  // Đảm bảo hiển thị theo giờ Việt Nam
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh'  // Đảm bảo hiển thị theo giờ Việt Nam
      });
    } catch {
      return dateString;
    }
  };

  const resetFilters = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedClass('');
    setSelectedStatus('');
    setPage(1);
  };

  const calculateStatsFromData = (data) => {
    const totalStudents = data.length;
    const presentCount = data.filter(record => record.status === 'present').length;
    const lateCount = data.filter(record => record.status === 'late').length;
    const absentCount = totalStudents - presentCount - lateCount; // Đơn giản hơn!
    
    return {
      total_students: totalStudents,
      present_count: presentCount,
      late_count: lateCount,
      absent_count: absentCount,
      attendance_rate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100 * 10) / 10 : 0
    };
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditNotes(record.notes || '');
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    setUpdating(true);
    try {
      let response;
      
      if (editingRecord.id === null) {
        // Create new attendance record for student who hasn't been marked
        response = await ApiService.markAttendance({
          student_id: editingRecord.student_id,
          date: selectedDate,
          status: editStatus,
          notes: editNotes,
          method: 'manual'
        });
      } else {
        // Update existing attendance record
        response = await ApiService.updateAttendanceStatus(
          editingRecord.id,
          editStatus,
          editNotes
        );
      }
      
      if (response.success) {
        // Update the record in the local state
        const updatedRecords = attendanceRecords.map(record =>
          record.student_id === editingRecord.student_id
            ? { ...record, status: editStatus, notes: editNotes, id: response.data?.id || record.id }
            : record
        );
        setAttendanceRecords(updatedRecords);
        
        // Update stats if in full list mode
        if (showFullList) {
          setStats(calculateStatsFromData(updatedRecords));
        }
        
        // Close edit mode
        handleCancelEdit();
        
        // Reload stats for other modes
        if (!showFullList) {
          loadStats();
        }
        
        // Show success message
        setError(null);
        setSuccessMessage(editingRecord.id === null ? 
          'Tạo mới điểm danh thành công!' : 
          'Cập nhật trạng thái điểm danh thành công!'
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Lỗi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      setError('Không thể cập nhật trạng thái điểm danh');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-32 h-32 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-800">Điểm danh</h2>
        <p className="text-gray-600">Quản lý điểm danh học sinh</p>
        {error && (
          <div className="p-3 mt-2 text-red-700 bg-red-100 rounded border border-red-400">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 mt-2 text-green-700 bg-green-100 rounded border border-green-400">
            {successMessage}
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 text-blue-600 bg-blue-100 rounded-full">
                👥
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng học sinh</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 text-green-600 bg-green-100 rounded-full">
                ✅
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Có mặt</p>
                <p className="text-2xl font-bold text-green-600">{stats.present_count}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 text-red-600 bg-red-100 rounded-full">
                ❌
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vắng mặt</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent_count}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 text-yellow-600 bg-yellow-100 rounded-full">
                ⏰
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Muộn</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Bộ lọc</h3>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-gray-600">Chế độ xem:</span>
            <label className="flex gap-2 items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showFullList}
                onChange={(e) => setShowFullList(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Hiển thị tất cả học sinh
              </span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Ngày
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
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
              {classes.map(className => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="present">Có mặt</option>
              <option value="absent">Vắng mặt</option>
              <option value="late">Muộn</option>
            </select>
          </div>

          <div className="flex gap-2 items-end">
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 text-white bg-gray-600 rounded-md transition-colors hover:bg-gray-700"
            >
              Đặt lại
            </button>
            <button
              onClick={loadAttendanceData}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md transition-colors hover:bg-blue-700"
            >
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Danh sách điểm danh {selectedDate && `- ${formatDate(selectedDate)}`}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {showFullList ? 
              `Hiển thị ${attendanceRecords.length} học sinh (bao gồm cả học sinh chưa điểm danh)` :
              `Hiển thị ${attendanceRecords.length} bản ghi điểm danh`
            }
            {selectedClass && ` - Lớp ${selectedClass}`}
          </p>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase bg-gray-50 border-b">
          <div className="col-span-1">Mã HS</div>
          <div className="col-span-2">Họ tên</div>
          <div className="col-span-1">Lớp</div>
          <div className="col-span-1">Giờ vào</div>
          <div className="col-span-1">Giờ ra</div>
          <div className="col-span-1">Trạng thái</div>
          <div className="col-span-1">Độ chính xác</div>
          <div className="col-span-2">Ghi chú</div>
          <div className="col-span-2">Thao tác</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {attendanceRecords.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {loading ? (
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                </div>
              ) : (
                'Không có dữ liệu điểm danh'
              )}
            </div>
          ) : (
            attendanceRecords.map((record) => (
              <div key={record.id} className="grid grid-cols-12 gap-2 px-6 py-4 hover:bg-gray-50">
                <div className="col-span-1 text-sm font-medium text-gray-900">
                  {record.students?.student_id || 'N/A'}
                </div>
                <div className="col-span-2 text-sm text-gray-900">
                  <div className="font-medium">{record.students?.full_name || 'Không xác định'}</div>
                </div>
                <div className="col-span-1 text-sm text-gray-900">
                  <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                    {record.students?.class_name || 'N/A'}
                  </span>
                </div>
                <div className="col-span-1 text-sm text-gray-600">
                  {formatTime(record.check_in_time)}
                </div>
                <div className="col-span-1 text-sm text-gray-600">
                  {formatTime(record.check_out_time)}
                </div>
                <div className="col-span-1 min-w-0">
                  {editingRecord?.id === record.id ? (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="px-1 py-1 w-full text-xs bg-white rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ minWidth: '65px' }}
                    >
                      <option value="present">Có mặt</option>
                      <option value="absent">Vắng</option>
                      <option value="late">Muộn</option>
                    </select>
                  ) : (
                    getStatusBadge(record.status)
                  )}
                </div>
                <div className="col-span-1 text-sm text-gray-600">
                  {record.confidence_score ? `${(record.confidence_score * 100 * 2).toFixed(1)}%` : '-'}
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {editingRecord?.id === record.id ? (
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Nhập ghi chú..."
                      className="px-2 py-1 w-full text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="truncate" title={record.notes || ''}>
                      {record.notes || '-'}
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  {editingRecord?.id === record.id ? (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleSaveEdit}
                        disabled={updating}
                        className="px-3 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {updating ? '...' : 'Lưu'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updating}
                        className="px-3 py-1 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleEditRecord(record)}
                        className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                      >
                        Sửa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Hiển thị {((page - 1) * pageSize) + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} bản ghi
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="px-3 py-2 text-sm text-white bg-blue-600 rounded-md">
                {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-2 text-sm bg-white rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 mt-6 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {selectedDate === new Date().toISOString().split('T')[0] 
            ? 'Dữ liệu điểm danh hôm nay' 
            : `Dữ liệu điểm danh ngày ${formatDate(selectedDate)}`}
          {selectedClass && ` - Lớp ${selectedClass}`}
          {selectedStatus && ` - Trạng thái: ${selectedStatus}`}
        </p>
      </div>
    </div>
  );
};

export default AttendanceView; 