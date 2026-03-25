import { useState, useEffect, useContext, useCallback } from 'react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { AuthContext } from '@/contexts/AuthContext';
import api from '@/utils/api';
import * as XLSX from 'xlsx';
import logger from '@/utils/logger';

// Constants
export const SEMESTERS = ['HK1', 'HK2', 'HK3'];

const generateAcademicYears = (): string[] => {
  const years: string[] = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

export const ACADEMIC_YEARS = generateAcademicYears();

// Types
export interface ScoreColumnConfig {
  [key: string]: {
    label: string;
    he_so: number;
    data?: Record<string, { label: string; he_so: number }>;
  };
}

export interface DisplayColumn {
  key: string;
  label: string;
  he_so?: number;
  hasChildren?: boolean;
  children?: Array<{ key: string; label: string; he_so: number }>;
}

export interface FlatColumn {
  key: string;
  label: string;
  he_so: number;
}

export interface Student {
  id: number;
  student_id: string;
  full_name: string;
}

export interface Score {
  id: number;
  score_data: Record<string, { Diem: number | string }>;
}

export interface StudentWithScore {
  student: Student;
  score?: Score;
}

export interface ScoreConfig {
  id: number;
  score_column_config: ScoreColumnConfig;
}

export interface TeacherInfo {
  teacher: { full_name: string };
  assigned_classes: Array<{
    id: number;
    subject_id: number;
    classes: { class_name: string; grade: string };
    subjects: { subject_name: string };
  }>;
}

export interface ConfirmState {
  open: boolean;
  variant?: 'destructive' | 'default';
  confirmText?: string;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  cancelText?: string;
}

export interface ScoreFormData {
  [key: string]: {
    He_so: number;
    Diem: string | number;
  };
}

export interface ImportedGradeRow {
  student_id: string;
  ho_va_ten: string;
  [key: string]: string | number | null;
}

/**
 * useScoreManagement Hook
 * Manages all grade management state and logic
 *
 * Returns all necessary state, handlers, and helper functions
 */
export const useScoreManagement = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const {
    academicYear: defaultAcademicYear,
    semester: defaultSemester,
    loading: _settingsLoading,
  } = useSystemSettings();

  // Data states
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [selectedClassSubject, setSelectedClassSubject] = useState<any>(null);
  const [students, setStudents] = useState<StudentWithScore[]>([]);
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig | null>(null);

  // Edit states
  const [editingStudent, setEditingStudent] = useState<StudentWithScore | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreFormData>({});

  // Config editor states
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configForm, setConfigForm] = useState<ScoreColumnConfig>({});
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({
    name: '',
    label: '',
    he_so: 1,
  });

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ImportedGradeRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter states
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear || '2024-2025');
  const [semester, setSemester] = useState(defaultSemester || 'HK1');

  // Confirm dialog state
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

  // Effects
  useEffect(() => {
    if (defaultAcademicYear) {
      setAcademicYear(defaultAcademicYear);
    }
  }, [defaultAcademicYear]);

  useEffect(() => {
    if (defaultSemester) {
      setSemester(defaultSemester);
    }
  }, [defaultSemester]);

  useEffect(() => {
    if (academicYear && semester) {
      fetchTeacherInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, academicYear, semester]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassSubject]);

  // ===== API Functions =====

  const fetchTeacherInfo = async () => {
    try {
      setLoading(true);
      // Use defaults if not explicitly passed
      const response = await api.getTeacherInfo();
      if (response.success) {
        setTeacherInfo(response.data);
        setSelectedClassSubject(null);
      } else {
        logger.error('Failed to fetch teacher info:', response.message);
      }
    } catch (error) {
      logger.error('Error fetching teacher info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubjectSelect = async (classSubject: any) => {
    setSelectedClassSubject(classSubject);
    setLoading(true);

    try {
      // Fetch students
      const studentsResponse = await api.getStudentsByClassSubject(
        classSubject.id,
        academicYear,
        semester
      );

      if (studentsResponse.success) {
        const sortedStudents = (studentsResponse.data.students || []).sort((a: any, b: any) => {
          const aId = parseInt(a.student?.student_id) || 0;
          const bId = parseInt(b.student?.student_id) || 0;
          return aId - bId;
        });
        setStudents(sortedStudents);
      }

      // Fetch score config
      const configResponse = await api.getScoreConfigBySubject(
        classSubject.subject_id
      );

      logger.debug('Config response:', configResponse);

      if (configResponse && configResponse.success && configResponse.data) {
        const scoreColumnConfig = configResponse.data.score_column_config;
        logger.debug('score_column_config:', scoreColumnConfig);

        if (
          scoreColumnConfig &&
          typeof scoreColumnConfig === 'object' &&
          Object.keys(scoreColumnConfig).length > 0
        ) {
          logger.debug('Setting scoreConfig with data:', configResponse.data);
          setScoreConfig(configResponse.data);
        } else {
          logger.debug('score_column_config is empty, setting scoreConfig to null');
          setScoreConfig(null);
        }
      } else {
        logger.debug('No config response or failed, setting scoreConfig to null');
        setScoreConfig(null);
      }
    } catch (error) {
      logger.error('Error fetching data:', error);
      setScoreConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // ===== Helper Functions =====

  const getDisplayColumns = (scoreColumnConfig: ScoreColumnConfig): DisplayColumn[] => {
    const columns: DisplayColumn[] = [];
    if (!scoreColumnConfig) return columns;

    const priorityOrder: Record<string, number> = {
      Diem_thuong_xuyen: 1,
      diem_thuong_xuyen: 1,
      Diem_thi_giua_ki: 2,
      diem_thi_giua_ki: 2,
      Diem_thi_cuoi_ki: 3,
      diem_thi_cuoi_ki: 3,
    };

    const sortedKeys = Object.keys(scoreColumnConfig).sort((a, b) => {
      return (priorityOrder[a] || 999) - (priorityOrder[b] || 999);
    });

    sortedKeys.forEach((columnName) => {
      const columnConfig = scoreColumnConfig[columnName];

      if (columnConfig.data && typeof columnConfig.data === 'object') {
        const children = Object.keys(columnConfig.data).map((childName) => ({
          key: childName,
          label: columnConfig.data![childName].label || childName,
          he_so: columnConfig.data![childName].he_so,
        }));

        columns.push({
          key: columnName,
          label: columnConfig.label || columnName,
          hasChildren: true,
          children: children,
        });
      } else {
        columns.push({
          key: columnName,
          label: columnConfig.label || columnName,
          he_so: columnConfig.he_so,
          hasChildren: false,
        });
      }
    });

    return columns;
  };

  const flattenScoreColumns = (scoreColumnConfig: ScoreColumnConfig): FlatColumn[] => {
    const flatColumns: FlatColumn[] = [];
    if (!scoreColumnConfig) return flatColumns;

    Object.keys(scoreColumnConfig).forEach((columnName) => {
      const columnConfig = scoreColumnConfig[columnName];

      if (columnConfig.data && typeof columnConfig.data === 'object') {
        Object.keys(columnConfig.data).forEach((childName) => {
          flatColumns.push({
            key: childName,
            he_so: columnConfig.data![childName].he_so,
            label: columnConfig.data![childName].label || childName,
          });
        });
      } else {
        flatColumns.push({
          key: columnName,
          he_so: columnConfig.he_so,
          label: columnConfig.label || columnName,
        });
      }
    });

    const columnOrder: Record<string, number> = {
      Diem_tx1: 1,
      Diem_tx2: 2,
      Diem_tx3: 3,
      Diem_tx4: 4,
      Diem_thi_giua_ki: 10,
      Diem_thi_cuoi_ki: 11,
    };

    return flatColumns.sort((a, b) => {
      const orderA = columnOrder[a.key] || 999;
      const orderB = columnOrder[b.key] || 999;
      return orderA - orderB;
    });
  };

  const initializeScoreForm = (_student: any, existingScore: Score | null = null): ScoreFormData => {
    const form: ScoreFormData = {};

    if (scoreConfig && scoreConfig.score_column_config) {
      const flatColumns = flattenScoreColumns(scoreConfig.score_column_config);

      flatColumns.forEach((column) => {
        form[column.key] = {
          He_so: column.he_so,
          Diem: existingScore?.score_data?.[column.key]?.Diem || '',
        };
      });
    }

    return form;
  };

  const getSortedColumnNames = (scoreColumnConfig: ScoreColumnConfig): string[] => {
    if (!scoreColumnConfig) return [];

    const columnNames = Object.keys(scoreColumnConfig);

    const orderPriority: Record<string, number> = {
      diem_thi_cuoi_ki: 1,
      Diem_thi_cuoi_ki: 1,
      diem_ck: 1,
      diem_thi_giua_ki: 2,
      Diem_thi_giua_ki: 2,
      diem_gk: 2,
      diem_thuong_xuyen: 3,
      Diem_thuong_xuyen: 3,
      diem_tx: 3,
    };

    return columnNames.sort((a, b) => {
      const priorityA = orderPriority[a] || 999;
      const priorityB = orderPriority[b] || 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return 0;
    });
  };

  const calculateFinalGrade = (gradeData: ScoreFormData): string | number => {
    if (!gradeData || !scoreConfig?.score_column_config) return 0;

    const flatColumns = flattenScoreColumns(scoreConfig.score_column_config);

    let txScores: number[] = [];
    let giuaKiScore: number | null = null;
    let giuaKiWeight = 0;
    let cuoiKiScore: number | null = null;
    let cuoiKiWeight = 0;

    let isAllLetterGrades = true;
    let hasAnyGrade = false;

    flatColumns.forEach((column) => {
      if (gradeData[column.key]?.Diem) {
        hasAnyGrade = true;
        const diemValue = gradeData[column.key].Diem;
        const isLetter =
          typeof diemValue === 'string' && (diemValue === 'Đ' || diemValue === 'KĐ');
        if (!isLetter) {
          isAllLetterGrades = false;
        }
      }
    });

    if (!hasAnyGrade) return 0;

    flatColumns.forEach((column) => {
      if (gradeData[column.key]?.Diem) {
        const diemValue = gradeData[column.key].Diem;

        let score: number;

        if (
          isAllLetterGrades &&
          typeof diemValue === 'string' &&
          (diemValue === 'Đ' || diemValue === 'KĐ')
        ) {
          score = diemValue === 'Đ' ? 1 : 0;
        } else if (
          typeof diemValue === 'string' &&
          (diemValue === 'Đ' || diemValue === 'KĐ')
        ) {
          return;
        } else {
          score = parseFloat(String(diemValue));
        }

        if (isNaN(score)) {
          return;
        }

        const weight = parseFloat(String(column.he_so));

        if (column.key.startsWith('Diem_tx')) {
          txScores.push(score);
        } else if (column.key === 'Diem_thi_giua_ki') {
          giuaKiScore = score;
          giuaKiWeight = weight;
        } else if (column.key === 'Diem_thi_cuoi_ki') {
          cuoiKiScore = score;
          cuoiKiWeight = weight;
        }
      }
    });

    let txAverage = 0;
    if (txScores.length > 0) {
      txAverage = txScores.reduce((sum, score) => sum + score, 0) / txScores.length;
    }

    let totalScore = 0;
    let totalWeight = 0;

    if (txScores.length > 0) {
      totalScore += txAverage * 1;
      totalWeight += 1;
    }

    if (giuaKiScore !== null) {
      totalScore += giuaKiScore * giuaKiWeight;
      totalWeight += giuaKiWeight;
    }

    if (cuoiKiScore !== null) {
      totalScore += cuoiKiScore * cuoiKiWeight;
      totalWeight += cuoiKiWeight;
    }

    if (isAllLetterGrades) {
      return totalScore >= 5 ? 'Đ' : 'KĐ';
    }

    return totalWeight > 0 ? parseFloat((totalScore / totalWeight).toFixed(2)) : 0;
  };

  // ===== Score Management Handlers =====

  const handleEditScore = (student: StudentWithScore) => {
    setEditingStudent(student);
    const form = initializeScoreForm(student.student, student.score || null);
    setScoreForm(form);
  };

  const handleScoreInputChange = (columnName: string, value: string) => {
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

    setScoreForm((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        Diem: normalizedValue,
      },
    }));
  };

  const handleSaveScore = async () => {
    try {
      for (const [columnName, columnData] of Object.entries(scoreForm)) {
        const scoreValue = columnData?.Diem;

        if (scoreValue !== '' && scoreValue !== null && scoreValue !== undefined) {
          const valueStr = String(scoreValue).trim().toUpperCase();

          const isLetterGrade =
            valueStr === 'Đ' ||
            valueStr === 'D' ||
            valueStr === 'KĐ' ||
            valueStr === 'KD' ||
            valueStr === 'DAT' ||
            valueStr === 'ĐẠT' ||
            valueStr === 'KHONG_DAT' ||
            valueStr === 'KHONGDAT' ||
            valueStr === 'KHÔNG_ĐẠT' ||
            valueStr === 'KHÔNG ĐẠT';

          if (!isLetterGrade) {
            const numValue = parseFloat(String(scoreValue));
            if (isNaN(numValue) || numValue < 0 || numValue > 10) {
              alert(`Điểm ${columnName} không hợp lệ! Phải là số (0-10) hoặc Đ/KĐ`);
              return;
            }
          }
        }
      }

      const scoreData = {
        student_id: editingStudent!.student.id,
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        score_data: {
          Mon_hoc: selectedClassSubject.subjects.subject_name,
          ...scoreForm,
        },
      };

      const response = await api.createOrUpdateScore(scoreData);

      if (response.success) {
        handleClassSubjectSelect(selectedClassSubject);
        setEditingStudent(null);
        setScoreForm({});
        alert('Lưu điểm thành công!');
      } else {
        alert('Lỗi khi lưu điểm: ' + response.message);
      }
    } catch (error) {
      logger.error('Error saving score:', error);
      alert('Lỗi khi lưu điểm!');
    }
  };

  // ===== Score Config Handlers =====

  const handleShowConfigEditor = () => {
    if (scoreConfig) {
      setConfigForm({ ...scoreConfig.score_column_config });
    } else {
      setConfigForm({
        Diem_thuong_xuyen: { he_so: 1, label: 'Điểm TX' },
        Diem_thi_giua_ki: { he_so: 2, label: 'Điểm GK' },
        Diem_thi_cuoi_ki: { he_so: 3, label: 'Điểm CK' },
      });
    }
    setShowConfigEditor(true);
  };

  const handleConfigInputChange = (columnName: string, field: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        [field]: value,
      },
    }));
  };

  const handleAddColumn = () => {
    setShowAddColumnModal(true);
    setNewColumnForm({ name: '', label: '', he_so: 1 });
  };

  const handleConfirmAddColumn = () => {
    if (newColumnForm.name && newColumnForm.label) {
      const validName = newColumnForm.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');

      if (!validName) {
        alert('Tên cột không hợp lệ. Chỉ được sử dụng chữ cái, số và dấu gạch dưới.');
        return;
      }

      if (configForm[validName]) {
        alert('Cột điểm này đã tồn tại!');
        return;
      }

      setConfigForm((prev) => ({
        ...prev,
        [validName]: {
          he_so: parseInt(String(newColumnForm.he_so)) || 1,
          label: newColumnForm.label,
        },
      }));

      setShowAddColumnModal(false);
      setNewColumnForm({ name: '', label: '', he_so: 1 });
    } else {
      alert('Vui lòng điền đầy đủ thông tin!');
    }
  };

  const handleRemoveColumn = (columnName: string) => {
    if (Object.keys(configForm).length <= 1) {
      alert('Phải có ít nhất một cột điểm!');
      return;
    }

    openConfirm({
      title: 'Xóa cột điểm',
      description: `Bạn có chắc muốn xóa cột "${configForm[columnName]?.label || columnName}"?\n\nViệc xóa sẽ làm mất tất cả điểm số đã nhập cho cột này.`,
      confirmText: 'Xóa cột',
      onConfirm: () => {
        closeConfirm();
        setConfigForm((prev) => {
          const newForm = { ...prev };
          delete newForm[columnName];
          return newForm;
        });
      },
    });
  };

  const handleSaveConfig = async () => {
    try {
      if (Object.keys(configForm).length === 0) {
        alert('Phải có ít nhất một cột điểm!');
        return;
      }

      const invalidColumns = Object.keys(configForm).filter((columnName) => {
        const column = configForm[columnName];
        return !column.label || !column.he_so || column.he_so < 1 || column.he_so > 10;
      });

      if (invalidColumns.length > 0) {
        alert(
          'Vui lòng điền đầy đủ thông tin cho tất cả các cột điểm. Hệ số phải từ 1 đến 10.'
        );
        return;
      }

      const configData = {
        subject_id: selectedClassSubject.subject_id,
        academic_year: academicYear,
        semester: semester,
        score_column_config: configForm,
      };

      const response = await api.upsertScoreConfig(configData);

      if (response.success) {
        setScoreConfig(response.data);
        setShowConfigEditor(false);
        alert('✅ Lưu cấu hình cột điểm thành công!');
        handleClassSubjectSelect(selectedClassSubject);
      } else {
        alert('❌ Lỗi khi lưu cấu hình: ' + response.message);
      }
    } catch (error) {
      logger.error('Error saving config:', error);
      alert('❌ Lỗi khi lưu cấu hình!');
    }
  };

  // ===== Import/Export Handlers =====

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadScoreTemplate(selectedClassSubject.id);
      alert('✅ Tải template thành công!');
    } catch (error) {
      logger.error('Error downloading template:', error);
      alert('❌ Lỗi khi tải template!');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const errors: string[] = [];
        const validData: ImportedGradeRow[] = [];

        if (jsonData.length === 0) {
          alert('❌ File không có dữ liệu!');
          return;
        }

        const flatColumns = flattenScoreColumns(scoreConfig?.score_column_config || {});
        const expectedColumnKeys = flatColumns.map((col) => col.key);

        const requiredColumns = ['id', 'ho_va_ten', ...expectedColumnKeys];
        const firstRow = jsonData[0] as Record<string, any>;
        const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

        if (missingColumns.length > 0) {
          alert(
            `❌ File thiếu các cột: ${missingColumns.join(
              ', '
            )}\n\nVui lòng tải template để có đúng định dạng!`
          );
          return;
        }

        jsonData.forEach((row: any, index: number) => {
          const rowNum = index + 2;

          if (!row.id) {
            errors.push(`Dòng ${rowNum}: Thiếu ID học sinh`);
            return;
          }

          const scores: Record<string, any> = {};
          expectedColumnKeys.forEach((key) => {
            scores[key] = row[key];
          });

          let hasInvalidScore = false;
          Object.entries(scores).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
              const valueStr = String(value).trim().toUpperCase();

              const isLetterGrade =
                valueStr === 'Đ' ||
                valueStr === 'D' ||
                valueStr === 'KĐ' ||
                valueStr === 'KD' ||
                valueStr === 'DAT' ||
                valueStr === 'ĐẠT' ||
                valueStr === 'KHONG_DAT' ||
                valueStr === 'KHÔNG_ĐẠT' ||
                valueStr === 'KHONGDAT' ||
                valueStr === 'KHÔNG ĐẠT';

              if (!isLetterGrade) {
                const score = parseFloat(String(value));
                if (isNaN(score) || score < 0 || score > 10) {
                  errors.push(
                    `Dòng ${rowNum} - ${row.ho_va_ten || row.id}: Điểm ${key} không hợp lệ (${value}). Điểm phải từ 0-10 hoặc Đ/KĐ.`
                  );
                  hasInvalidScore = true;
                }
              }
            }
          });

          if (!hasInvalidScore) {
            const gradeData: ImportedGradeRow = {
              student_id: row.id,
              ho_va_ten: row.ho_va_ten,
            };

            expectedColumnKeys.forEach((key) => {
              const value = scores[key];
              if (value === '' || value === null || value === undefined) {
                gradeData[key] = null;
              } else {
                const valueStr = String(value).trim().toUpperCase();

                if (
                  valueStr === 'Đ' ||
                  valueStr === 'D' ||
                  valueStr === 'DAT' ||
                  valueStr === 'ĐẠT'
                ) {
                  gradeData[key] = 'Đ';
                } else if (
                  valueStr === 'KĐ' ||
                  valueStr === 'KD' ||
                  valueStr === 'KHONG_DAT' ||
                  valueStr === 'KHÔNG_ĐẠT' ||
                  valueStr === 'KHONGDAT' ||
                  valueStr === 'KHÔNG ĐẠT'
                ) {
                  gradeData[key] = 'KĐ';
                } else {
                  gradeData[key] = parseFloat(String(value));
                }
              }
            });

            validData.push(gradeData);
          }
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          alert(`❌ File có ${errors.length} lỗi. Vui lòng kiểm tra!`);
          return;
        }

        setImportedData(validData);
        setImportErrors([]);
        setShowImportModal(true);
      } catch (error) {
        logger.error('Error parsing file:', error);
        alert('❌ Lỗi khi đọc file! Vui lòng kiểm tra định dạng file.');
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      alert('Không có dữ liệu để import!');
      return;
    }

    try {
      setLoading(true);

      const importPayload = {
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grades: importedData,
      };

      const response = await api.bulkImportScores(importPayload);

      if (response.success) {
        alert(
          `✅ ${response.message}\n\nThành công: ${response.data.success_count} bản ghi${
            response.data.error_count > 0
              ? `\nLỗi: ${response.data.error_count} bản ghi`
              : ''
          }`
        );

        if (response.data.errors && response.data.errors.length > 0) {
          logger.debug('Import errors:', response.data.errors);
        }

        handleClassSubjectSelect(selectedClassSubject);
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        alert('❌ Lỗi khi import điểm: ' + response.message);
      }
    } catch (error) {
      logger.error('Error importing grades:', error);
      alert('❌ Lỗi khi import điểm!');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!selectedClassSubject || !scoreConfig) {
      alert('Vui lòng chọn lớp và có cấu hình điểm!');
      return;
    }

    try {
      // Export logic will be in the component/separate utility
      // This is just the trigger - actual export is handled in the component
      return { students, scoreConfig, selectedClassSubject, academicYear, semester };
    } catch (error) {
      logger.error('Error exporting:', error);
      alert('❌ Lỗi khi xuất Excel!');
    }
  };

  return {
    // Data
    loading,
    teacherInfo,
    selectedClassSubject,
    students,
    scoreConfig,

    // Edit states
    editingStudent,
    scoreForm,

    // Config editor
    showConfigEditor,
    configForm,
    showAddColumnModal,
    newColumnForm,

    // Import
    showImportModal,
    importedData,
    importErrors,

    // Pagination
    currentPage,
    pageSize,

    // Filters
    academicYear,
    semester,

    // Confirm dialog
    confirmState,

    // Setters
    setSelectedClassSubject,
    setEditingStudent,
    setScoreForm,
    setShowConfigEditor,
    setConfigForm,
    setShowAddColumnModal,
    setNewColumnForm,
    setShowImportModal,
    setImportedData,
    setImportErrors,
    setCurrentPage,
    setPageSize,
    setAcademicYear,
    setSemester,
    setConfirmState,

    // Handlers
    fetchTeacherInfo,
    handleClassSubjectSelect,
    handleEditScore,
    handleScoreInputChange,
    handleSaveScore,
    handleShowConfigEditor,
    handleConfigInputChange,
    handleAddColumn,
    handleConfirmAddColumn,
    handleRemoveColumn,
    handleSaveConfig,
    handleDownloadTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleExportToExcel,

    // Callbacks
    openConfirm,
    closeConfirm,

    // Helpers
    getDisplayColumns,
    flattenScoreColumns,
    initializeScoreForm,
    getSortedColumnNames,
    calculateFinalGrade,
  };
};
