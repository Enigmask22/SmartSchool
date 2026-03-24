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

import { useState, useCallback, useEffect } from 'react';
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
  // Methods
  fetchDashboardData: (params: BootstrapParams) => Promise<void>;
  setSelectedAcademicYear: (year: string) => void;
  setSelectedClass: (classname: string | null) => void;
  setSelectedClassId: (id: number | null) => void;
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
  const fetchDashboardData = useCallback(async (params: BootstrapParams = {}) => {
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

        // Set academic years
        if (Array.isArray(academic_years)) setAcademicYears(academic_years);
        if (!selectedAcademicYear && resp.data.year) {
          setSelectedAcademicYear(resp.data.default_year || selectedAcademicYear);
        }

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
      setLoading(false);
    }
  }, [selectedAcademicYear]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
    fetchDashboardData,
    setSelectedAcademicYear,
    setSelectedClass,
    setSelectedClassId,
  };
};
