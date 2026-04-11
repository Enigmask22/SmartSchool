import { useState } from 'react';

export interface UseFaceManagementFiltersReturn {
  selectedClass: string;
  selectedAcademicYear: string;
  currentPage: number;
  pageSize: number;
  updateFilters: (updates: Partial<FilterState>) => void;
  resetPagination: () => void;
  setSelectedClass: (value: string) => void;
  setSelectedAcademicYear: (value: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  getTotalPages: (totalStudents: number) => number;
  getPaginatedStudents: <T,>(items: T[], pageSize: number, currentPage: number) => T[];
}

interface FilterState {
  selectedClass: string;
  selectedAcademicYear: string;
  currentPage: number;
  pageSize: number;
}

/**
 * Manages filter state and pagination for face management.
 * 
 * Returns: See UseFaceManagementFiltersReturn interface
 */
export const useFaceManagementFilters = () => {
  const [filters, setFilters] = useState<FilterState>({
    selectedClass: 'all',
    selectedAcademicYear: '',
    currentPage: 1,
    pageSize: 20,
  });

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const setSelectedClass = (value: string) => {
    updateFilters({ selectedClass: value, currentPage: 1 });
  };

  const setSelectedAcademicYear = (value: string) => {
    updateFilters({ selectedAcademicYear: value, currentPage: 1 });
  };

  const setCurrentPage = (page: number) => {
    updateFilters({ currentPage: page });
  };

  const setPageSize = (size: number) => {
    updateFilters({ pageSize: size, currentPage: 1 });
  };

  const resetPagination = () => {
    updateFilters({ currentPage: 1 });
  };

  const getTotalPages = (totalStudents: number): number => {
    return Math.ceil(totalStudents / filters.pageSize);
  };

  const getPaginatedStudents = <T,>(
    items: T[],
    pageSize: number,
    currentPage: number
  ): T[] => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  };

  return {
    selectedClass: filters.selectedClass,
    selectedAcademicYear: filters.selectedAcademicYear,
    currentPage: filters.currentPage,
    pageSize: filters.pageSize,
    updateFilters,
    resetPagination,
    setSelectedClass,
    setSelectedAcademicYear,
    setCurrentPage,
    setPageSize,
    getTotalPages,
    getPaginatedStudents,
  };
};
