import { useState } from 'react';
import { ScoreColumnConfig } from './useScoreManagementAPI';

export interface NewColumnFormData {
  name: string;
  label: string;
  he_so: number;
}

export interface UseScoreConfigFormReturn {
  showConfigEditor: boolean;
  configForm: ScoreColumnConfig;
  showAddColumnModal: boolean;
  newColumnForm: NewColumnFormData;
  setShowConfigEditor: (show: boolean) => void;
  setConfigForm: (form: ScoreColumnConfig) => void;
  setShowAddColumnModal: (show: boolean) => void;
  setNewColumnForm: (form: NewColumnFormData) => void;
  updateConfigField: (columnName: string, field: string, value: any) => void;
  removeConfigColumn: (columnName: string) => void;
  resetNewColumnForm: () => void;
  initializeConfigEditor: (baseConfig?: ScoreColumnConfig) => void;
}

/**
 * Manages score config editor and add column modal state.
 * 
 * Returns: See UseScoreConfigFormReturn interface
 */
export const useScoreConfigForm = (): UseScoreConfigFormReturn => {
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configForm, setConfigForm] = useState<ScoreColumnConfig>({});
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState<NewColumnFormData>({
    name: '',
    label: '',
    he_so: 1,
  });

  const updateConfigField = (columnName: string, field: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        [field]: value,
      },
    }));
  };

  const removeConfigColumn = (columnName: string) => {
    setConfigForm((prev) => {
      const newForm = { ...prev };
      delete newForm[columnName];
      return newForm;
    });
  };

  const resetNewColumnForm = () => {
    setNewColumnForm({ name: '', label: '', he_so: 1 });
  };

  const initializeConfigEditor = (baseConfig?: ScoreColumnConfig) => {
    if (baseConfig) {
      setConfigForm({ ...baseConfig });
    } else {
      setConfigForm({
        Diem_thuong_xuyen: { he_so: 1, label: 'Điểm TX' },
        Diem_thi_giua_ki: { he_so: 2, label: 'Điểm GK' },
        Diem_thi_cuoi_ki: { he_so: 3, label: 'Điểm CK' },
      });
    }
    setShowConfigEditor(true);
  };

  return {
    showConfigEditor,
    configForm,
    showAddColumnModal,
    newColumnForm,
    setShowConfigEditor,
    setConfigForm,
    setShowAddColumnModal,
    setNewColumnForm,
    updateConfigField,
    removeConfigColumn,
    resetNewColumnForm,
    initializeConfigEditor,
  };
};
