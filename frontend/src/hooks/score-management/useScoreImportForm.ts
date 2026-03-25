import { useState } from 'react';

export interface ImportedGradeRow {
  student_id: string;
  ho_va_ten: string;
  [key: string]: string | number | null;
}

export interface UseScoreImportFormReturn {
  showImportModal: boolean;
  importedData: ImportedGradeRow[];
  importErrors: string[];
  setShowImportModal: (show: boolean) => void;
  setImportedData: (data: ImportedGradeRow[]) => void;
  setImportErrors: (errors: string[]) => void;
  resetImportForm: () => void;
  hasImportErrors: boolean;
}

/**
 * Manages import modal and data state for score management.
 * 
 * Returns: See UseScoreImportFormReturn interface
 */
export const useScoreImportForm = (): UseScoreImportFormReturn => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ImportedGradeRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const hasImportErrors = importErrors.length > 0;

  const resetImportForm = () => {
    setShowImportModal(false);
    setImportedData([]);
    setImportErrors([]);
  };

  return {
    showImportModal,
    importedData,
    importErrors,
    setShowImportModal,
    setImportedData,
    setImportErrors,
    resetImportForm,
    hasImportErrors,
  };
};
