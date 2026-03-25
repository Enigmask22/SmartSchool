/**
 * usePeriodFilter - Reusable Period Filter Logic
 * 
 * Extracted repeated logic for managing date period selection.
 * Used by dashboards that need to filter data by time periods (7, 30, 90 days).
 */

import { useState, useCallback } from 'react';

export interface UsePeriodFilterReturn {
  selectedPeriod: string;
  handlePeriodChange: (period: string) => void;
}

/**
 * Manages period selection state for dashboard filters.
 * @param defaultPeriod - Default period (default: '30')
 * @returns Period state and handler
 */
export const usePeriodFilter = (defaultPeriod: string = '30'): UsePeriodFilterReturn => {
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);

  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
  }, []);

  return {
    selectedPeriod,
    handlePeriodChange,
  };
};
