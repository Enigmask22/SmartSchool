/**
 * useSubjectGradeManagement.ts
 *
 * Tách toàn bộ logic nghiệp vụ từ Subject GradeManagement.jsx:
 * - Quản lý năm học / học kỳ (đồng bộ với SystemSettingsContext)
 * - Load thông tin giáo viên và danh sách lớp-môn được phân công
 * - Load học sinh + điểm, cấu hình cột điểm
 * - Xử lý form nhập điểm, chuẩn hóa điểm chữ, validate và lưu
 * - Quản lý cấu hình cột điểm (thêm/xóa/sửa cột, hệ số)
 *
 * LƯU Ý: Hook này chỉ quản lý STATE + LOGIC.
 * Phần UI (Card, Table, Dialog, Excel export, file import preview, pagination, v.v.)
 * sẽ được xử lý trong component GradeManagement.jsx.
 */

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import api from "@/services/api";
import logger from "@/utils/logger";

export interface UseSubjectGradeManagementReturn {
  // Loading & meta
  loading: boolean;
  setLoading: (loading: boolean) => void;
  teacherInfo: any;

  // Filter & selection
  academicYear: string;
  semester: string;
  selectedClassSubject: any | null;

  // Data
  students: any[];
  scoreConfig: any | null;

  // Score editing
  editingStudent: any | null;
  scoreForm: any;

  // Config editing
  showConfigEditor: boolean;
  configForm: any;
  showAddColumnModal: boolean;
  newColumnForm: {
    name: string;
    label: string;
    he_so: number;
  };

  // Setters / handlers - filters & selection
  setAcademicYear: (year: string) => void;
  setSemester: (semester: string) => void;
  setSelectedClassSubject: (classSubject: any | null) => void;
  handleClassSubjectSelect: (classSubject: any) => Promise<void>;

  // Helpers for columns / display
  getDisplayColumns: (scoreColumnConfig: any) => any[];
  flattenScoreColumns: (scoreColumnConfig: any) => any[];
  calculateFinalGrade: (gradeData: any) => number | string;

  // Score form handlers
  handleEditScore: (student: any) => void;
  handleScoreInputChange: (columnName: string, value: string) => void;
  handleSaveScore: () => Promise<void>;
  closeEditingStudent: () => void;

  // Config handlers
  handleShowConfigEditor: () => void;
  handleConfigInputChange: (
    columnName: string,
    field: string,
    value: any
  ) => void;
  handleAddColumn: () => void;
  handleConfirmAddColumn: () => void;
  handleRemoveColumn: (columnName: string) => void;
  handleSaveConfig: () => Promise<void>;
  setShowConfigEditor: (open: boolean) => void;
  setShowAddColumnModal: (open: boolean) => void;
  setNewColumnForm: React.Dispatch<React.SetStateAction<{
    name: string;
    label: string;
    he_so: number;
  }>>;
}

export const useSubjectGradeManagement =
  (): UseSubjectGradeManagementReturn => {
    const { user } = useContext(AuthContext);
    const {
      academicYear: defaultAcademicYear,
      semester: defaultSemester,
      loading: settingsLoading,
    } = useSystemSettings();

    /** --------- STATE CHÍNH --------- */
    const [loading, setLoading] = useState(true);
    const [teacherInfo, setTeacherInfo] = useState<any | null>(null);
    const [selectedClassSubject, setSelectedClassSubject] = useState<any | null>(
      null
    );
    const [students, setStudents] = useState<any[]>([]);
    const [scoreConfig, setScoreConfig] = useState<any | null>(null);

    // Score editing
    const [editingStudent, setEditingStudent] = useState<any | null>(null);
    const [scoreForm, setScoreForm] = useState<any>({});

    // Config editing
    const [showConfigEditor, setShowConfigEditor] = useState(false);
    const [configForm, setConfigForm] = useState<any>({});
    const [showAddColumnModal, setShowAddColumnModal] = useState(false);
    const [newColumnForm, setNewColumnForm] = useState<{
      name: string;
      label: string;
      he_so: number;
    }>({
      name: "",
      label: "",
      he_so: 1,
    });

    // Filters - sync với SystemSettingsContext
    const [academicYear, setAcademicYear] = useState(
      defaultAcademicYear || "2024-2025"
    );
    const [semester, setSemester] = useState(defaultSemester || "HK1");

    /** --------- SYNC VỚI SYSTEM SETTINGS --------- */
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

    /** --------- LOAD THÔNG TIN GIÁO VIÊN --------- */
    useEffect(() => {
      if (academicYear && semester) {
        fetchTeacherInfo();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, academicYear, semester]);

    const fetchTeacherInfo = async () => {
      try {
        setLoading(true);
        const response = await api.getTeacherInfo(academicYear, semester);
        if (response.success) {
          setTeacherInfo(response.data);
          // Reset selected class subject when changing period
          setSelectedClassSubject(null);
        } else {
          logger.error("Failed to fetch teacher info:", response.message);
        }
      } catch (error: any) {
        logger.error("Error fetching teacher info:", error);
      } finally {
        setLoading(false);
      }
    };

    /** --------- CHỌN LỚP - MÔN --------- */
    const handleClassSubjectSelect = async (classSubject: any) => {
      setSelectedClassSubject(classSubject);
      setLoading(true);

      try {
        // Fetch students for this class-subject
        const studentsResponse = await api.getStudentsByClassSubject(
          classSubject.id,
          academicYear,
          semester
        );

        if (studentsResponse.success) {
          // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
          const sortedStudents =
            (studentsResponse.data.students || []).sort((a: any, b: any) => {
              const aId = parseInt(a.student?.student_id) || 0;
              const bId = parseInt(b.student?.student_id) || 0;
              return aId - bId;
            });
          setStudents(sortedStudents);
        }

        // Fetch score config for this subject
        const configResponse = await api.getScoreConfigBySubject(
          classSubject.subject_id,
          academicYear,
          semester
        );

        logger.debug("Config response:", configResponse);

        if (configResponse && configResponse.success && configResponse.data) {
          // Kiểm tra xem score_column_config có rỗng không
          const scoreColumnConfig = configResponse.data.score_column_config;
          logger.debug("score_column_config:", scoreColumnConfig);

          // Kiểm tra nếu score_column_config là object và có keys
          if (
            scoreColumnConfig &&
            typeof scoreColumnConfig === "object" &&
            Object.keys(scoreColumnConfig).length > 0
          ) {
            logger.debug("Setting scoreConfig with data:", configResponse.data);
            setScoreConfig(configResponse.data);
          } else {
            // Config tồn tại nhưng chưa có cấu hình cột điểm
            logger.debug(
              "score_column_config is empty, setting scoreConfig to null"
            );
            setScoreConfig(null);
          }
        } else {
          // No config exists yet, use default
          logger.debug(
            "No config response or failed, setting scoreConfig to null"
          );
          setScoreConfig(null);
        }
      } catch (error: any) {
        logger.error("Error fetching data:", error);
        setScoreConfig(null);
      } finally {
        setLoading(false);
      }
    };

    /** --------- HELPERS: CẤU TRÚC CỘT --------- */
    const getDisplayColumns = (scoreColumnConfig: any) => {
      const columns: any[] = [];
      if (!scoreColumnConfig) return columns;

      // Sort keys: Thường xuyên -> Giữa kì -> Cuối kì
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

        if (columnConfig?.data && typeof columnConfig.data === "object") {
          // Parent column with children
          const children = Object.keys(columnConfig.data).map((childName) => ({
            key: childName,
            label: columnConfig.data[childName].label || childName,
            he_so: columnConfig.data[childName].he_so,
          }));

          columns.push({
            key: columnName,
            label: columnConfig.label || columnName,
            hasChildren: true,
            children,
          });
        } else {
          // Regular column
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

    // Helper: Flatten nested columns to get all input fields (child columns)
    const flattenScoreColumns = (scoreColumnConfig: any) => {
      const flatColumns: any[] = [];
      if (!scoreColumnConfig) return flatColumns;

      Object.keys(scoreColumnConfig).forEach((columnName) => {
        const columnConfig = scoreColumnConfig[columnName];

        // Check if column has nested data (children)
        if (columnConfig?.data && typeof columnConfig.data === "object") {
          // Add all child columns
          Object.keys(columnConfig.data).forEach((childName) => {
            flatColumns.push({
              key: childName,
              he_so: columnConfig.data[childName].he_so,
              label: columnConfig.data[childName].label || childName,
            });
          });
        } else {
          // Regular column without children
          flatColumns.push({
            key: columnName,
            he_so: columnConfig.he_so,
            label: columnConfig.label || columnName,
          });
        }
      });

      // Sắp xếp các cột theo thứ tự: Điểm thường xuyên -> Điểm giữa kì -> Điểm cuối kì
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

    /** --------- SCORE FORM --------- */
    const initializeScoreForm = (existingScore: any | null = null) => {
      const form: any = {};

      if (scoreConfig && scoreConfig.score_column_config) {
        // Use flattened columns (all child columns, not parent)
        const flatColumns = flattenScoreColumns(scoreConfig.score_column_config);

        flatColumns.forEach((column) => {
          form[column.key] = {
            He_so: column.he_so,
            Diem: existingScore?.score_data?.[column.key]?.Diem || "",
          };
        });
      }

      return form;
    };

    const handleEditScore = (student: any) => {
      setEditingStudent(student);
      const form = initializeScoreForm(student.score);
      setScoreForm(form);
    };

    const handleScoreInputChange = (columnName: string, value: string) => {
      // Normalize letter grades
      let normalizedValue = value.trim();

      if (normalizedValue !== "") {
        const upperValue = normalizedValue.toUpperCase();

        // Accept various formats for Đ (Pass)
        if (
          upperValue === "Đ" ||
          upperValue === "D" ||
          upperValue === "DAT" ||
          upperValue === "ĐẠT"
        ) {
          normalizedValue = "Đ";
        }
        // Accept various formats for KĐ (Not Pass)
        else if (
          upperValue === "KĐ" ||
          upperValue === "KD" ||
          upperValue === "KHONG_DAT" ||
          upperValue === "KHONGDAT" ||
          upperValue === "KHÔNG_ĐẠT" ||
          upperValue === "KHÔNG ĐẠT"
        ) {
          normalizedValue = "KĐ";
        }
        // For numeric values, keep as is (will be parsed as float later)
      }

      setScoreForm((prev: any) => ({
        ...prev,
        [columnName]: {
          ...prev[columnName],
          Diem: normalizedValue,
        },
      }));
    };

    const handleSaveScore = async () => {
      if (!editingStudent || !selectedClassSubject) return;

      try {
        // Validate score values before saving
        for (const [columnName, columnData] of Object.entries<any>(scoreForm)) {
          const scoreValue = columnData?.Diem;

          if (
            scoreValue !== "" &&
            scoreValue !== null &&
            scoreValue !== undefined
          ) {
            const valueStr = String(scoreValue).trim().toUpperCase();

            // Check if it's a letter grade
            const isLetterGrade =
              valueStr === "Đ" ||
              valueStr === "D" ||
              valueStr === "KĐ" ||
              valueStr === "KD" ||
              valueStr === "DAT" ||
              valueStr === "ĐẠT" ||
              valueStr === "KHONG_DAT" ||
              valueStr === "KHONGDAT" ||
              valueStr === "KHÔNG_ĐẠT" ||
              valueStr === "KHÔNG ĐẠT";

            // If not a letter grade, validate as number
            if (!isLetterGrade) {
              const numValue = parseFloat(scoreValue as any);
              if (isNaN(numValue) || numValue < 0 || numValue > 10) {
                alert(
                  `Điểm ${columnName} không hợp lệ! Phải là số (0-10) hoặc Đ/KĐ`
                );
                return;
              }
            }
          }
        }

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
          // Refresh students data
          await handleClassSubjectSelect(selectedClassSubject);
          setEditingStudent(null);
          setScoreForm({});
          alert("Lưu điểm thành công!");
        } else {
          alert("Lỗi khi lưu điểm: " + response.message);
        }
      } catch (error: any) {
        logger.error("Error saving score:", error);
        alert("Lỗi khi lưu điểm!");
      }
    };

    const closeEditingStudent = () => {
      setEditingStudent(null);
    };

    /** --------- TÍNH ĐIỂM TRUNG BÌNH --------- */
    const calculateFinalGrade = (gradeData: any): number | string => {
      if (!gradeData || !scoreConfig?.score_column_config) return 0;

      // Use flattened columns to calculate (includes all child columns)
      const flatColumns = flattenScoreColumns(scoreConfig.score_column_config);

      // Gom tất cả các cột điểm thường xuyên (Diem_tx*)
      let txScores: number[] = [];

      // Gom các cột điểm thi
      let giuaKiScore: number | null = null;
      let giuaKiWeight = 0;
      let cuoiKiScore: number | null = null;
      let cuoiKiWeight = 0;

      // Kiểm tra xem tất cả điểm có phải là chữ không
      let isAllLetterGrades = true;
      let hasAnyGrade = false;

      flatColumns.forEach((column) => {
        if (gradeData[column.key]?.Diem) {
          hasAnyGrade = true;
          const diemValue = gradeData[column.key].Diem;
          const isLetter =
            typeof diemValue === "string" &&
            (diemValue === "Đ" || diemValue === "KĐ");
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

          // Nếu là điểm chữ, convert sang số
          if (
            isAllLetterGrades &&
            typeof diemValue === "string" &&
            (diemValue === "Đ" || diemValue === "KĐ")
          ) {
            score = diemValue === "Đ" ? 1 : 0;
          } else if (
            typeof diemValue === "string" &&
            (diemValue === "Đ" || diemValue === "KĐ")
          ) {
            return; // Skip nếu không phải tất cả là chữ
          } else {
            score = parseFloat(diemValue as any);
          }

          // Skip if score is not a valid number
          if (isNaN(score)) {
            return; // Skip this column
          }

          const weight = parseFloat(column.he_so);

          // Phân loại theo loại cột
          if (column.key.startsWith("Diem_tx")) {
            // Điểm thường xuyên
            txScores.push(score);
          } else if (column.key === "Diem_thi_giua_ki") {
            // Điểm giữa kì
            giuaKiScore = score;
            giuaKiWeight = weight;
          } else if (column.key === "Diem_thi_cuoi_ki") {
            // Điểm cuối kì
            cuoiKiScore = score;
            cuoiKiWeight = weight;
          }
        }
      });

      // Tính điểm thường xuyên trung bình
      let txAverage = 0;
      if (txScores.length > 0) {
        txAverage =
          txScores.reduce((sum, score) => sum + score, 0) / txScores.length;
      }

      // Áp dụng công thức: (Điểm_thường_xuyên × 1 + Điểm_giữa_kì × 2 + Điểm_cuối_kì × 3) / 6
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

      // Nếu là điểm chữ, không chia cho totalWeight, so sánh trực tiếp với 5
      if (isAllLetterGrades) {
        return totalScore >= 5 ? "Đ" : "KĐ";
      }

      return totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : 0;
    };

    /** --------- CẤU HÌNH CỘT ĐIỂM --------- */
    const handleShowConfigEditor = () => {
      if (scoreConfig) {
        setConfigForm({ ...scoreConfig.score_column_config });
      } else {
        // Default config
        setConfigForm({
          Diem_thuong_xuyen: { he_so: 1, label: "Điểm TX" },
          Diem_thi_giua_ki: { he_so: 2, label: "Điểm GK" },
          Diem_thi_cuoi_ki: { he_so: 3, label: "Điểm CK" },
        });
      }
      setShowConfigEditor(true);
    };

    const handleConfigInputChange = (
      columnName: string,
      field: string,
      value: any
    ) => {
      setConfigForm((prev: any) => ({
        ...prev,
        [columnName]: {
          ...prev[columnName],
          [field]: value,
        },
      }));
    };

    const handleAddColumn = () => {
      setShowAddColumnModal(true);
      setNewColumnForm({ name: "", label: "", he_so: 1 });
    };

    const handleConfirmAddColumn = () => {
      if (newColumnForm.name && newColumnForm.label) {
        // Validate column name format
        const validName = newColumnForm.name
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "");
        if (!validName) {
          alert(
            "Tên cột không hợp lệ. Chỉ được sử dụng chữ cái, số và dấu gạch dưới."
          );
          return;
        }

        // Check if column already exists
        if (configForm[validName]) {
          alert("Cột điểm này đã tồn tại!");
          return;
        }

        setConfigForm((prev: any) => ({
          ...prev,
          [validName]: {
            he_so: parseInt(String(newColumnForm.he_so)) || 1,
            label: newColumnForm.label,
          },
        }));

        setShowAddColumnModal(false);
        setNewColumnForm({ name: "", label: "", he_so: 1 });
      } else {
        alert("Vui lòng điền đầy đủ thông tin!");
      }
    };

    const handleRemoveColumn = (columnName: string) => {
      if (Object.keys(configForm).length <= 1) {
        alert("Phải có ít nhất một cột điểm!");
        return;
      }

      if (
        window.confirm(
          `Bạn có chắc muốn xóa cột "${
            configForm[columnName]?.label || columnName
          }"?\n\nViệc xóa sẽ làm mất tất cả điểm số đã nhập cho cột này.`
        )
      ) {
        setConfigForm((prev: any) => {
          const newForm = { ...prev };
          delete newForm[columnName];
          return newForm;
        });
      }
    };

    const handleSaveConfig = async () => {
      if (!selectedClassSubject) return;

      try {
        // Validation
        if (Object.keys(configForm).length === 0) {
          alert("Phải có ít nhất một cột điểm!");
          return;
        }

        // Check if all columns have valid data
        const invalidColumns = Object.keys(configForm).filter((columnName) => {
          const column = configForm[columnName];
          return (
            !column.label ||
            !column.he_so ||
            column.he_so < 1 ||
            column.he_so > 10
          );
        });

        if (invalidColumns.length > 0) {
          alert(
            "Vui lòng điền đầy đủ thông tin cho tất cả các cột điểm. Hệ số phải từ 1 đến 10."
          );
          return;
        }

        const configData = {
          subject_id: selectedClassSubject.subject_id,
          academic_year: academicYear,
          semester: semester,
          score_column_config: configForm,
        };

        const response = await api.upsertScoreConfig(scoreConfig?.id, configData);

        if (response.success) {
          setScoreConfig(response.data);
          setShowConfigEditor(false);
          alert("✅ Lưu cấu hình cột điểm thành công!");
          // Refresh current view
          await handleClassSubjectSelect(selectedClassSubject);
        } else {
          alert("❌ Lỗi khi lưu cấu hình: " + response.message);
        }
      } catch (error: any) {
        logger.error("Error saving config:", error);
        alert("❌ Lỗi khi lưu cấu hình!");
      }
    };

    return {
      loading,
      setLoading,
      teacherInfo,
      academicYear,
      semester,
      selectedClassSubject,
      students,
      scoreConfig,
      editingStudent,
      scoreForm,
      showConfigEditor,
      configForm,
      showAddColumnModal,
      newColumnForm,
      setAcademicYear,
      setSemester,
      setSelectedClassSubject,
      handleClassSubjectSelect,
      getDisplayColumns,
      flattenScoreColumns,
      calculateFinalGrade,
      handleEditScore,
      handleScoreInputChange,
      handleSaveScore,
      closeEditingStudent,
      handleShowConfigEditor,
      handleConfigInputChange,
      handleAddColumn,
      handleConfirmAddColumn,
      handleRemoveColumn,
      handleSaveConfig,
      setShowConfigEditor,
      setShowAddColumnModal,
      setNewColumnForm,
    };
  };


