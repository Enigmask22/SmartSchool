import { useSystemSettings } from '@/contexts/useSystemSettings';
import { useState } from 'react';

export interface UseScoreManagementFiltersReturn {
  academicYear: string;
  semester: string;
  currentPage: number;
  pageSize: number;
  setAcademicYear: (year: string) => void;
  setSemester: (semester: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getTotalPages: (total: number) => number;
  resetPagination: () => void;
}

/**
 * Manages filter and pagination state for score management.
 * 
 * Returns: See UseScoreManagementFiltersReturn interface
 */
export const useScoreManagementFilters = ()
  : UseScoreManagementFiltersReturn => {
  const { settings} = useSystemSettings();
  const [academicYear, setAcademicYear] = useState(settings.academic_year || "");
  const [semester, setSemester] = useState(settings.semester || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const getTotalPages = (total: number): number => {
    return Math.ceil(total / pageSize);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    academicYear,
    semester,
    currentPage,
    pageSize,
    setAcademicYear,
    setSemester,
    setCurrentPage,
    setPageSize,
    getTotalPages,
    resetPagination,
  };
};
