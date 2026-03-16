/**
 * useAttendanceData Hook
 * Manages all attendance data fetching, filtering, pagination, and state
 * 
 * Responsibilities:
 * - Bootstrap attendance data (academic years, classes, initial records)
 * - Load attendance records based on filters
 * - Load and calculate statistics
 * - Handle attendance record editing
 * - Manage pagination
 * 
 * Returns: {
 *   // Data
 *   attendanceRecords, stats, classes, academicYears, homeroomClasses,
 *   // UI States
 *   loading, bootstrapLoading, classesLoading, updating, error, successMessage,
 *   // Filters
 *   selectedDate, selectedClass, selectedStatus, selectedAcademicYear, showFullList, page, pageSize,
 *   // Edit States
 *   editingRecord, editStatus, editNotes,
 *   // Handlers
 *   handleDateChange, handleClassChange, handleStatusChange, handleViewModeChange,
 *   handleEditRecord, handleCancelEdit, handleSaveEdit, resetFilters,
 *   // Bootstrap
 *   attendanceBootstrap, loadAttendanceData, loadStats,
 *   // Setters
 *   setSelectedAcademicYear, setPage, setPageSize, setEditStatus, setEditNotes
 * }
 */

import { useState, useEffect, useContext } from 'react';
import ApiService from '@/services/api';
import { AuthContext } from '@/contexts/AuthContext';
import logger from '@/utils/logger';

interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
}

interface AttendanceRecord {
  id: number | null;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  confidence_score?: number;
  notes?: string;
  students?: Student;
}

interface AttendanceStats {
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate?: number;
}

interface BootstrapData {
  academic_years: string[];
  year: string;
  classes: Array<{ id: string; class_name: string }>;
  selected_class: { class_name: string };
  records: AttendanceRecord[];
  stats: AttendanceStats;
}

export const useAttendanceData = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);

  // Data states
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [homeroomClasses, setHomeroomClasses] = useState<Array<{ id: string; class_name: string }>>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [showFullList, setShowFullList] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit states
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Load data on filter changes
  useEffect(() => {
    if (bootstrapLoading) return;
    loadAttendanceData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDate,
    selectedClass,
    selectedStatus,
    page,
    showFullList,
    bootstrapLoading,
  ]);

  // Load bootstrap when user changes
  useEffect(() => {
    if (isHomeroomTeacher?.()) {
      attendanceBootstrap({ date: selectedDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Initial bootstrap load
  useEffect(() => {
    const run = async () => {
      if (!isHomeroomTeacher?.()) return;
      await attendanceBootstrap({ date: selectedDate });
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attendanceBootstrap = async ({
    year,
    date,
    className,
  }: {
    year?: string;
    date?: string;
    className?: string;
  } = {}): Promise<void> => {
    try {
      setBootstrapLoading(true);
      setClassesLoading(true);

      const params = new URLSearchParams();
      if (year) params.set('academic_year', year);
      if (date) params.set('target_date', date);
      if (className) params.set('class_name', className);

      const url = `/homeroom/attendance/bootstrap${
        params.toString() ? `?${params.toString()}` : ''
      }`;

      const resp = await ApiService.request(url);

      if (resp.success && resp.data) {
        const data = resp.data as BootstrapData;
        const {
          academic_years,
          year: resolvedYear,
          classes: cls,
          selected_class,
          records,
          stats: bootstrapStats,
        } = data;

        if (Array.isArray(academic_years)) setAcademicYears(academic_years);
        if (!selectedAcademicYear && resolvedYear) setSelectedAcademicYear(resolvedYear);

        setHomeroomClasses(Array.isArray(cls) ? cls : []);
        const classNames = (cls || [])
          .map((c) => c.class_name)
          .filter(Boolean)
          .sort();
        setClasses(classNames);

        const exists =
          selected_class?.class_name && classNames.includes(selected_class.class_name);
        setSelectedClass(exists ? selected_class.class_name : classNames[0] || 'all');

        setAttendanceRecords(records || []);
        setStats(bootstrapStats || null);
      }
    } catch (e) {
      logger.error('attendance bootstrap error', e);
    } finally {
      setClassesLoading(false);
      setBootstrapLoading(false);
    }
  };

  const loadAttendanceData = async (): Promise<void> => {
    setLoading(true);
    setAttendanceRecords([]);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isHomeroomTeacher?.() && (!selectedClass || selectedClass === 'all')) {
        setAttendanceRecords([]);
        setStats({
          total_students: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
        });
        setLoading(false);
        return;
      }

      if (showFullList) {
        let response;

        if (isHomeroomTeacher?.() && selectedClass && selectedClass !== 'all') {
          const found = homeroomClasses.find((c) => c.class_name === selectedClass);
          const classId = found?.id;

          response = await ApiService.request(
            `/homeroom/attendance/records?target_date=${selectedDate}${
              classId ? `&class_id=${classId}` : ''
            }`
          );

          if (response.success) {
            const records = (response.data?.records || []).map((r: any) => ({
              id: r.id ?? null,
              ...r,
              students: {
                student_id: r.student_code || r.student_id,
                full_name: r.student_name,
                class_name: r.class_name,
              },
            }));
            response = { success: true, data: records };
          }
        } else {
          response = await ApiService.getFullAttendanceList(
            selectedDate,
            selectedClass === 'all' ? '' : selectedClass
          );
        }

        if (response.success) {
          let filteredData = response.data || [];

          if (selectedStatus && selectedStatus !== 'all') {
            filteredData = filteredData.filter(
              (record: AttendanceRecord) => record.status === selectedStatus
            );
          }

          setAttendanceRecords(filteredData);

          const fullData = response.data || [];
          const calculatedStats = calculateStatsFromData(fullData);
          setStats(calculatedStats);
        }
      } else {
        const params = {
          page: page,
          page_size: pageSize,
          date_from: selectedDate,
          date_to: selectedDate,
        };

        if (selectedClass && selectedClass !== 'all') {
          if (selectedDate === new Date().toISOString().split('T')[0]) {
            const response = await ApiService.getTodayAttendance(selectedClass);
            if (response.success) {
              let filteredData = response.data || [];

              if (selectedStatus && selectedStatus !== 'all') {
                filteredData = filteredData.filter(
                  (record: AttendanceRecord) => record.status === selectedStatus
                );
              }

              setAttendanceRecords(filteredData);
            }
          } else {
            const response = await ApiService.getAttendanceRecords(params);
            if (response.success) {
              let filteredData = response.data || [];

              if (selectedClass && selectedClass !== 'all') {
                filteredData = filteredData.filter(
                  (record: AttendanceRecord) =>
                    record.students && record.students.class_name === selectedClass
                );
              }

              if (selectedStatus && selectedStatus !== 'all') {
                filteredData = filteredData.filter(
                  (record: AttendanceRecord) => record.status === selectedStatus
                );
              }

              setAttendanceRecords(filteredData);
            }
          }
        } else {
          if (selectedStatus && selectedStatus !== 'all') {
            (params as any).status = selectedStatus;
          }

          const response = await ApiService.getAttendanceRecords(params);
          if (response.success) {
            setAttendanceRecords(response.data || []);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading attendance:', error);
      setError('Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      if (!showFullList) {
        const response = await ApiService.getAttendanceStats(selectedDate);
        if (response.success) {
          setStats(response.data);
        }
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const calculateStatsFromData = (data: AttendanceRecord[]): AttendanceStats => {
    const totalStudents = data.length;
    const presentCount = data.filter((record) => record.status === 'present').length;
    const lateCount = data.filter((record) => record.status === 'late').length;
    const absentCount = totalStudents - presentCount - lateCount;

    return {
      total_students: totalStudents,
      present_count: presentCount,
      late_count: lateCount,
      absent_count: absentCount,
      attendance_rate:
        totalStudents > 0
          ? Math.round((presentCount / totalStudents) * 100 * 10) / 10
          : 0,
    };
  };

  const handleDateChange = (newDate: string): void => {
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    setSelectedDate(newDate);
  };

  const handleClassChange = (newClass: string): void => {
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    setSelectedClass(newClass);
  };

  const handleStatusChange = (newStatus: string): void => {
    setAttendanceRecords([]);
    setPage(1);
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    setSelectedStatus(newStatus);
  };

  const handleViewModeChange = (showFullListMode: boolean): void => {
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
    setShowFullList(showFullListMode);
  };

  const getRecordKey = (record: AttendanceRecord | null): string | null => {
    if (!record) return null;
    return record.student_id ?? record.students?.student_id ?? null;
  };

  const isEditingRecord = (record: AttendanceRecord): boolean => {
    if (!editingRecord || !record) return false;
    const editingKey = getRecordKey(editingRecord);
    const recordKey = getRecordKey(record);
    return String(editingKey) === String(recordKey) && editingKey !== null;
  };

  const handleEditRecord = (record: AttendanceRecord): void => {
    setEditingRecord(record);
    setEditStatus(record.status || 'absent');
    setEditNotes(record.notes || '');
  };

  const handleCancelEdit = (): void => {
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingRecord) return;

    setUpdating(true);
    try {
      let response;

      if (editingRecord.id === null) {
        response = await ApiService.createManualAttendance({
          student_id: editingRecord.student_id,
          date: selectedDate,
          status: editStatus as 'present' | 'absent' | 'late',
          notes: editNotes,
          method: 'manual',
        });
      } else {
        response = await ApiService.updateAttendanceStatus(
          editingRecord.id,
          editStatus as 'present' | 'absent' | 'late',
          editNotes
        );
      }

      if (response.success) {
        handleCancelEdit();
        setError(null);
        setSuccessMessage(
          editingRecord.id === null
            ? 'Tạo mới điểm danh thành công!'
            : 'Cập nhật trạng thái điểm danh thành công!'
        );
        setTimeout(() => setSuccessMessage(null), 3000);

        await loadAttendanceData();
        await loadStats();
      } else {
        setError(response.message || 'Lỗi cập nhật trạng thái');
      }
    } catch (error) {
      logger.error('Error updating attendance:', error);
      setError('Không thể cập nhật trạng thái điểm danh');
    } finally {
      setUpdating(false);
    }
  };

  const resetFilters = (): void => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedClass('all');
    setSelectedStatus('all');
    setPage(1);
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setEditingRecord(null);
    setEditStatus('');
    setEditNotes('');
  };

  return {
    // Data
    attendanceRecords,
    stats,
    classes,
    homeroomClasses,
    academicYears,

    // Loading states
    loading,
    bootstrapLoading,
    classesLoading,
    updating,

    // UI states
    error,
    successMessage,

    // Filter states
    selectedDate,
    selectedClass,
    selectedStatus,
    selectedAcademicYear,
    showFullList,
    page,
    pageSize,

    // Edit states
    editingRecord,
    editStatus,
    editNotes,

    // Handlers
    handleDateChange,
    handleClassChange,
    handleStatusChange,
    handleViewModeChange,
    handleEditRecord,
    handleCancelEdit,
    handleSaveEdit,
    resetFilters,

    // Bootstrap
    attendanceBootstrap,
    loadAttendanceData,
    loadStats,

    // Setters
    setSelectedAcademicYear,
    setPage,
    setPageSize,
    setEditStatus,
    setEditNotes,

    // Helpers
    isEditingRecord,
    getRecordKey,
    calculateStatsFromData,
  };
};
