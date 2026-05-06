/**
 * useAdminDashboard.ts - Admin Dashboard Hook
 * 
 * Domain logic for admin dashboard:
 * - State management for dashboard data (overview, trends, performance, health)
 * - Academic year filtering (current year shows period selector, past years show full year)
 * - API data fetching
 * - Refresh functionality
 * - Uses usePeriodFilter for period management (reusable logic)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';

/**
 * Overview Data Structure
 */
export interface AdminOverviewData {
  total_students: number;
  total_classes: number;
  total_teachers: number;
  attendance_rate: number;
  academic_year: string;
}

/**
 * Infra Stats Data Structure
 */
export interface InfraStatsData {
  total_subjects: number;
  total_cameras: number;
  students_with_face: number;
}

/**
 * Attendance Trend Data Structure
 */
export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  rate: number;
}

/**
 * Class Performance Data Structure
 */
export interface ClassPerformanceData {
  class_name: string;
  total_students: number;
  average_score: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  poor_count: number;
}

/**
 * Teacher Performance Data Structure
 */
export interface TeacherPerformanceData {
  teacher_name: string;
  teacher_code: string;
  classes_count: number;
  total_students: number;
  attendance_rate: number;
}

/**
 * Hook Return Type
 */
export interface UseAdminDashboardReturn {
  loading: boolean;
  refreshing: boolean;
  /** '7' | '30' | '90' | '0' (0 = full year) — only meaningful for current year */
  attendancePeriod: string;
  isCurrentYear: boolean;
  selectedAcademicYear: string;
  academicYears: string[];
  overview: AdminOverviewData | null;
  attendanceTrends: AttendanceTrend[];
  classPerformance: ClassPerformanceData[];
  infraStats: InfraStatsData | null;
  handleAttendancePeriodChange: (period: string) => void;
  handleAcademicYearChange: (year: string) => void;
  handleRefresh: () => Promise<void>;
  fetchDashboardData: () => Promise<void>;
}

/**
 * useAdminDashboard Hook
 * 
 * Manages admin dashboard data fetching and state:
 * - Overview statistics (users, students, classes, teachers)
 * - Attendance trends
 * - Class performance metrics
 * - Teacher performance metrics
 * - System health status
 * - Academic year and period filtering
 */
export const useAdminDashboard = (): UseAdminDashboardReturn => {
  // Get system settings (current academic year)
  const { settings } = useSystemSettings();

  // Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || ACADEMIC_YEAR_OPTIONS[0]);
  const [attendancePeriod, setAttendancePeriod] = useState('30');
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformanceData[]>([]);
  const [infraStats, setInfraStats] = useState<InfraStatsData | null>(null);

  /** True when the selected year is the same as the system's current academic year */
  const isCurrentYear = useMemo(
    () => selectedAcademicYear === (settings.academic_year || ACADEMIC_YEAR_OPTIONS[0]),
    [selectedAcademicYear, settings.academic_year]
  );

  /**
   * Fetch dashboard data from API
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const yearToFetch = selectedAcademicYear || settings.academic_year || ACADEMIC_YEAR_OPTIONS[0];
      // For past years, force period_days=0 (full academic year)
      const effectivePeriod = isCurrentYear ? attendancePeriod : '0';

      logger.debug(`Fetching dashboard bootstrap for ${yearToFetch} (period: ${effectivePeriod})`);

      const qs = new URLSearchParams({
        academic_year: yearToFetch,
        period_days: effectivePeriod,
      }).toString();

      const response = await api.request(`/admin/dashboard/bootstrap?${qs}`);
      logger.debug('Dashboard bootstrap response:', response);

      if (response?.success && response.data) {
        const data = response.data;
        if (data.overview) setOverview(data.overview);
        if (data.attendance_trends) setAttendanceTrends(data.attendance_trends);
        if (data.class_performance) setClassPerformance(data.class_performance);
        if (data.infra_stats) setInfraStats(data.infra_stats);
      } else {
        logger.error('Dashboard bootstrap failed:', response?.message);
      }
    } catch (error) {
      logger.error('Error fetching dashboard bootstrap:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, attendancePeriod, isCurrentYear, settings.academic_year]);

  /**
   * Handle academic year change — also resets attendance period for past years
   */
  const handleAcademicYearChange = useCallback((year: string) => {
    setSelectedAcademicYear(year);
    const currentYear = settings.academic_year || ACADEMIC_YEAR_OPTIONS[0];
    if (year !== currentYear) {
      // Past year: lock to full-year
      setAttendancePeriod('0');
    } else {
      // Back to current year: restore default period
      setAttendancePeriod('30');
    }
  }, [settings.academic_year]);

  /**
   * Handle attendance period change — only functional when viewing current year
   */
  const handleAttendancePeriodChange = useCallback((period: string) => {
    if (isCurrentYear) {
      setAttendancePeriod(period);
    }
  }, [isCurrentYear]);

  /**
   * Refresh dashboard data
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData]);

  /**
   * Sync academic year from settings on mount and when settings change
   */
  useEffect(() => {
    if (settings.academic_year && settings.academic_year !== selectedAcademicYear) {
      setSelectedAcademicYear(settings.academic_year);
    }
  }, [settings.academic_year]);

  /**
   * Auto-load dashboard data on mount or when dependencies change
   */
  useEffect(() => {
    if (selectedAcademicYear) {
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  return {
    loading,
    refreshing,
    attendancePeriod,
    isCurrentYear,
    selectedAcademicYear,
    academicYears: ACADEMIC_YEAR_OPTIONS,
    overview,
    attendanceTrends,
    classPerformance,
    infraStats,
    handleAttendancePeriodChange,
    handleAcademicYearChange,
    handleRefresh,
    fetchDashboardData,
  };
};
