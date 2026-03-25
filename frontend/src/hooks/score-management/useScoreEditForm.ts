import { useState } from 'react';
import { StudentWithScore } from './useScoreManagementAPI';

export interface ScoreFormData {
  [key: string]: {
    He_so?: number;
    Diem: string | number;
  };
}

export interface UseScoreEditFormReturn {
  editingStudent: StudentWithScore | null;
  scoreForm: ScoreFormData;
  setEditingStudent: (student: StudentWithScore | null) => void;
  setScoreForm: (form: ScoreFormData) => void;
  updateScoreField: (columnName: string, value: string | number) => void;
  normalizeScoreInput: (value: string) => string;
  resetForm: () => void;
}

/**
 * Manages score edit form state and validation.
 * 
 * Returns: See UseScoreEditFormReturn interface
 */
export const useScoreEditForm = (): UseScoreEditFormReturn => {
  const [editingStudent, setEditingStudent] = useState<StudentWithScore | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreFormData>({});

  const normalizeScoreInput = (value: string): string => {
    let normalizedValue = value.trim();

    if (normalizedValue !== '') {
      const upperValue = normalizedValue.toUpperCase();

      if (
        upperValue === 'Đ' ||
        upperValue === 'D' ||
        upperValue === 'DAT' ||
        upperValue === 'ĐẠT'
      ) {
        normalizedValue = 'Đ';
      } else if (
        upperValue === 'KĐ' ||
        upperValue === 'KD' ||
        upperValue === 'KHONG_DAT' ||
        upperValue === 'KHONGDAT' ||
        upperValue === 'KHÔNG_ĐẠT' ||
        upperValue === 'KHÔNG ĐẠT'
      ) {
        normalizedValue = 'KĐ';
      }
    }

    return normalizedValue;
  };

  const updateScoreField = (columnName: string, value: string | number) => {
    const normalizedValue = typeof value === 'string' ? normalizeScoreInput(value) : value;
    
    setScoreForm((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        Diem: normalizedValue,
      },
    }));
  };

  const resetForm = () => {
    setEditingStudent(null);
    setScoreForm({});
  };

  return {
    editingStudent,
    scoreForm,
    setEditingStudent,
    setScoreForm,
    updateScoreField,
    normalizeScoreInput,
    resetForm,
  };
};
