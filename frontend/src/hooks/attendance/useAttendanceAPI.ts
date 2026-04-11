import { useState, useEffect, useContext } from 'react';
import ApiService from '@/utils/api';
import { AuthContext } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import logger from '@/utils/logger';

/**
 * useAttendanceAPI - API Data Fetching & Bootstrap Hook
 * Manages all attendance data fetching, bootstrapping, and statistics
 * 
 * Responsibilities:
 * - Bootstrap attendance data (academic years, classes, initial records)
 * - Load attendance records based on provided filters
 * - Load and calculate statistics
 * - Handle loading states and errors
 * - Provide API response data to components
 * 
 * Does NOT:
 * - Manage filter state (handled by useAttendanceFilters)
 * - Manage edit state (handled by useAttendanceEdit)
 * - Manage pagination (handled by usePagination)
 * - Manage modal state
 * 
 * Dependencies passed in:
 * - selectedDate, selectedClass, selectedStatus, showFullList (from useAttendanceFilters)
 * This allows the hook to recompute when filters change
 */

interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
}

export interface AttendanceRecord {
  id: number | null;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  confidence_score?: number;
  notes?: string;
  students?: Student;
  leave_request_image?: string;
}

export interface AttendanceStats {
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

interface UseAttendanceAPIReturn {
  // Data
  attendanceRecords: AttendanceRecord[];
  stats: AttendanceStats | null;
  classes: string[];
  homeroomClasses: Array<{ id: string; class_name: string }>;
  academicYears: string[];
  selectedAcademicYear: string;
  apiSelectedClass: { id?: string; class_name: string } | null;

  // Loading states
  loading: boolean;
  bootstrapLoading: boolean;
  classesLoading: boolean;
  updating: boolean;

  // UI states
  error: string | null;
  successMessage: string | null;

  // Handlers
  attendanceBootstrap: (options?: {
    year?: string;
    date?: string;
    className?: string;
    classId?: string;
  }) => Promise<void>;
  loadAttendanceData: () => Promise<void>;
  loadStats: () => Promise<void>;
  updateRecord: (
    record: AttendanceRecord,
    newStatus: string,
    newNotes: string
  ) => Promise<boolean>;

  // Setters
  setError: (error: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
  setAttendanceRecords: (records: AttendanceRecord[]) => void;
  setStats: (stats: AttendanceStats | null) => void;
  setSelectedAcademicYear: (year: string) => void;
}

/**
 * useAttendanceAPI Hook
 * 
 * Usage:
 * ```
 * const {
 *   attendanceRecords, stats, loading,
 *   loadAttendanceData, attendanceBootstrap
 * } = useAttendanceAPI({
 *   selectedDate: '2024-01-15',
 *   selectedClass: 'Class A',
 *   selectedStatus: 'absent',
 *   showFullList: true
 * });
 * 
 * // In useEffect, trigger data load
 * useEffect(() => {
 *   loadAttendanceData();
 * }, [selectedDate, selectedClass]);
 * ```
 */
export const useAttendanceAPI = ({
  selectedDate,
  selectedClass,
  selectedStatus,
  showFullList,
  pageSize = 20,
  onRecordsUpdated,
  onStatsUpdated,
}: {
  selectedDate: string;
  selectedClass: string;
  selectedStatus: string;
  showFullList: boolean;
  pageSize?: number;
  onRecordsUpdated?: (records: AttendanceRecord[]) => void;
  onStatsUpdated?: (stats: AttendanceStats | null) => void;
}): UseAttendanceAPIReturn => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { settings } = useSystemSettings();

  // Data states
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [homeroomClasses, setHomeroomClasses] = useState<
    Array<{ id: string; class_name: string }>
  >([]);
  const [apiSelectedClass, setApiSelectedClass] = useState<{ id?: string; class_name: string } | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || "2024-2025");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load data on filter changes
  useEffect(() => {
    if (bootstrapLoading) return;
    loadAttendanceData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedClass, selectedStatus, showFullList]);

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

  /**
   * Bootstrap attendance data - load initial data, years, classes
   */
  const attendanceBootstrap = async ({
    year,
    date,
    className,
    classId,
  }: {
    year?: string;
    date?: string;
    className?: string;
    classId?: string;
  } = {}): Promise<void> => {
    try {
      setBootstrapLoading(true);
      setClassesLoading(true);
      setLoading(true);

      const params = new URLSearchParams();
      if (year) params.set('academic_year', year);
      if (date) params.set('target_date', date);
      if (className) params.set('class_name', className);
      if (classId) params.set('class_id', classId);

      const url = `/homeroom/attendance/bootstrap${
        params.toString() ? `?${params.toString()}` : ''
      }`;

      const resp = await ApiService.request(url);

      if (resp.success && resp.data) {
        const data = resp.data as BootstrapData;
        const {
          year: resolvedYear,
          classes: cls,
          selected_class,
          records,
          stats: bootstrapStats,
        } = data;

        console.log('Bootstrap data:', data);

        if (!selectedAcademicYear && resolvedYear)
          setSelectedAcademicYear(resolvedYear);

        setHomeroomClasses(Array.isArray(cls) ? cls : []);
        const classNames = (cls || [])
          .map((c) => c.class_name)
          .filter(Boolean)
          .sort();
        setClasses(classNames);

        // Set the selected class from API response
        if (selected_class) {
          setApiSelectedClass(selected_class);
        } else if (Array.isArray(cls) && cls.length > 0) {
          // Fallback to first class if not provided
          setApiSelectedClass({ id: cls[0].id, class_name: cls[0].class_name });
        }

        setAttendanceRecords(records || []);
        setStats(bootstrapStats || null);

        onRecordsUpdated?.(records || []);
        onStatsUpdated?.(bootstrapStats || null);
      }
    } catch (e) {
      logger.error('attendance bootstrap error', e);
      setError('Lỗi tải dữ liệu khởi tạo');
    } finally {
      setLoading(false);
      setClassesLoading(false);
      setBootstrapLoading(false);
    }
  };

  /**
   * Load attendance records based on current filters
   */
  const loadAttendanceData = async (): Promise<void> => {
    setLoading(true);
    setAttendanceRecords([]);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isHomeroomTeacher?.() && !apiSelectedClass?.id) {
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

        if (
          isHomeroomTeacher?.() &&
          apiSelectedClass?.id
        ) {
          const classId = apiSelectedClass.id;

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
            selectedDate as any,
            selectedClass === 'all' ? (null as any) : (selectedClass as any)
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
          onRecordsUpdated?.(filteredData);

          const fullData = response.data || [];
          const calculatedStats = calculateStatsFromData(fullData);
          setStats(calculatedStats);
          onStatsUpdated?.(calculatedStats);
        }
      } else {
        const params = {
          page: 1,
          page_size: pageSize,
          date_from: selectedDate,
          date_to: selectedDate,
        };

        if (selectedClass && selectedClass !== 'all') {
          if (selectedDate === new Date().toISOString().split('T')[0]) {
            const response = await ApiService.getTodayAttendance(
              selectedClass === 'all' ? (null as any) : (selectedClass as any)
            );
            if (response.success) {
              let filteredData = response.data || [];

              if (selectedStatus && selectedStatus !== 'all') {
                filteredData = filteredData.filter(
                  (record: AttendanceRecord) => record.status === selectedStatus
                );
              }

              setAttendanceRecords(filteredData);
              onRecordsUpdated?.(filteredData);
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
              onRecordsUpdated?.(filteredData);
            }
          }
        } else {
          if (selectedStatus && selectedStatus !== 'all') {
            (params as any).status = selectedStatus;
          }

          const response = await ApiService.getAttendanceRecords(params);
          if (response.success) {
            setAttendanceRecords(response.data || []);
            onRecordsUpdated?.(response.data || []);
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

  /**
   * Load statistics for the selected date
   */
  const loadStats = async (): Promise<void> => {
    try {
      if (!showFullList) {
        const response = await ApiService.getAttendanceStats(selectedDate as any);
        if (response.success) {
          setStats(response.data);
          onStatsUpdated?.(response.data);
        }
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  /**
   * Calculate statistics from raw attendance data
   */
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

  /**
   * Update a single attendance record (create or update)
   */
  const updateRecord = async (
    record: AttendanceRecord,
    newStatus: string,
    newNotes: string
  ): Promise<boolean> => {
    setUpdating(true);
    try {
      let response;

      if (record.id === null) {
        response = await ApiService.createManualAttendance({
          student_id: record.student_id,
          date: selectedDate,
          status: newStatus as 'present' | 'absent' | 'late',
          notes: (newNotes || null) as any,
          method: 'manual',
        });
      } else {
        response = await ApiService.updateAttendanceStatus(
          record.id,
          newStatus as 'present' | 'absent' | 'late',
          (newNotes || null) as any
        );
      }

      if (response.success) {
        setError(null);
        setSuccessMessage(
          record.id === null
            ? 'Tạo mới điểm danh thành công!'
            : 'Cập nhật trạng thái điểm danh thành công!'
        );
        setTimeout(() => setSuccessMessage(null), 3000);

        // Reload data after update
        await loadAttendanceData();
        await loadStats();
        return true;
      } else {
        setError(response.message || 'Lỗi cập nhật trạng thái');
        return false;
      }
    } catch (error) {
      logger.error('Error updating attendance:', error);
      setError('Không thể cập nhật trạng thái điểm danh');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    // Data
    attendanceRecords,
    stats,
    classes,
    homeroomClasses,
    academicYears: ACADEMIC_YEAR_OPTIONS,
    selectedAcademicYear,
    apiSelectedClass,

    // Loading states
    loading,
    bootstrapLoading,
    classesLoading,
    updating,

    // UI states
    error,
    successMessage,

    // Handlers
    attendanceBootstrap,
    loadAttendanceData,
    loadStats,
    updateRecord,

    // Setters
    setError,
    setSuccessMessage,
    setAttendanceRecords,
    setStats,
    setSelectedAcademicYear,
  };
};
