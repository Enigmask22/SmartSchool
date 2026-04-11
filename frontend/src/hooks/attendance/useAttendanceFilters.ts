import { useState } from 'react';
import { useSystemSettings } from '@/contexts/useSystemSettings';

/**
 * useAttendanceFilters - Filter State Management Hook
 * Manages all filter UI state for attendance view
 * 
 * Responsibilities:
 * - Maintain filter selections (date, class, status, year, view mode)
 * - Provide handlers for filter changes
 * - Handle filter reset
 * 
 * Does NOT:
 * - Make API calls
 * - Fetch data
 * - Manage pagination
 * - Manage edit state
 */

interface UseAttendanceFiltersReturn {
  // Filter state
  selectedDate: string;
  selectedClass: string;
  selectedStatus: string;
  selectedAcademicYear: string;
  showFullList: boolean;

  // Setters
  setSelectedDate: (date: string) => void;
  setSelectedClass: (className: string) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedAcademicYear: (year: string) => void;
  setShowFullList: (show: boolean) => void;

  // Handlers
  handleDateChange: (newDate: string) => void;
  handleClassChange: (newClass: string) => void;
  handleStatusChange: (newStatus: string) => void;
  handleAcademicYearChange: (year: string) => void;
  handleViewModeChange: (showFull: boolean) => void;
  resetFilters: () => void;
}

export const useAttendanceFilters = (): UseAttendanceFiltersReturn => {
  const { settings } = useSystemSettings();
  
  // Initialize filter states
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || "2024-2025");
  const [showFullList, setShowFullList] = useState(true);

  /**
   * Handle date filter change
   * Pure state update - no side effects
   */
  const handleDateChange = (newDate: string): void => {
    setSelectedDate(newDate);
  };

  /**
   * Handle class filter change
   * Pure state update - no side effects
   */
  const handleClassChange = (newClass: string): void => {
    setSelectedClass(newClass);
  };

  /**
   * Handle status filter change
   * Pure state update - no side effects
   */
  const handleStatusChange = (newStatus: string): void => {
    setSelectedStatus(newStatus);
  };

  /**
   * Handle academic year change
   * Pure state update - no side effects
   */
  const handleAcademicYearChange = (year: string): void => {
    setSelectedAcademicYear(year);
  };

  /**
   * Handle view mode toggle (full list vs paginated)
   * Pure state update - no side effects
   */
  const handleViewModeChange = (showFull: boolean): void => {
    setShowFullList(showFull);
  };

  /**
   * Reset all filters to default state
   */
  const resetFilters = (): void => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedClass('all');
    setSelectedStatus('all');
    setSelectedAcademicYear(settings.academic_year || "2024-2025");
    setShowFullList(true);
  };

  return {
    // Filter state
    selectedDate,
    selectedClass,
    selectedStatus,
    selectedAcademicYear,
    showFullList,

    // Setters (for direct access when needed)
    setSelectedDate,
    setSelectedClass,
    setSelectedStatus,
    setSelectedAcademicYear,
    setShowFullList,

    // Handlers
    handleDateChange,
    handleClassChange,
    handleStatusChange,
    handleAcademicYearChange,
    handleViewModeChange,
    resetFilters,
  };
};
