/**
 * useTabState - Reusable Tab Management Hook
 * 
 * Extracted UI state logic for managing active tab in tabbed interfaces.
 * Can be used by any component with tabs (admin dashboard, etc).
 */

import { useState, useCallback } from 'react';

export interface UseTabStateReturn {
  activeTab: string;
  handleTabChange: (tab: string) => void;
}

/**
 * Manages active tab state for tabbed interfaces.
 * @param defaultTab - Default active tab (required)
 * @returns Active tab state and handler
 */
export const useTabState = (defaultTab: string): UseTabStateReturn => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    handleTabChange,
  };
};
