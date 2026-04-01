import { useState } from 'react';

/**
 * Hook for managing score column configuration
 * Used in score_settings and subjects tabs to track and edit score column structure
 */
export function useScoreColumnManagement() {
  const [scoreColumns, setScoreColumns] = useState<any[]>([]);
  const [editingColumnKey, setEditingColumnKey] = useState<any>(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnFormData, setColumnFormData] = useState<Record<string, any>>({
    key: '',
    label: '',
    he_so: 1,
    hasSubColumns: false,
    subColumns: [],
  });

  return {
    scoreColumns,
    setScoreColumns,
    editingColumnKey,
    setEditingColumnKey,
    showColumnForm,
    setShowColumnForm,
    columnFormData,
    setColumnFormData,
  };
}
