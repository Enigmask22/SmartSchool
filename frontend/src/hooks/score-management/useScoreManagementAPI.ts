import { useState, useEffect, useContext } from 'react';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { AuthContext } from '@/contexts/AuthContext';
import api from '@/utils/api';
import logger from '@/utils/logger';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

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

export interface UseScoreManagementAPIReturn {
  loading: boolean;
  error: string | null;
  teacherInfo: TeacherInfo | null;
  students: StudentWithScore[];
  scoreConfig: ScoreConfig | null;
  fetchTeacherInfo: (academicYear?: string, semester?: string) => Promise<void>;
  handleClassSubjectSelect: (classSubject: any, academicYear?: string, semester?: string) => Promise<void>;
  handleSaveScore: (
    editingStudent: StudentWithScore | null,
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    scoreForm: Record<string, any>,
    onSuccess: () => void
  ) => Promise<void>;
  handleSaveConfig: (
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    configForm: ScoreColumnConfig,
    onSuccess: (config: ScoreConfig) => void
  ) => Promise<void>;
  handleDownloadTemplate: (classSubjectId: number) => Promise<void>;
  handleFileUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    scoreConfig: ScoreConfig | null,
    onDataReady: (data: any[], errors: string[]) => void
  ) => Promise<void>;
  handleConfirmImport: (
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    importedData: any[],
    onSuccess: () => Promise<void>
  ) => Promise<void>;
  getDisplayColumns: (scoreColumnConfig: ScoreColumnConfig) => DisplayColumn[];
  flattenScoreColumns: (config: ScoreColumnConfig) => FlatColumn[];
  getSortedColumnNames: (scoreColumnConfig: ScoreColumnConfig) => string[];
  calculateFinalScore: (
    gradeData: Record<string, { Diem: number | string }>,
    scoreColumnConfig: ScoreColumnConfig
  ) => number | string;
  initializeScoreForm: (
    student: Student,
    score: Score | null
  ) => Record<string, any>;
}

/**
 * Manages score management API calls and data fetching.
 * 
 * Dependencies:
 * - AuthContext (user)
 * - SystemSettingsContext (academicYear, semester defaults)
 * - API endpoints: /teacher/info, /students/by-class-subject, /score-config, /scores, /import/bulk, etc.
 * 
 * Returns: See UseScoreManagementAPIReturn interface
 */
export const useScoreManagementAPI = (): UseScoreManagementAPIReturn => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { settings } = useSystemSettings();
  const defaultAcademicYear = settings.academic_year || "2024-2025";
  const defaultSemester = settings.semester || "HK1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [students, setStudents] = useState<StudentWithScore[]>([]);
  const [scoreConfig, setScoreConfig] = useState<ScoreConfig | null>(null);

  const fetchTeacherInfo = async (academicYear?: string, semester?: string) => {
    try {
      setLoading(true);
      setError(null);
      const year = academicYear || defaultAcademicYear || "2024-2025";
      const sem = semester || defaultSemester || "HK1";
      //logger.debug('[useScoreManagementAPI] fetchTeacherInfo with params:', { year, sem });
      const response = await api.getTeacherInfo(year, sem);
      //logger.debug('[useScoreManagementAPI] fetchTeacherInfo response:', response);
      if (response.success) {
        //logger.debug('[useScoreManagementAPI] assigned_classes:', response.data?.assigned_classes);
        setTeacherInfo(response.data);
      } else {
        //logger.error('Failed to fetch teacher info:', response.message);
        setError('Không thể tải thông tin giáo viên');
      }
    } catch (err) {
      logger.error('Error fetching teacher info:', err);
      setError('Lỗi khi tải thông tin giáo viên');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubjectSelect = async (classSubject: any, academicYear?: string, semester?: string) => {
    try {
      setLoading(true);
      setError(null);
      const studentsResponse = await api.getStudentsByClassSubject(
        classSubject.id,
        academicYear || defaultAcademicYear || '2024-2025',
        semester || defaultSemester || 'HK1'
      );

      if (studentsResponse.success) {
        const sortedStudents = (studentsResponse.data.students || []).sort(
          (a: any, b: any) => {
            const aId = parseInt(a.student?.student_id) || 0;
            const bId = parseInt(b.student?.student_id) || 0;
            return aId - bId;
          }
        );
        setStudents(sortedStudents);
      }

      const configResponse = await api.getScoreConfigBySubject(classSubject.subject_id);

      if (
        configResponse &&
        configResponse.success &&
        configResponse.data &&
        configResponse.data.score_column_config &&
        Object.keys(configResponse.data.score_column_config).length > 0
      ) {
        setScoreConfig(configResponse.data);
      } else {
        setScoreConfig(null);
      }
    } catch (err) {
      logger.error('Error fetching class/subject data:', err);
      setError('Lỗi khi tải dữ liệu lớp');
      setScoreConfig(null);
    } finally {
      setLoading(false);
    }
  };

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

    const sortedKeys = Object.keys(scoreColumnConfig).sort(
      (a, b) => (priorityOrder[a] || 999) - (priorityOrder[b] || 999)
    );

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

  const flattenScoreColumns = (config: ScoreColumnConfig): FlatColumn[] => {
    const flatColumns: FlatColumn[] = [];

    Object.keys(config).forEach((columnName) => {
      const column = config[columnName];

      if (column.data && typeof column.data === 'object' && Object.keys(column.data).length > 0) {
        Object.keys(column.data).forEach((childName) => {
          flatColumns.push({
            key: childName,
            label: column.data![childName].label || childName,
            he_so: column.data![childName].he_so,
          });
        });
      } else {
        flatColumns.push({
          key: columnName,
          label: column.label || columnName,
          he_so: column.he_so,
        });
      }
    });

    return flatColumns;
  };

  const getSortedColumnNames = (scoreColumnConfig: ScoreColumnConfig): string[] => {
    return Object.keys(scoreColumnConfig).sort((a, b) => {
      const aHeSo = scoreColumnConfig[a].he_so;
      const bHeSo = scoreColumnConfig[b].he_so;
      return aHeSo - bHeSo;
    });
  };

  const calculateFinalScore = (
    gradeData: Record<string, { Diem: number | string }>,
    scoreColumnConfig: ScoreColumnConfig
  ): number | string => {
    const flatColumns = flattenScoreColumns(scoreColumnConfig);

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

  const initializeScoreForm = (
    _student: Student,
    score: Score | null
  ): Record<string, any> => {
    if (!score) return {};
    return score.score_data || {};
  };

  const handleSaveScore = async (
    editingStudent: StudentWithScore | null,
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    scoreForm: Record<string, any>,
    onSuccess: () => void
  ): Promise<void> => {
    if (!editingStudent) return;

    try {
      const scoreData = {
        student_id: editingStudent.student.id,
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
        toast.success('Lưu điểm thành công!');
        onSuccess();
      } else {
        toast.error('Lỗi khi lưu điểm: ' + response.message);
      }
    } catch (err) {
      logger.error('Error saving score:', err);
      toast.error('Lỗi khi lưu điểm!');
    }
  };

  const handleSaveConfig = async (
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    configForm: ScoreColumnConfig,
    onSuccess: (config: ScoreConfig) => void
  ): Promise<void> => {
    try {
      const configData = {
        subject_id: selectedClassSubject.subject_id,
        academic_year: academicYear,
        semester: semester,
        score_column_config: configForm,
      };

      const response = await api.upsertScoreConfig(configData);

      if (response.success) {
        toast.success('Lưu cấu hình cột điểm thành công!');
        onSuccess(response.data);
      } else {
        toast.error('Lỗi khi lưu cấu hình: ' + response.message);
      }
    } catch (err) {
      logger.error('Error saving config:', err);
      toast.error('Lỗi khi lưu cấu hình!');
    }
  };

  const handleDownloadTemplate = async (classSubjectId: number): Promise<void> => {
    try {
      await api.downloadScoreTemplate(classSubjectId);
      toast.success('Tải template thành công!');
    } catch (err) {
      logger.error('Error downloading template:', err);
      toast.error('Lỗi khi tải template!');
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    scoreConfig: ScoreConfig | null,
    onDataReady: (data: any[], errors: string[]) => void
  ): Promise<void> => {
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

        if (jsonData.length === 0) {
          toast.error('File không có dữ liệu!');
          return;
        }

        const errors: string[] = [];
        const validData: any[] = [];

        const flatColumns = flattenScoreColumns(scoreConfig?.score_column_config || {});
        const expectedColumnKeys = flatColumns.map((col) => col.key);

        const requiredColumns = ['id', 'ho_va_ten', ...expectedColumnKeys];
        const firstRow = jsonData[0] as Record<string, any>;
        const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

        if (missingColumns.length > 0) {
          toast.error(`File thiếu các cột: ${missingColumns.join(', ')}`);
          return;
        }

        jsonData.forEach((row: any, index: number) => {
          const rowNum = index + 2;

          if (!row.id) {
            errors.push(`Dòng ${rowNum}: Thiếu ID học sinh`);
            return;
          }

          let hasInvalidScore = false;

          expectedColumnKeys.forEach((key) => {
            const value = row[key];
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
                    `Dòng ${rowNum} - ${row.ho_va_ten || row.id}: Điểm ${key} không hợp lệ (${value})`
                  );
                  hasInvalidScore = true;
                }
              }
            }
          });

          if (!hasInvalidScore) {
            const gradeData: any = {
              student_id: row.id,
              ho_va_ten: row.ho_va_ten,
            };

            expectedColumnKeys.forEach((key) => {
              const value = row[key];
              if (value === '' || value === null || value === undefined) {
                gradeData[key] = null;
              } else {
                const valueStr = String(value).trim().toUpperCase();
                if (valueStr === 'Đ' || valueStr === 'D' || valueStr === 'DAT' || valueStr === 'ĐẠT') {
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
          onDataReady([], errors);
          toast.error(`File có ${errors.length} lỗi`);
          return;
        }

        onDataReady(validData, []);
      } catch (err) {
        logger.error('Error parsing file:', err);
        toast.error('Lỗi khi đọc file!');
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleConfirmImport = async (
    selectedClassSubject: any,
    academicYear: string,
    semester: string,
    importedData: any[],
    onSuccess: () => Promise<void>
  ): Promise<void> => {
    if (importedData.length === 0) {
      toast.error('Không có dữ liệu để import!');
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
        toast.success(`${response.message}`);
        await onSuccess();
      } else {
        toast.error('Lỗi khi import điểm: ' + response.message);
      }
    } catch (err) {
      logger.error('Error importing grades:', err);
      toast.error('Lỗi khi import điểm!');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTeacherInfo(settings.academic_year, settings.semester);
    }
  }, [user]);

  return {
    loading,
    error,
    teacherInfo,
    students,
    scoreConfig,
    fetchTeacherInfo,
    handleClassSubjectSelect,
    handleSaveScore,
    handleSaveConfig,
    handleDownloadTemplate,
    handleFileUpload,
    handleConfirmImport,
    getDisplayColumns,
    flattenScoreColumns,
    getSortedColumnNames,
    calculateFinalScore,
    initializeScoreForm,
  };
};
