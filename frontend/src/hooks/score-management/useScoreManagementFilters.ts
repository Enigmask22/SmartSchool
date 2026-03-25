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
export const useScoreManagementFilters = (
  defaultAcademicYear: string = '2024-2025',
  defaultSemester: string = 'HK1'
): UseScoreManagementFiltersReturn => {
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear);
  const [semester, setSemester] = useState(defaultSemester);
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
