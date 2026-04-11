/**
 * useHomeroomData - Homeroom Dashboard Data Fetching Domain Logic
 * Handles all API calls and data transformation for homeroom dashboard
 * 
 * Domain responsibilities:
 * - Fetching dashboard bootstrap data from API
 * - Transforming API responses to component-friendly formats
 * - Calculating attendance statistics
 * - Sorting top absent/late students
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';

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
 * API Response Structures (internal)
 */
interface APIClassResponse {
  id: number;
  class_name: string;
  grade: number;
  academic_year: string;
}

interface APIStudentResponse {
  student_id: number;
  student_code: string;
  student_name: string;
  class_name: string;
  absent_count: number;
  late_count: number;
  early_count: number;
}

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
export interface UseHomeroomDataReturn {
  loading: boolean;  // Alias for initialLoading - only true during first bootstrap
  isRefetching: boolean;  // True during filter changes (don't show skeletons)
  homeroomInfo: HomeroomInfo | null;
  academicYears: string[];  // Constant list of available academic years for dropdown
  selectedAcademicYear: string;
  teacherClasses: ClassInfo[];  // Now read-only, auto-selects based on academic year
  selectedClass: string | null;  // Read-only, set by API response
  selectedClassId: number | null;  // Read-only, set by API response
  selectedYear: number;
  selectedMonth: number;
  students: StudentData[];
  topAbsent: TopAbsentLateStudent[];
  topLate: TopAbsentLateStudent[];
  attendanceStats: AttendanceStats | null;
  // Methods
  setSelectedAcademicYear: (year: string) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
}

/**
 * useHomeroomData Hook
 * 
 * Manages homeroom dashboard data fetching:
 * - Bootstrap data from API
 * - Student list transformation
 * - Top absent/late students sorting
 * - Attendance statistics calculation
 */
export const useHomeroomData = (): UseHomeroomDataReturn => {
  const { settings } = useSystemSettings();
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const hasInitialized = useRef(false);
  const previousYearRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);  // Track if a fetch is already in progress
  const [homeroomInfo, setHomeroomInfo] = useState<HomeroomInfo | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || "2024-2025");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [teacherClasses, setTeacherClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [topAbsent, setTopAbsent] = useState<TopAbsentLateStudent[]>([]);
  const [topLate, setTopLate] = useState<TopAbsentLateStudent[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);

  /**
   * Sort students by student code in ascending order
   */
  const sortByCodeAsc = (arr: TopAbsentLateStudent[]): TopAbsentLateStudent[] =>
    (arr || []).slice().sort((a: TopAbsentLateStudent, b: TopAbsentLateStudent) => {
      const aId = parseInt(a.student_code) || 0;
      const bId = parseInt(b.student_code) || 0;
      return aId - bId;
    });

  /**
   * Transform API student response to StudentData format
   */
  const transformStudents = (studentRows: APIStudentResponse[]): StudentData[] =>
    (studentRows || []).map((r: APIStudentResponse) => ({
      id: r.student_id,
      student_id: r.student_code,
      full_name: r.student_name,
      class_name: r.class_name,
      absent_count: r.absent_count,
      late_count: r.late_count,
      early_count: r.early_count,
    }));

  /**
   * Calculate attendance statistics from students
   */
  const calculateAttendanceStats = (studentList: StudentData[]): AttendanceStats => ({
    absent_count: studentList.reduce((sum, s) => sum + (s.absent_count || 0), 0),
    late_count: studentList.reduce((sum, s) => sum + (s.late_count || 0), 0),
    attendance_rate: 0, // Can be expanded with actual calculation
  });

  /**
   * Fetch homeroom dashboard data from API
   */
  /**
   * Fetch homeroom dashboard data from API
   * Refactored to not depend on component state to avoid stale closures
   */
  const fetchDashboardData = useCallback(async (params: BootstrapParams = {}) => {
    isFetchingRef.current = true;  // Mark that fetch is in progress
    
    const { ay, y, m, clsName, clsId } = params;
    
    // Use provided academic_year or current selectedAcademicYear from state
    const academicYearParam = ay || selectedAcademicYear;
    
    try {
      if (!hasInitialized.current) {
        setInitialLoading(true);
      } else {
        setIsRefetching(true);
      }
      
      const queryParams = new URLSearchParams();
      if (academicYearParam) queryParams.set('academic_year', academicYearParam);
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
          classes,
          selected_class,
          students: studentRows,
          top_absent,
          top_late,
          homeroom_info,
        } = resp.data;

        // Process and set classes
        const uniqueClasses = Array.from(
          new Map((classes || []).map((c: APIClassResponse) => [c.class_name, c])).values()
        ) as ClassInfo[];
        setTeacherClasses(uniqueClasses);

        // Set default selected class if not specified
        const sName = selected_class?.class_name || uniqueClasses[0]?.class_name || null;
        const sId = selected_class?.id || uniqueClasses[0]?.id || null;
       
        setSelectedClass(sName);
        setSelectedClassId(sId);
        setHomeroomInfo(homeroom_info || null);

        // Transform and set students
        const transformedStudents = transformStudents(studentRows || []);
        setStudents(transformedStudents);

        // Set top absent/late students (sorted)
        setTopAbsent(sortByCodeAsc(top_absent || []));
        setTopLate(sortByCodeAsc(top_late || []));

        // Calculate attendance statistics
        setAttendanceStats(calculateAttendanceStats(transformedStudents));
      }
    } catch (error) {
      logger.error('Failed to fetch homeroom dashboard data:', error);
    } finally {
      isFetchingRef.current = false;  // Mark that fetch is complete
      
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setInitialLoading(false);
      } else {
        setIsRefetching(false);
      }
    }
  }, [selectedAcademicYear]);

  /**
   * Trigger bootstrap fetch when academic year changes
   * Only trigger when selectedAcademicYear actually changes (via ref comparison)
   * Do NOT include fetchDashboardData in dependency to avoid circular updates
   */
  useEffect(() => {
    if (previousYearRef.current !== selectedAcademicYear) {
      previousYearRef.current = selectedAcademicYear;
      
      // Prevent duplicate fetches if one is already in progress
      if (isFetchingRef.current) {
         return;
      }
      
      // IMPORTANT: Clear the old selectedClassId when year changes
      // Otherwise we'll pass the old class_id to the API which belongs to the previous year
      setSelectedClass(null);
      setSelectedClassId(null);
      
      // Now fetch with the new year - don't pass class_id so API will auto-select first class
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fetchDashboardData();
    }
  }, [selectedAcademicYear]);

  /**
   * Trigger refetch when month or year changes (for monthly statistics)
   */
  useEffect(() => {
    if (hasInitialized.current && selectedClassId) {
      // Prevent duplicate fetches if one is already in progress
      if (isFetchingRef.current) {
        return;
      }
      
      // Fetch monthly data for the selected class with new month/year
      fetchDashboardData({
        ay: selectedAcademicYear,
        y: selectedYear,
        m: selectedMonth,
        clsId: selectedClassId,
      });
    }
  }, [selectedYear, selectedMonth]);

  return {
    loading: initialLoading,
    isRefetching,
    homeroomInfo,
    academicYears: ACADEMIC_YEAR_OPTIONS,  // Constant list from utils/constants
    selectedAcademicYear,
    teacherClasses,
    selectedClass,
    selectedClassId,
    selectedYear,
    selectedMonth,
    students,
    topAbsent,
    topLate,
    attendanceStats,
    setSelectedAcademicYear,
    setSelectedYear,
    setSelectedMonth,
  };
};
