/**
 * usePagination - Reusable Pagination Logic Hook
 * Handles all pagination calculations and state
 * 
 * Can be used anywhere pagination is needed (lists, grids, tables, etc.)
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Generic pagination item type
 */
export interface IPaginationItem {
  [key: string]: any;
}

/**
 * Hook Return Type
 */
export interface UsePaginationReturn<T extends IPaginationItem> {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  currentItems: T[];
  handlePageChange: (page: number) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * usePagination Hook
 * 
 * Generic pagination logic for any array of items
 * 
 * Features:
 * - Calculate total pages based on item count and items per page
 * - Return current page items
 * - Handle page changes
 * - Support dynamic items per page
 * 
 * Usage:
 * ```
 * const { currentPage, totalPages, currentItems, handlePageChange } = 
 *   usePagination(students, 12);
 * ```
 * 
 * @param items - Array of items to paginate
 * @param itemsPerPage - Number of items per page (default: 12)
 * @returns Pagination state and handlers
 */
export const usePagination = <T extends IPaginationItem>(
  items: T[],
  itemsPerPage: number = 12
): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Calculate total pages and current items
   */
  const { totalPages, currentItems } = useMemo(() => {
    const total = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const current = items.slice(startIndex, endIndex);

    return {
      totalPages: total,
      currentItems: current,
    };
  }, [items, currentPage, itemsPerPage]);

  /**
   * Handle page change with validation
   */
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    currentItems,
    handlePageChange,
    setCurrentPage,
  };
};
