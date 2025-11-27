/**
 * useSubjectDashboard.ts - Subject Dashboard Hook
 * 
 * Extracted from SubjectDashboard.jsx:
 * - Filter state management (academic year, semester, class selection)
 * - Analytics data fetching
 * - Class list management
 * - Tab navigation state
 * - SystemSettings context sync
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import api from '@/services/api';
import logger from '@/utils/logger';

/**
 * Class with Subjects Structure
 */
export interface ClassWithSubjects {
  class_id: number;
  class_name: string;
  grade: number;
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    subject_code: string;
  }>;
}

/**
 * Performance Group Data
 */
export interface PerformanceGroup {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Analytics Data Structure
 */
export interface SubjectAnalytics {
  total_classes: number;
  total_students: number;
  students_with_grades: number;
  is_letter_grade_subject: boolean;
  performance_groups: { [key: string]: PerformanceGroup };
  score_distribution: { [key: string]: number };
  overview: {
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
  };
  subjects: string[];
  [key: string]: any;
}

/**
 * Hook Return Type
 */
export interface UseSubjectDashboardReturn {
  loading: boolean;
  loadingClasses: boolean;
  analytics: SubjectAnalytics | null;
  classList: ClassWithSubjects[];
  selectedClass: number | null;
  academicYear: string;
  semester: string;
  selectedTab: string;
  // Handlers
  setSelectedClass: (classId: number | null) => void;
  setAcademicYear: (year: string) => void;
  setSemester: (sem: string) => void;
  setSelectedTab: (tab: string) => void;
  fetchClassList: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

// Helper: Generate academic years
const generateAcademicYears = () => {
  const years = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

const SEMESTERS = ['HK1', 'HK2', 'HK3'];
const ACADEMIC_YEARS = generateAcademicYears();

/**
 * useSubjectDashboard Hook
 * 
 * Manages subject teacher dashboard data fetching and state:
 * - Filter management (academic year, semester, class)
 * - Class list fetching
 * - Analytics data fetching
 * - Tab navigation
 * - SystemSettings synchronization
 */
export const useSubjectDashboard = (): UseSubjectDashboardReturn => {
  const { user } = useContext(AuthContext);
  const {
    academicYear: defaultAcademicYear,
    semester: defaultSemester,
    loading: settingsLoading,
  } = useSystemSettings();

  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [analytics, setAnalytics] = useState<SubjectAnalytics | null>(null);
  const [classList, setClassList] = useState<ClassWithSubjects[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState(
    defaultAcademicYear || '2024-2025'
  );
  const [semester, setSemester] = useState(defaultSemester || 'HK1');
  const [selectedTab, setSelectedTab] = useState('overview');

  /**
   * Sync with SystemSettings when defaults change
   */
  useEffect(() => {
    if (defaultAcademicYear) {
      setAcademicYear(defaultAcademicYear);
    }
  }, [defaultAcademicYear]);

  useEffect(() => {
    if (defaultSemester) {
      setSemester(defaultSemester);
    }
  }, [defaultSemester]);

  /**
   * Fetch class list when academic year or semester changes
   */
  useEffect(() => {
    if (academicYear && semester) {
      fetchClassList();
    }
  }, [academicYear, semester]);

  /**
   * Fetch analytics when filters change
   */
  useEffect(() => {
    if (academicYear && semester) {
      fetchAnalytics();
    }
  }, [academicYear, semester, selectedClass]);

  /**
   * Fetch list of classes for the teacher
   */
  const fetchClassList = useCallback(async () => {
    try {
      setLoadingClasses(true);
      const response = await api.getTeacherClasses(academicYear, semester);
      logger.debug('Class list response:', response);

      if (response.success && response.data) {
        // Extract unique classes from class_subjects data
        const classesMap: { [key: number]: ClassWithSubjects } = {};

        response.data.forEach((cs) => {
          if (cs.classes) {
            const classId = cs.classes.id;
            if (!classesMap[classId]) {
              classesMap[classId] = {
                class_id: classId,
                class_name: cs.classes.class_name,
                grade: cs.classes.grade,
                subjects: [],
              };
            }
            // Add subject if exists
            if (cs.subjects) {
              classesMap[classId].subjects.push({
                subject_id: cs.subjects.id,
                subject_name: cs.subjects.subject_name,
                subject_code: cs.subjects.subject_code,
              });
            }
          }
        });

        const classList = Object.values(classesMap).sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          return a.class_name.localeCompare(b.class_name);
        });

        setClassList(classList);
        logger.debug('Class list set to:', classList);
      }
    } catch (error) {
      logger.error('Error fetching class list:', error);
      setClassList([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [academicYear, semester]);

  /**
   * Fetch analytics data from API
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherDashboardAnalytics(
        academicYear,
        semester,
        selectedClass
      );
      logger.debug('Analytics response:', response);

      if (response.success) {
        setAnalytics(response.data);
      } else {
        logger.error('Failed to fetch analytics:', response.message);
      }
    } catch (error) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [academicYear, semester, selectedClass]);

  return {
    loading,
    loadingClasses,
    analytics,
    classList,
    selectedClass,
    academicYear,
    semester,
    selectedTab,
    setSelectedClass,
    setAcademicYear,
    setSemester,
    setSelectedTab,
    fetchClassList,
    fetchAnalytics,
  };
};
