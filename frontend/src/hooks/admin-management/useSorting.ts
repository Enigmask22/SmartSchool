import { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  field: string | null;
  direction: SortDirection;
}

export function useSorting(defaultField: string | null = 'id') {
  const [sortState, setSortState] = useState<SortState>({
    field: defaultField,
    direction: defaultField ? 'asc' : null,
  });

  const setSortField = useCallback((field: string | null) => {
    setSortState((prev) => {
      if (prev.field === field) {
        // Toggle direction if same field
        if (prev.direction === 'asc') {
          return { field, direction: 'desc' };
        } else if (prev.direction === 'desc') {
          return { field: null, direction: null };
        }
      }
      // New field, start with ascending
      return { field, direction: field ? 'asc' : null };
    });
  }, []);

  const sortData = useCallback((data: any[], field: string | null, direction: SortDirection) => {
    if (!field || !direction) {
      return [...data];
    }

    return [...data].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle nested/special fields
      if (field === 'subjects' && Array.isArray(aValue)) {
        aValue = aValue.length;
        bValue = Array.isArray(bValue) ? bValue.length : 0;
      } else if (field === 'classes' && a.class_names) {
        aValue = a.class_names?.length || 0;
        bValue = b.class_names?.length || 0;
      } else if (field === 'full_name') {
        // For Vietnamese names, sort by first name (last word in the string)
        const getFirstName = (name: string) => {
          if (!name) return '';
          const parts = name.trim().split(' ');
          return parts[parts.length - 1];
        };
        aValue = getFirstName(String(aValue || ''));
        bValue = getFirstName(String(bValue || ''));
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? 1 : -1;
      if (bValue == null) return direction === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'vi-VN');
        return direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return direction === 'asc' 
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : aValue ? -1 : 1);
      }

      // Default string comparison
      const stringA = String(aValue).toLowerCase();
      const stringB = String(bValue).toLowerCase();
      const comparison = stringA.localeCompare(stringB, 'vi-VN');
      return direction === 'asc' ? comparison : -comparison;
    });
  }, []);

  const applySorting = useCallback((data: any[]) => {
    return sortData(data, sortState.field, sortState.direction);
  }, [sortState, sortData]);

  const resetSort = useCallback(() => {
    setSortState({ field: null, direction: null });
  }, []);

  return {
    sortState,
    setSortField,
    sortData,
    applySorting,
    resetSort,
  };
}
