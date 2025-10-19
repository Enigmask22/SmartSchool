import React, { useState, useEffect, useContext } from 'react';
import ApiService from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';

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
  const [pageSize, setPageSize] = useState(20);
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
    // Clear previous data và error state để tránh duplicate
    setAttendanceRecords([]);
    setError(null);
    setSuccessMessage(null);
    
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
      present: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Có mặt' },
      absent: { variant: 'destructive', className: '', label: 'Vắng mặt' },
      late: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800', label: 'Muộn' }
    };

    const config = statusConfig[status] || { variant: 'outline', className: '', label: status };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
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
    // Clear tất cả filters và data để tránh duplicate
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedClass('');
    setSelectedStatus('');
    setPage(1);
    
    // Clear data states
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    
    // Clear editing states
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
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

  // Handler cho việc thay đổi ngày để tránh duplicate data
  const handleDateChange = (newDate) => {
    // Clear data ngay lập tức để tránh hiển thị data cũ
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    
    // Reset về trang đầu tiên
    setPage(1);
    
    // Clear editing states
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    
    // Set ngày mới
    setSelectedDate(newDate);
  };

  // Handler cho việc thay đổi lớp
  const handleClassChange = (newClass) => {
    // Clear data và reset page
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);
    
    // Clear editing states
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    
    // Set lớp mới
    setSelectedClass(newClass);
  };

  // Handler cho việc thay đổi trạng thái
  const handleStatusChange = (newStatus) => {
    // Clear data và reset page
    setAttendanceRecords([]);
    setPage(1);
    
    // Clear editing states
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    
    // Set trạng thái mới
    setSelectedStatus(newStatus);
  };

  // Handler cho việc thay đổi chế độ xem
  const handleViewModeChange = (showFullListMode) => {
    // Clear data khi thay đổi chế độ xem
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);
    
    // Clear editing states
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    
    // Set chế độ xem mới
    setShowFullList(showFullListMode);
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Điểm danh</CardTitle>
            <CardDescription>Quản lý điểm danh học sinh</CardDescription>
            {error && (
              <div className="p-3 mt-2 rounded border text-destructive bg-destructive/10 border-destructive/20">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 mt-2 text-green-700 bg-green-100 rounded border border-green-400">
                {successMessage}
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full text-primary bg-primary/10">
                  <Users className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Tổng học sinh</p>
                  <p className="text-2xl font-bold">{stats.total_students}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 text-green-600 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Có mặt</p>
                  <p className="text-2xl font-bold text-green-600">{stats.present_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full text-destructive bg-destructive/10">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Vắng mặt</p>
                  <p className="text-2xl font-bold text-destructive">{stats.absent_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 text-yellow-600 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Muộn</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.late_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bộ lọc</CardTitle>
            <div className="flex gap-3 items-center">
              <span className="text-sm text-muted-foreground">Chế độ xem:</span>
              <label className="flex gap-2 items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFullList}
                  onChange={(e) => handleViewModeChange(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-primary"
                />
                <span className="text-sm font-medium">
                  Hiển thị tất cả học sinh
                </span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 max-w-[160px]">
              <label className="block mb-2 text-sm font-medium">
                Ngày
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex-1 max-w-[200px]">
              <label className="block mb-2 text-sm font-medium">
                Lớp
              </label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="flex-1 max-w-[200px]">
              <label className="block mb-2 text-sm font-medium">
                Trạng thái
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="present">Có mặt</option>
                <option value="absent">Vắng mặt</option>
                <option value="late">Muộn</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetFilters}
              >
                Đặt lại
              </Button>
              <Button
                onClick={loadAttendanceData}
              >
                Tìm kiếm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách điểm danh {selectedDate && `- ${formatDate(selectedDate)}`}
          </CardTitle>
          <CardDescription>
            {showFullList ? 
              `Hiển thị ${attendanceRecords.length} học sinh (bao gồm cả học sinh chưa điểm danh)` :
              `Hiển thị ${attendanceRecords.length} bản ghi điểm danh`
            }
            {selectedClass && ` - Lớp ${selectedClass}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Mã HS</TableHead>
                  <TableHead className="w-[150px]">Họ tên</TableHead>
                  <TableHead className="w-[80px]">Lớp</TableHead>
                  <TableHead className="w-[100px]">Giờ vào</TableHead>
                  <TableHead className="w-[100px]">Giờ ra</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Độ chính xác</TableHead>
                  <TableHead className="w-[150px]">Ghi chú</TableHead>
                  <TableHead className="w-[120px] text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      {loading ? (
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
                        </div>
                      ) : (
                        'Không có dữ liệu điểm danh'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    // Apply frontend pagination
                    const startIndex = (page - 1) * pageSize;
                    const endIndex = startIndex + pageSize;
                    const paginatedRecords = attendanceRecords.slice(startIndex, endIndex);
                    
                    return paginatedRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {record.students?.student_id || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{record.students?.full_name || 'Không xác định'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-800 bg-blue-100">
                            {record.students?.class_name || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_in_time)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_out_time)}
                        </TableCell>
                        <TableCell>
                          {editingRecord?.id === record.id ? (
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="flex px-2 py-1 w-full h-8 text-xs rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="present">Có mặt</option>
                              <option value="absent">Vắng</option>
                              <option value="late">Muộn</option>
                            </select>
                          ) : (
                            getStatusBadge(record.status)
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.confidence_score ? `${(record.confidence_score * 100 * 2).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {editingRecord?.id === record.id ? (
                            <Input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Nhập ghi chú..."
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span className="truncate" title={record.notes || ''}>
                              {record.notes || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingRecord?.id === record.id ? (
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={updating}
                                className="h-8 text-xs"
                              >
                                {updating ? '...' : 'Lưu'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={updating}
                                className="h-8 text-xs"
                              >
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRecord(record)}
                              className="h-8 text-xs"
                            >
                              Sửa
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {(() => {
          const totalRecords = attendanceRecords.length;
          const totalPages = Math.ceil(totalRecords / pageSize);
          
          if (totalPages <= 1) return null;
          
          return (
            <div className="px-6 py-4 border-t bg-muted/50">
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị <span className="font-semibold">{((page - 1) * pageSize) + 1}</span> đến <span className="font-semibold">{Math.min(page * pageSize, totalRecords)}</span> trong tổng số <span className="font-semibold">{totalRecords}</span> bản ghi
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-muted-foreground">Số lượng/trang:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="flex px-2 py-1 w-16 h-8 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    ← Trước
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      const showPage = 
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= page - 1 && pageNum <= page + 1);
                      
                      if (!showPage) {
                        if (pageNum === page - 2 || pageNum === page + 2) {
                          return <span key={pageNum} className="px-2 text-muted-foreground">...</span>;
                        }
                        return null;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Sau →
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Summary */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {selectedDate === new Date().toISOString().split('T')[0] 
              ? 'Dữ liệu điểm danh hôm nay' 
              : `Dữ liệu điểm danh ngày ${formatDate(selectedDate)}`}
            {selectedClass && ` - Lớp ${selectedClass}`}
            {selectedStatus && ` - Trạng thái: ${selectedStatus}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceView; 