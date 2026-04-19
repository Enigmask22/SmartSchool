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

import { useState, useCallback, useEffect } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { usePeriodFilter } from '../usePeriodFilter';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';

/**
 * Overview Data Structure
 */
export interface AdminOverviewData {
  total_users: number;
  total_students: number;
  total_classes: number;
  total_teachers: number;
  attendance_rate: number;
  period_days: number;
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
 * System Health Data Structure
 */
export interface SystemHealthData {
  database_status: string;
  error_count_24h: number;
  uptime: string;
}

/**
 * Hook Return Type
 */
export interface UseAdminDashboardReturn {
  loading: boolean;
  refreshing: boolean;
  selectedPeriod: string;
  selectedAcademicYear: string;
  academicYears: string[];
  overview: AdminOverviewData | null;
  attendanceTrends: AttendanceTrend[];
  classPerformance: ClassPerformanceData[];
  teacherPerformance: TeacherPerformanceData[];
  systemHealth: SystemHealthData | null;
  handlePeriodChange: (period: string) => void;
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

  // Period filtering - using reusable hook
  const { selectedPeriod, handlePeriodChange } = usePeriodFilter('30');

  // Data state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || ACADEMIC_YEAR_OPTIONS[0]);
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformanceData[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformanceData[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);

  /**
   * Fetch dashboard data from API
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Ensure we have a valid academic year
      const yearToFetch = selectedAcademicYear || settings.academic_year || ACADEMIC_YEAR_OPTIONS[0];
      const periodDays = parseInt(selectedPeriod);
      
      logger.debug(`Fetching dashboard data for ${yearToFetch} (period: ${periodDays} days)`);
      logger.debug(`Selected academic year: ${selectedAcademicYear}, Settings: ${settings.academic_year}, Default: ${ACADEMIC_YEAR_OPTIONS[0]}`);
      
      // Build query string manually (same pattern as homeroom dashboard)
      const buildQueryString = (params: Record<string, any>) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            qs.set(key, String(value));
          }
        });
        return qs.toString();
      };

      // Fetch overview
      try {
        const params = {
          academic_year: yearToFetch,
          period_days: periodDays,
        };
        logger.debug(`Overview params: ${JSON.stringify(params)}`);
        const qs = buildQueryString(params);
        const overviewResponse = await api.request(`/admin/dashboard/overview?${qs}`);
        logger.debug(`Overview response: ${JSON.stringify(overviewResponse)}`);
        if (overviewResponse?.success) {
          setOverview(overviewResponse.data);
        }
      } catch (error) {
        logger.error('Error fetching overview:', error);
      }

      // Fetch attendance trends
      try {
        const params = {
          academic_year: yearToFetch,
          period_days: periodDays,
        };
        logger.debug(`Trends params: ${JSON.stringify(params)}`);
        const qs = buildQueryString(params);
        const trendsResponse = await api.request(`/admin/dashboard/attendance-trends?${qs}`);
        logger.debug(`Trends response: ${JSON.stringify(trendsResponse)}`);
        if (trendsResponse?.success) {
          setAttendanceTrends(trendsResponse.data || []);
        }
      } catch (error) {
        logger.error('Error fetching attendance trends:', error);
      }

      // Fetch class performance
      try {
        const params = {
          academic_year: yearToFetch,
          period_days: periodDays,
        };
        logger.debug(`Performance params: ${JSON.stringify(params)}`);
        const qs = buildQueryString(params);
        const performanceResponse = await api.request(`/admin/dashboard/class-performance?${qs}`);
        logger.debug(`Performance response: ${JSON.stringify(performanceResponse)}`);
        if (performanceResponse?.success) {
          setClassPerformance(performanceResponse.data || []);
        }
      } catch (error) {
        logger.error('Error fetching class performance:', error);
      }

      // Fetch system health
      try {
        const healthResponse = await api.request('/admin/dashboard/system-health');
        if (healthResponse?.success) {
          setSystemHealth(healthResponse.data);
        }
      } catch (error) {
        logger.error('Error fetching system health:', error);
      }

      // Teacher performance - temporarily set empty (endpoint could be added later)
      setTeacherPerformance([]);
    } catch (error) {
      logger.error('Error fetching admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedPeriod, settings.academic_year]);

  /**
   * Handle academic year change
   */
  const handleAcademicYearChange = useCallback((year: string) => {
    setSelectedAcademicYear(year);
  }, []);

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
    selectedPeriod,
    selectedAcademicYear,
    academicYears: ACADEMIC_YEAR_OPTIONS,
    overview,
    attendanceTrends,
    classPerformance,
    teacherPerformance,
    systemHealth,
    handlePeriodChange,
    handleAcademicYearChange,
    handleRefresh,
    fetchDashboardData,
  };
};
