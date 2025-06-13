import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const AttendanceView = () => {
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

  useEffect(() => {
    loadClasses();
    loadAttendanceData();
    loadStats();
  }, [selectedDate, selectedClass, selectedStatus, page]);

  const loadClasses = async () => {
    try {
      const response = await ApiService.getClasses();
      if (response.success) {
        setClasses(response.data || []);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    console.log('🔍 Loading attendance data...', { selectedDate, selectedClass, selectedStatus, page });
    try {
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
    } catch (error) {
      console.error('Error loading attendance:', error);
      setError('Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await ApiService.getAttendanceStats(selectedDate);
      if (response.success) {
        setStats(response.data);
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

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Điểm danh</h2>
        <p className="text-gray-600">Quản lý điểm danh học sinh</p>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                👥
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng học sinh</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_students}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                ✅
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Có mặt</p>
                <p className="text-2xl font-bold text-green-600">{stats.present_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                ❌
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vắng mặt</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Bộ lọc</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lớp
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(classItem => (
                <option key={classItem.class_name} value={classItem.class_name}>
                  {classItem.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="present">Có mặt</option>
              <option value="absent">Vắng mặt</option>
              <option value="late">Muộn</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Đặt lại
            </button>
            <button
              onClick={loadAttendanceData}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Danh sách điểm danh {selectedDate && `- ${formatDate(selectedDate)}`}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Hiển thị {attendanceRecords.length} bản ghi
          </p>
        </div>

        {/* Table Header */}
        <div className="bg-gray-50 grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
          <div className="col-span-2">Mã học sinh</div>
          <div className="col-span-3">Họ tên</div>
          <div className="col-span-1">Lớp</div>
          <div className="col-span-2">Giờ vào</div>
          <div className="col-span-2">Giờ ra</div>
          <div className="col-span-1">Trạng thái</div>
          <div className="col-span-1">Độ chính xác</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {attendanceRecords.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                'Không có dữ liệu điểm danh'
              )}
            </div>
          ) : (
            attendanceRecords.map((record) => (
              <div key={record.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="col-span-2 text-sm font-medium text-gray-900">
                  {record.students?.student_id || 'N/A'}
                </div>
                <div className="col-span-3 text-sm text-gray-900">
                  <div className="font-medium">{record.students?.full_name || 'Không xác định'}</div>
                </div>
                <div className="col-span-1 text-sm text-gray-900">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {record.students?.class_name || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {formatTime(record.check_in_time)}
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {formatTime(record.check_out_time)}
                </div>
                <div className="col-span-1">
                  {getStatusBadge(record.status)}
                </div>
                <div className="col-span-1 text-sm text-gray-600">
                  {record.confidence_score ? `${(record.confidence_score * 100 * 2).toFixed(1)}%` : '-'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Hiển thị {((page - 1) * pageSize) + 1} đến {Math.min(page * pageSize, total)} trong tổng số {total} bản ghi
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md">
                {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * pageSize >= total}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
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