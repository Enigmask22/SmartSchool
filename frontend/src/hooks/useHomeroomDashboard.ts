/**
 * useHomeroomDashboard.ts - Homeroom Dashboard Hook
 * 
 * Extracted from HomeroomDashboard.jsx:
 * - Multi-filter state management (academic year, class, month, year)
 * - Student data fetching and transformation
 * - Attendance statistics calculation
 * - Pagination logic
 * - API bootstrap endpoint
 */

import { useState, useCallback, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import api from '@/utils/api';
import logger from '@/utils/logger';

/**
 * Student Data Structure
 */
export interface StudentData {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
  absent_count: number;
  late_count: number;
  early_count: number;
}

/**
 * Class Information Structure
 */
export interface ClassInfo {
  id: number;
  class_name: string;
  grade: number;
  academic_year: string;
}

/**
 * API Class Response Structure
 */
interface APIClassResponse {
  id: number;
  class_name: string;
  grade: number;
  academic_year: string;
}

/**
 * API Student Response Structure
 */
interface APIStudentResponse {
  student_id: number;
  student_code: string;
  student_name: string;
  class_name: string;
  absent_count: number;
  late_count: number;
  early_count: number;
}

/**
 * Top Absent/Late Student Structure
 */
export interface TopAbsentLateStudent {
  student_name: string;
  student_code: string;
  class_name: string;
  absent_count?: number;
  late_count?: number;
}

/**
 * Attendance Statistics Structure
 */
export interface AttendanceStats {
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

/**
 * Homeroom Info Structure
 */
export interface HomeroomInfo {
  class_name: string;
  [key: string]: any;
}

/**
 * Bootstrap Response Structure
 */
interface BootstrapResponse {
  success: boolean;
  data?: {
    academic_years: string[];
    classes: APIClassResponse[];
    selected_class: APIClassResponse | null;
    students: APIStudentResponse[];
    top_absent: TopAbsentLateStudent[];
    top_late: TopAbsentLateStudent[];
    homeroom_info: HomeroomInfo;
    default_year?: string;
    year?: string;
  };
}

/**
 * Dashboard Bootstrap Parameters
 */
interface BootstrapParams {
  ay?: string;
  y?: number;
  m?: number;
  clsName?: string | null;
  clsId?: number | null;
}

/**
 * Hook Return Type
 */
export interface UseHomeroomDashboardReturn {
  loading: boolean;
  homeroomInfo: HomeroomInfo | null;
  academicYears: string[];
  selectedAcademicYear: string;
  teacherClasses: ClassInfo[];
  selectedClass: string | null;
  selectedClassId: number | null;
  students: StudentData[];
  topAbsent: TopAbsentLateStudent[];
  topLate: TopAbsentLateStudent[];
  attendanceStats: AttendanceStats | null;
  selectedDate: string;
  selectedYear: number;
  selectedMonth: number;
  showAllStudents: boolean;
  currentPage: number;
  studentsPerPage: number;
  totalPages: number;
  currentStudents: StudentData[];
  // Handlers
  setSelectedAcademicYear: (year: string) => void;
  setSelectedClass: (classname: string | null) => void;
  setSelectedClassId: (id: number | null) => void;
  setSelectedDate: (date: string) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setShowAllStudents: (show: boolean) => void;
  handlePageChange: (page: number) => void;
  getAttendanceStatus: (student: StudentData) => string | null;
  getStatusIcon: (status: string | null) => React.ReactNode;
  getStatusBadge: (status: string | null) => React.ReactNode;
}

/**
 * useHomeroomDashboard Hook
 * 
 * Manages homeroom dashboard data fetching and state:
 * - Filter management (academic year, class, month, year)
 * - Student list fetching and transformation
 * - Top absent/late students
 * - Attendance statistics
 * - Pagination logic
 */
export const useHomeroomDashboard = (): UseHomeroomDashboardReturn => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [homeroomInfo, setHomeroomInfo] = useState<HomeroomInfo | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [teacherClasses, setTeacherClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [topAbsent, setTopAbsent] = useState<TopAbsentLateStudent[]>([]);
  const [topLate, setTopLate] = useState<TopAbsentLateStudent[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 12;

  /**
   * Bootstrap dashboard data from API
   */
  const dashboardBootstrap = useCallback(
    async (params: BootstrapParams = {}) => {
      try {
        setLoading(true);
        const { ay, y, m, clsName, clsId } = params;
        const queryParams = new URLSearchParams();
        if (ay) queryParams.set('academic_year', ay);
        if (y) queryParams.set('year', String(y));
        if (m) queryParams.set('month', String(m));
        if (clsName) queryParams.set('class_name', clsName);
        if (clsId) queryParams.set('class_id', String(clsId));

        const resp = (await api.request(
          `/homeroom/dashboard/bootstrap${
            queryParams.toString() ? `?${queryParams.toString()}` : ''
          }`
        )) as BootstrapResponse;

        if (resp.success && resp.data) {
          const {
            academic_years,
            classes,
            selected_class,
            students: studentRows,
            top_absent,
            top_late,
            homeroom_info,
          } = resp.data;

          if (Array.isArray(academic_years)) setAcademicYears(academic_years);
          if (!selectedAcademicYear && resp.data.year) {
            setSelectedAcademicYear(
              resp.data.default_year || selectedAcademicYear
            );
          }

          const uniqueClasses = Array.from(
            new Map((classes || []).map((c: APIClassResponse) => [c.class_name, c])).values()
          ) as ClassInfo[];
          setTeacherClasses(uniqueClasses);

          const sName =
            selected_class?.class_name || uniqueClasses[0]?.class_name || null;
          const sId = selected_class?.id || uniqueClasses[0]?.id || null;
          setSelectedClass(sName);
          setSelectedClassId(sId);
          setHomeroomInfo(homeroom_info || null);

          const mapped = (studentRows || []).map((r: APIStudentResponse) => ({
            id: r.student_id,
            student_id: r.student_code,
            full_name: r.student_name,
            class_name: r.class_name,
            absent_count: r.absent_count,
            late_count: r.late_count,
            early_count: r.early_count,
          }));
          setStudents(mapped);

          const sortByCodeAsc = (arr: TopAbsentLateStudent[]): TopAbsentLateStudent[] =>
            (arr || []).slice().sort((a: TopAbsentLateStudent, b: TopAbsentLateStudent) => {
              const aId = parseInt(a.student_code) || 0;
              const bId = parseInt(b.student_code) || 0;
              return aId - bId;
            });

          setTopAbsent(sortByCodeAsc(top_absent || []));
          setTopLate(sortByCodeAsc(top_late || []));
          setAttendanceStats({
            absent_count: mapped.reduce((s, x) => s + (x.absent_count || 0), 0),
            late_count: mapped.reduce((s, x) => s + (x.late_count || 0), 0),
            attendance_rate: 0,
          });
        }
      } catch (e) {
        logger.error('dashboard bootstrap error', e);
      } finally {
        setLoading(false);
      }
    },
    [selectedAcademicYear]
  );

  /**
   * Fetch homeroom data on mount
   */
  useEffect(() => {
    dashboardBootstrap();
  }, [dashboardBootstrap]);

  /**
   * Refetch when filters change
   */
  useEffect(() => {
    if (selectedClass || selectedClassId) {
      dashboardBootstrap({
        ay: selectedAcademicYear,
        y: selectedYear,
        m: selectedMonth,
        clsName: selectedClass,
        clsId: selectedClassId,
      });
    }
  }, [
    dashboardBootstrap,
    selectedAcademicYear,
    selectedYear,
    selectedMonth,
    selectedClass,
    selectedClassId,
  ]);

  /**
   * Pagination calculations
   */
  const totalPages = Math.ceil(students.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * Get attendance status for a student
   */
  const getAttendanceStatus = useCallback(
    (student: StudentData): string | null => {
      // Placeholder - extend with actual attendance records
      return null;
    },
    []
  );

  /**
   * Get status icon component
   */
  const getStatusIcon = useCallback((status: string | null): React.ReactNode => {
    // Placeholder - implement with actual icons
    return null;
  }, []);

  /**
   * Get status badge component
   */
  const getStatusBadge = useCallback((status: string | null): React.ReactNode => {
    // Placeholder - implement with actual badges
    return null;
  }, []);

  return {
    loading,
    homeroomInfo,
    academicYears,
    selectedAcademicYear,
    teacherClasses,
    selectedClass,
    selectedClassId,
    students,
    topAbsent,
    topLate,
    attendanceStats,
    selectedDate,
    selectedYear,
    selectedMonth,
    showAllStudents,
    currentPage,
    studentsPerPage,
    totalPages,
    currentStudents,
    setSelectedAcademicYear,
    setSelectedClass,
    setSelectedClassId,
    setSelectedDate,
    setSelectedYear,
    setSelectedMonth,
    setShowAllStudents,
    handlePageChange,
    getAttendanceStatus,
    getStatusIcon,
    getStatusBadge,
  };
};
