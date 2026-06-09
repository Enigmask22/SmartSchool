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
  updateScoreField: (columnName: string, value: string | number, isChar?: boolean) => void;
  normalizeScoreInput: (value: string, isChar?: boolean) => string;
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

  const normalizeScoreInput = (value: string, isChar: boolean = false): string => {
    let normalizedValue = value.trim();
    if (!normalizedValue) return "";

    if (isChar) {
      const upperValue = normalizedValue.toUpperCase();
      if (
        upperValue === 'Đ' ||
        upperValue === 'D' ||
        upperValue === 'DAT' ||
        upperValue === 'ĐẠT'
      ) {
        return 'Đ';
      }
      if (
        upperValue === 'KĐ' ||
        upperValue === 'KD' ||
        upperValue === 'KHONG_DAT' ||
        upperValue === 'KHONGDAT' ||
        upperValue === 'KHÔNG_ĐẠT' ||
        upperValue === 'KHÔNG ĐẠT'
      ) {
        return 'KĐ';
      }
      return ""; // Invalid for char type, reject
    }

    // Numeric: only 0-10, step 0.5
    const num = parseFloat(normalizedValue);
    if (isNaN(num) || num < 0 || num > 10) return "";
    // Round to nearest 0.5
    return String(Math.round(num * 2) / 2);
  };

  const updateScoreField = (columnName: string, value: string | number, isChar: boolean = false) => {
    const normalizedValue = typeof value === 'string' ? normalizeScoreInput(value, isChar) : value;

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
