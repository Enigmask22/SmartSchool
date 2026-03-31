import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/utils/api';
import logger from '@/utils/logger';

// Constants - keep from original
const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

export const ACADEMIC_YEARS = generateAcademicYears();
export const SEMESTERS = ['HK1', 'HK2', 'HK3'];

// Re-export types from API hook
export type {
  ScoreColumnConfig,
  DisplayColumn,
  FlatColumn,
  Student,
  Score,
  StudentWithScore,
  ScoreConfig,
  TeacherInfo,
  UseScoreManagementAPIReturn,
} from './useScoreManagementAPI';

export type { UseScoreEditFormReturn, ScoreFormData } from './useScoreEditForm';
export type { UseScoreConfigFormReturn, NewColumnFormData } from './useScoreConfigForm';
export type { UseScoreImportFormReturn, ImportedGradeRow } from './useScoreImportForm';
export type { UseScoreManagementFiltersReturn } from './useScoreManagementFilters';

// Confirm dialog interface - minimal
export interface ConfirmState {
  open: boolean;
  variant?: 'destructive' | 'default';
  confirmText?: string;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  cancelText?: string;
}

/**
 * useScoreManagement Hook - Minimal version
 * 
 * Only handles confirm dialog state and template download callback.
 * All other state/handlers are now in split hooks.
 */
export const useScoreManagement = (selectedClassSubjectId?: number) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  const openConfirm = useCallback(
    (config: Omit<ConfirmState, 'open'>) =>
      setConfirmState({ open: true, variant: 'destructive', confirmText: 'Xác nhận', ...config }),
    []
  );

  const closeConfirm = useCallback(
    () => setConfirmState((prev) => ({ ...prev, open: false })),
    []
  );

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await api.downloadScoreTemplate(selectedClassSubjectId || 0);
      toast.success('Tải template thành công!');
    } catch (error) {
      logger.error('Error downloading template:', error);
      toast.error('Lỗi khi tải template!');
    }
  }, [selectedClassSubjectId]);

  return {
    confirmState,
    openConfirm,
    closeConfirm,
    handleDownloadTemplate,
  };
};

export default useScoreManagement;
