import React, { useState, useEffect, useContext } from "react";
import {
  GraduationCap,
  Settings,
  Plus,
  Download,
  Upload,
  AlertCircle,
  Trash2,
  Save,
  BarChart3,
  FileEdit,
  Scale,
  Key,
  Lightbulb,
  Star,
  Zap,
  Pencil,
  FileText,
  Clipboard,
  Calendar,
  BookOpen,
  Users,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { AuthContext } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import api from "../services/api";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import OCRGradeSheet from "./OCRGradeSheet";
import logger from "../utils/logger";

// Tạo danh sách năm học từ 2024-2025 đến 2035-2036
const generateAcademicYears = () => {
  const years = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

// Danh sách học kỳ cố định
const SEMESTERS = ["HK1", "HK2", "HK3"];
const ACADEMIC_YEARS = generateAcademicYears();

const GradeManagement = () => {
  const { user } = useContext(AuthContext);
  const {
    academicYear: defaultAcademicYear,
    semester: defaultSemester,
    loading: settingsLoading,
  } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [selectedClassSubject, setSelectedClassSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeConfig, setGradeConfig] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({});
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({
    name: "",
    label: "",
    he_so: 1,
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // 20 students per page

  // Filter states - sử dụng trực tiếp giá trị từ system settings với fallback
  const [academicYear, setAcademicYear] = useState(
    defaultAcademicYear || "2024-2025"
  );
  const [semester, setSemester] = useState(defaultSemester || "HK1");

  // Sync với system settings khi có thay đổi
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
  }, [user, academicYear, semester]);

  // Reset page when selectedClassSubject changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassSubject]);

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
    } catch (error) {
      logger.error("Error fetching teacher info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubjectSelect = async (classSubject) => {
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
        const sortedStudents = (studentsResponse.data.students || []).sort(
          (a, b) => {
            const aId = parseInt(a.student?.student_id) || 0;
            const bId = parseInt(b.student?.student_id) || 0;
            return aId - bId;
          }
        );
        setStudents(sortedStudents);
      }

      // Fetch grade config for this subject
      const configResponse = await api.getGradeConfigBySubject(
        classSubject.subject_id,
        academicYear,
        semester
      );

      if (configResponse.success) {
        setGradeConfig(configResponse.data);
      } else {
        // No config exists yet, use default
        setGradeConfig(null);
      }
    } catch (error) {
      logger.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get columns with hierarchy for display (parent + children structure)
  const getDisplayColumns = (gradeColumnConfig) => {
    const columns = [];
    if (!gradeColumnConfig) return columns;

    // Sort keys: Thường xuyên -> Giữa kì -> Cuối kì
    const priorityOrder = {
      Diem_thuong_xuyen: 1,
      diem_thuong_xuyen: 1,
      Diem_thi_giua_ki: 2,
      diem_thi_giua_ki: 2,
      Diem_thi_cuoi_ki: 3,
      diem_thi_cuoi_ki: 3,
    };

    const sortedKeys = Object.keys(gradeColumnConfig).sort((a, b) => {
      return (priorityOrder[a] || 999) - (priorityOrder[b] || 999);
    });

    sortedKeys.forEach((columnName) => {
      const columnConfig = gradeColumnConfig[columnName];

      if (columnConfig.data && typeof columnConfig.data === "object") {
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
          children: children,
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
  const flattenGradeColumns = (gradeColumnConfig) => {
    const flatColumns = [];
    if (!gradeColumnConfig) return flatColumns;

    Object.keys(gradeColumnConfig).forEach((columnName) => {
      const columnConfig = gradeColumnConfig[columnName];

      // Check if column has nested data (children)
      if (columnConfig.data && typeof columnConfig.data === "object") {
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
    const columnOrder = {
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

  const initializeGradeForm = (student, existingGrade = null) => {
    const form = {};

    if (gradeConfig && gradeConfig.grade_column_config) {
      // Use flattened columns (all child columns, not parent)
      const flatColumns = flattenGradeColumns(gradeConfig.grade_column_config);

      flatColumns.forEach((column) => {
        form[column.key] = {
          He_so: column.he_so,
          Diem: existingGrade?.grade_data?.[column.key]?.Diem || "",
        };
      });
    }

    return form;
  };

  const handleEditGrade = (student) => {
    setEditingStudent(student);
    const form = initializeGradeForm(student.student, student.grade);
    setGradeForm(form);
  };

  const handleGradeInputChange = (columnName, value) => {
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

    setGradeForm((prev) => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        Diem: normalizedValue,
      },
    }));
  };

  const handleSaveGrade = async () => {
    try {
      // Validate grade values before saving
      for (const [columnName, columnData] of Object.entries(gradeForm)) {
        const gradeValue = columnData?.Diem;

        if (
          gradeValue !== "" &&
          gradeValue !== null &&
          gradeValue !== undefined
        ) {
          const valueStr = String(gradeValue).trim().toUpperCase();

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
            const numValue = parseFloat(gradeValue);
            if (isNaN(numValue) || numValue < 0 || numValue > 10) {
              alert(
                `Điểm ${columnName} không hợp lệ! Phải là số (0-10) hoặc Đ/KĐ`
              );
              return;
            }
          }
        }
      }

      const gradeData = {
        student_id: editingStudent.student.id,
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grade_data: {
          Mon_hoc: selectedClassSubject.subjects.subject_name,
          ...gradeForm,
        },
      };

      const response = await api.createOrUpdateGrade(gradeData);

      if (response.success) {
        // Refresh students data
        handleClassSubjectSelect(selectedClassSubject);
        setEditingStudent(null);
        setGradeForm({});
        alert("Lưu điểm thành công!");
      } else {
        alert("Lỗi khi lưu điểm: " + response.message);
      }
    } catch (error) {
      logger.error("Error saving grade:", error);
      alert("Lỗi khi lưu điểm!");
    }
  };

  // Helper function to sort grade columns in desired order
  const getSortedColumnNames = (gradeColumnConfig) => {
    if (!gradeColumnConfig) return [];

    const columnNames = Object.keys(gradeColumnConfig);

    // Define desired order: Điểm cuối kì -> Điểm giữa kì -> Điểm thường xuyên -> Others
    const orderPriority = {
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

      // If same priority or no priority, maintain original order
      return 0;
    });
  };

  const calculateFinalGrade = (gradeData) => {
    if (!gradeData || !gradeConfig?.grade_column_config) return 0;

    // Use flattened columns to calculate (includes all child columns)
    const flatColumns = flattenGradeColumns(gradeConfig.grade_column_config);

    // Gom tất cả các cột điểm thường xuyên (Diem_tx*)
    let txScores = [];

    // Gom các cột điểm thi
    let giuaKiScore = null;
    let giuaKiWeight = 0;
    let cuoiKiScore = null;
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

        let score;

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
          score = parseFloat(diemValue);
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

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : 0;
  };

  // Grade Config Management
  const handleShowConfigEditor = () => {
    if (gradeConfig) {
      setConfigForm({ ...gradeConfig.grade_column_config });
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

  const handleConfigInputChange = (columnName, field, value) => {
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

      setConfigForm((prev) => ({
        ...prev,
        [validName]: {
          he_so: parseInt(newColumnForm.he_so) || 1,
          label: newColumnForm.label,
        },
      }));

      setShowAddColumnModal(false);
      setNewColumnForm({ name: "", label: "", he_so: 1 });
    } else {
      alert("Vui lòng điền đầy đủ thông tin!");
    }
  };

  const handleRemoveColumn = (columnName) => {
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
      setConfigForm((prev) => {
        const newForm = { ...prev };
        delete newForm[columnName];
        return newForm;
      });
    }
  };

  const handleSaveConfig = async () => {
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
        grade_column_config: configForm,
      };

      const response = await api.upsertGradeConfig(gradeConfig?.id, configData);

      if (response.success) {
        setGradeConfig(response.data);
        setShowConfigEditor(false);
        alert("✅ Lưu cấu hình cột điểm thành công!");
        // Refresh current view
        handleClassSubjectSelect(selectedClassSubject);
      } else {
        alert("❌ Lỗi khi lưu cấu hình: " + response.message);
      }
    } catch (error) {
      logger.error("Error saving config:", error);
      alert("❌ Lỗi khi lưu cấu hình!");
    }
  };

  // Import điểm từ file
  const handleDownloadTemplate = async () => {
    try {
      await api.downloadGradeTemplate(selectedClassSubject.id);
      alert("✅ Tải template thành công!");
    } catch (error) {
      logger.error("Error downloading template:", error);
      alert("❌ Lỗi khi tải template!");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate format
        const errors = [];
        const validData = [];

        if (jsonData.length === 0) {
          alert("❌ File không có dữ liệu!");
          return;
        }

        // Get all expected columns from gradeConfig (flattened)
        const flatColumns = flattenGradeColumns(
          gradeConfig?.grade_column_config || {}
        );
        const expectedColumnKeys = flatColumns.map((col) => col.key);

        // Required columns
        const requiredColumns = ["id", "ho_va_ten", ...expectedColumnKeys];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(
          (col) => !(col in firstRow)
        );

        if (missingColumns.length > 0) {
          alert(
            `❌ File thiếu các cột: ${missingColumns.join(
              ", "
            )}\n\nVui lòng tải template để có đúng định dạng!`
          );
          return;
        }

        // Validate từng dòng
        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // +2 vì dòng 1 là header, index bắt đầu từ 0

          // Kiểm tra ID
          if (!row.id) {
            errors.push(`Dòng ${rowNum}: Thiếu ID học sinh`);
            return;
          }

          // Validate điểm số for all columns
          const scores = {};
          expectedColumnKeys.forEach((key) => {
            scores[key] = row[key];
          });

          let hasInvalidScore = false;
          Object.entries(scores).forEach(([key, value]) => {
            if (value !== "" && value !== null && value !== undefined) {
              const valueStr = String(value).trim().toUpperCase();

              // Check if it's a letter grade (Đ or KĐ)
              const isLetterGrade =
                valueStr === "Đ" ||
                valueStr === "D" ||
                valueStr === "KĐ" ||
                valueStr === "KD" ||
                valueStr === "DAT" ||
                valueStr === "ĐẠT" ||
                valueStr === "KHONG_DAT" ||
                valueStr === "KHÔNG_ĐẠT" ||
                valueStr === "KHONGDAT" ||
                valueStr === "KHÔNG ĐẠT";

              // If it's not a letter grade, validate as number
              if (!isLetterGrade) {
                const score = parseFloat(value);
                if (isNaN(score) || score < 0 || score > 10) {
                  errors.push(
                    `Dòng ${rowNum} - ${
                      row.ho_va_ten || row.id
                    }: Điểm ${key} không hợp lệ (${value}). Điểm phải từ 0-10 hoặc Đ/KĐ.`
                  );
                  hasInvalidScore = true;
                }
              }
            }
          });

          if (!hasInvalidScore) {
            const gradeData = {
              student_id: row.id,
              ho_va_ten: row.ho_va_ten,
            };

            // Add all grade columns (support both numbers and letter grades)
            expectedColumnKeys.forEach((key) => {
              const value = scores[key];
              if (value === "" || value === null || value === undefined) {
                gradeData[key] = null;
              } else {
                const valueStr = String(value).trim().toUpperCase();

                // Normalize letter grades
                if (
                  valueStr === "Đ" ||
                  valueStr === "D" ||
                  valueStr === "DAT" ||
                  valueStr === "ĐẠT"
                ) {
                  gradeData[key] = "Đ";
                } else if (
                  valueStr === "KĐ" ||
                  valueStr === "KD" ||
                  valueStr === "KHONG_DAT" ||
                  valueStr === "KHÔNG_ĐẠT" ||
                  valueStr === "KHONGDAT" ||
                  valueStr === "KHÔNG ĐẠT"
                ) {
                  gradeData[key] = "KĐ";
                } else {
                  // Parse as number
                  gradeData[key] = parseFloat(value);
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
        logger.error("Error parsing file:", error);
        alert("❌ Lỗi khi đọc file! Vui lòng kiểm tra định dạng file.");
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input để có thể upload lại cùng file
    event.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      alert("Không có dữ liệu để import!");
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

      const response = await api.bulkImportGrades(importPayload);

      if (response.success) {
        alert(
          `✅ ${response.message}\n\nThành công: ${
            response.data.success_count
          } bản ghi${
            response.data.error_count > 0
              ? `\nLỗi: ${response.data.error_count} bản ghi`
              : ""
          }`
        );

        if (response.data.errors && response.data.errors.length > 0) {
          logger.debug("Import errors:", response.data.errors);
        }

        // Refresh data
        handleClassSubjectSelect(selectedClassSubject);
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        alert("❌ Lỗi khi import điểm: " + response.message);
      }
    } catch (error) {
      logger.error("Error importing grades:", error);
      alert("❌ Lỗi khi import điểm!");
    } finally {
      setLoading(false);
    }
  };

  // Function to export grades to Excel using ExcelJS
  const handleExportToExcel = async () => {
    if (!selectedClassSubject || !gradeConfig) {
      alert("Vui lòng chọn lớp và có cấu hình điểm!");
      return;
    }

    try {
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Bảng điểm");
      // Cấu hình trang in A4 và tự co theo chiều ngang 1 trang
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3,
          right: 0.3,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
        horizontalCentered: true,
      };

      // Get display columns (with hierarchy)
      const displayColumns = getDisplayColumns(
        gradeConfig?.grade_column_config || {}
      );

      // Calculate total grade columns (flatten nested)
      let totalGradeColumns = 0;
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          totalGradeColumns += col.children.length;
        } else {
          totalGradeColumns += 1;
        }
      });

      // Calculate total columns: STT + Mã HS + Họ tên + grade columns + Điểm TB
      const totalColumns = 3 + totalGradeColumns + 1;

      // Set column widths
      const columnWidths = [
        { width: 5 }, // STT
        { width: 9 }, // Mã HS
        { width: 22 }, // Họ tên
      ];

      // Add widths for grade columns
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          col.children.forEach(() => columnWidths.push({ width: 8 }));
        } else {
          columnWidths.push({ width: 10 });
        }
      });

      columnWidths.push({ width: 9 }); // Điểm TB
      worksheet.columns = columnWidths;

      let currentRow = 1;

      // Title
      worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
      const titleCell = worksheet.getCell(currentRow, 1);
      titleCell.value = "BẢNG ĐIỂM HỌC SINH";
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(currentRow).height = 30;
      currentRow += 2;

      // Header information
      const headerInfo = [
        [`Giáo viên: ${teacherInfo.teacher.full_name}`],
        [
          `Lớp: ${selectedClassSubject.classes.class_name} (Khối ${selectedClassSubject.classes.grade})`,
        ],
        [`Môn học: ${selectedClassSubject.subjects.subject_name}`],
        [`Năm học: ${academicYear}     Học kỳ: ${semester}`],
      ];

      headerInfo.forEach((info) => {
        worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
        const cell = worksheet.getCell(currentRow, 1);
        cell.value = info[0];
        cell.font = { size: 11 };
        cell.alignment = { horizontal: "left", vertical: "middle" };
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      });

      currentRow++; // Skip a row

      // Table headers - Row 1 (Parent columns)
      const headerRow1 = worksheet.getRow(currentRow);
      let colIndex = 1;

      // STT, Mã HS, Họ tên - rowspan 2
      const fixedHeaders = ["STT", "Mã HS", "Họ và tên"];
      fixedHeaders.forEach((header) => {
        const cell = worksheet.getCell(currentRow, colIndex);
        cell.value = header;
        worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);
        colIndex++;
      });

      // Grade columns
      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          // Parent column - merge across children
          const startCol = colIndex;
          const endCol = colIndex + col.children.length - 1;
          worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
          const cell = worksheet.getCell(currentRow, startCol);
          cell.value = col.label;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDAE3F3" }, // Light blue for parent
          };
          colIndex += col.children.length;
        } else {
          // Regular column - rowspan 2
          const cell = worksheet.getCell(currentRow, colIndex);
          cell.value = col.label;
          worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);
          colIndex++;
        }
      });

      // Điểm TB - rowspan 2
      const tbCell = worksheet.getCell(currentRow, colIndex);
      tbCell.value = "Điểm TB";
      worksheet.mergeCells(currentRow, colIndex, currentRow + 1, colIndex);

      // Style header row 1
      headerRow1.height = 25;
      headerRow1.font = { bold: true, size: 11 };
      headerRow1.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      headerRow1.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" },
      };

      // Apply borders to header row 1
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(currentRow, col);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      currentRow++;

      // Table headers - Row 2 (Child columns)
      const headerRow2 = worksheet.getRow(currentRow);
      colIndex = 4; // Start after STT, Mã HS, Họ tên

      displayColumns.forEach((col) => {
        if (col.hasChildren) {
          // Render child column headers
          col.children.forEach((child) => {
            const cell = worksheet.getCell(currentRow, colIndex);
            // Convert "Điểm thường xuyên 1" -> "Điểm tx1", "Điểm thường xuyên 2" -> "Điểm tx2", etc.
            let exportLabel = child.label;
            if (exportLabel && col.label === "Điểm thường xuyên") {
              exportLabel = exportLabel.replace(
                /Điểm thường xuyên (\d+)/i,
                "Điểm tx$1"
              );
            }
            cell.value = exportLabel;
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFDAE3F3" },
            };
            colIndex++;
          });
        } else {
          // Regular columns already merged, skip
          colIndex++;
        }
      });

      // Style header row 2
      headerRow2.height = 25;
      headerRow2.font = { bold: true, size: 10 };
      headerRow2.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Apply borders to header row 2
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(currentRow, col);
        if (!cell.value) continue; // Skip merged cells
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
      currentRow++;

      // Data rows
      students.forEach((studentData, index) => {
        const student = studentData.student;
        const grade = studentData.grade;

        const dataRow = worksheet.getRow(currentRow);
        const rowValues = [
          index + 1,
          student?.student_id || "",
          student?.full_name || "",
        ];

        // Add grade columns (flattened)
        displayColumns.forEach((col) => {
          if (col.hasChildren) {
            col.children.forEach((child) => {
              const gradeValue = grade?.grade_data?.[child.key]?.Diem;
              rowValues.push(
                gradeValue !== undefined && gradeValue !== null
                  ? gradeValue
                  : ""
              );
            });
          } else {
            const gradeValue = grade?.grade_data?.[col.key]?.Diem;
            rowValues.push(
              gradeValue !== undefined && gradeValue !== null ? gradeValue : ""
            );
          }
        });

        // Add final grade
        rowValues.push(
          grade?.grade_data ? calculateFinalGrade(grade.grade_data) : ""
        );

        dataRow.values = rowValues;
        dataRow.height = 20;

        // Apply styling and borders to all cells
        for (let col = 1; col <= totalColumns; col++) {
          const cell = worksheet.getCell(currentRow, col);

          // Alignment
          if (col === 1) {
            // STT - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (col === 2) {
            // Mã HS - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else if (col === 3) {
            // Họ tên - left
            cell.alignment = { horizontal: "left", vertical: "middle" };
          } else {
            // Điểm - center
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }

          // Borders
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Highlight final grade column
          if (col === totalColumns && cell.value) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFCE4D6" },
            };
            cell.font = { bold: true };
          }

          // Highlight grade cells with values
          if (col > 3 && col < totalColumns && cell.value !== "") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE2EFDA" },
            };
          }
        }

        // Alternating row colors for better readability
        if (index % 2 === 0) {
          for (let col = 1; col <= 3; col++) {
            const cell = worksheet.getCell(currentRow, col);
            if (!cell.fill || !cell.fill.fgColor) {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF2F2F2" },
              };
            }
          }
        }

        currentRow++;
      });

      // Summary row
      currentRow++; // Skip a row
      worksheet.mergeCells(currentRow, 1, currentRow, 3);
      const summaryCell = worksheet.getCell(currentRow, 1);
      summaryCell.value = `Tổng số học sinh: ${students.length}`;
      summaryCell.font = { bold: true, size: 11 };
      summaryCell.alignment = { horizontal: "left", vertical: "middle" };

      // Calculate students with grades
      const studentsWithGrades = students.filter(
        (s) =>
          s.grade?.final_grade !== undefined && s.grade?.final_grade !== null
      ).length;
      worksheet.mergeCells(currentRow, 4, currentRow, totalColumns);
      const gradesSummaryCell = worksheet.getCell(currentRow, 4);
      gradesSummaryCell.value = `Đã có điểm: ${studentsWithGrades}/${students.length}`;
      gradesSummaryCell.font = {
        bold: true,
        size: 11,
        color: {
          argb:
            studentsWithGrades === students.length ? "FF008000" : "FFFF0000",
        },
      };
      gradesSummaryCell.alignment = { horizontal: "right", vertical: "middle" };

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BangDiem_${selectedClassSubject.classes.class_name}_${selectedClassSubject.subjects.subject_name}_${academicYear}_${semester}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      alert("✅ Xuất file Excel thành công!");
    } catch (error) {
      logger.error("Error exporting to Excel:", error);
      alert("❌ Lỗi khi xuất file Excel!");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center border bg-destructive/5 rounded-2xl border-destructive/20">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <p className="font-medium text-red-600">
            Không thể tải thông tin giáo viên. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center rounded-lg w-14 h-14 bg-primary/10">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Quản lý điểm số
                </CardTitle>
                <CardDescription className="text-lg">
                  Chào mừng {teacherInfo.teacher.full_name}
                </CardDescription>
                <div className="flex items-center mt-2 space-x-3">
                  <Badge variant="secondary" className="text-sm">
                    <Calendar className="w-3 h-3 mr-1" />
                    {academicYear}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {semester}
                  </Badge>
                </div>
              </div>

              {/* Period Filters */}
              <div className="flex gap-3 ml-auto">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Năm học
                  </label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Chọn năm học" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEARS.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Học kỳ
                  </label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Chọn HK" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!selectedClassSubject ? (
          <Card>
            <CardHeader>
              <div className="text-center">
                <CardTitle className="text-xl font-bold">
                  Chọn lớp - môn học
                </CardTitle>
                <CardDescription>
                  Lựa chọn lớp và môn học để bắt đầu quản lý điểm số
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teacherInfo.assigned_classes.map((classSubject) => (
                  <Card
                    key={classSubject.id}
                    onClick={() => handleClassSubjectSelect(classSubject)}
                    className="transition-all duration-200 cursor-pointer hover:shadow-lg hover:border-primary group"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center justify-center text-lg font-bold rounded-lg w-11 h-11 text-primary-foreground bg-primary">
                          {classSubject.classes.class_name.charAt(0)}
                        </div>
                        <div className="flex items-center justify-center transition-colors rounded-full w-7 h-7 bg-muted group-hover:bg-primary/10">
                          <span className="text-muted-foreground group-hover:text-primary">
                            →
                          </span>
                        </div>
                      </div>

                      <h3 className="mb-1 text-base font-bold text-foreground">
                        {classSubject.classes.class_name}
                      </h3>
                      <p className="mb-3 font-medium text-primary">
                        {classSubject.subjects.subject_name}
                      </p>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Khối {classSubject.classes.grade}
                        </Badge>
                        <span className="text-xs">{academicYear}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Navigation and Header */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setSelectedClassSubject(null)}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <span>←</span>
                        <span>Quay lại</span>
                      </Button>
                      <div className="w-px h-8 bg-border"></div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {selectedClassSubject.classes.class_name} -{" "}
                          {selectedClassSubject.subjects.subject_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Khối {selectedClassSubject.classes.grade}
                        </p>
                      </div>
                    </div>

                    {/* Hidden: Cấu hình cột điểm - now managed in Admin panel */}
                    {false && (
                      <Button
                        onClick={handleShowConfigEditor}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Cấu hình cột điểm</span>
                      </Button>
                    )}
                  </div>

                  {/* Import/Export Buttons */}
                  {gradeConfig && (
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
                      <Button
                        onClick={handleDownloadTemplate}
                        className="flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải template</span>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <label className="cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Nhập điểm từ file</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </Button>

                      <Button
                        onClick={handleExportToExcel}
                        variant="outline"
                        className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Download className="w-4 h-4" />
                        <span>Xuất Excel</span>
                      </Button>

                      <OCRGradeSheet
                        selectedClassSubject={selectedClassSubject}
                        academicYear={academicYear}
                        semester={semester}
                        onImportSuccess={() =>
                          handleClassSubjectSelect(selectedClassSubject)
                        }
                      />

                      <div className="px-3 py-2 text-sm border rounded-lg text-muted-foreground bg-primary/5 border-primary/20">
                        <span className="flex items-center space-x-1 font-medium">
                          <Lightbulb className="w-4 h-4" />
                          <span>Hỗ trợ:</span>
                        </span>{" "}
                        Excel (.xlsx, .xls), CSV, và ảnh bảng điểm
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Config Editor Modal */}
            <Dialog open={showConfigEditor} onOpenChange={setShowConfigEditor}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Cấu hình cột điểm</span>
                  </DialogTitle>
                  <DialogDescription>
                    Thiết lập các cột điểm và hệ số cho môn học
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {Object.keys(configForm).length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 rounded-full bg-muted">
                          <BarChart3 className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <p className="mb-6 text-lg text-muted-foreground">
                          Chưa có cột điểm nào
                        </p>
                        <p className="text-muted-foreground">
                          Hãy thêm cột điểm đầu tiên để bắt đầu
                        </p>
                      </div>
                    ) : (
                      getSortedColumnNames(configForm).map(
                        (columnName, index) => (
                          <Card
                            key={columnName}
                            className="transition-all hover:shadow-md"
                          >
                            <CardContent className="p-5">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center justify-center w-10 h-10 text-base font-bold text-white rounded-lg bg-primary">
                                  {index + 1}
                                </div>

                                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                                  <div>
                                    <Label className="flex items-center space-x-1 mb-1.5">
                                      <FileEdit className="w-4 h-4" />
                                      <span>Tên hiển thị</span>
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </Label>
                                    <Input
                                      type="text"
                                      value={configForm[columnName].label}
                                      onChange={(e) =>
                                        handleConfigInputChange(
                                          columnName,
                                          "label",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Nhập tên hiển thị"
                                    />
                                    <p className="px-2 py-1 mt-1 text-xs rounded text-muted-foreground bg-muted">
                                      Key: {columnName}
                                    </p>
                                  </div>

                                  <div>
                                    <Label className="flex items-center space-x-1 mb-1.5">
                                      <Scale className="w-4 h-4" />
                                      <span>Hệ số</span>
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={configForm[columnName].he_so}
                                      onChange={(e) =>
                                        handleConfigInputChange(
                                          columnName,
                                          "he_so",
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                <Button
                                  onClick={() => handleRemoveColumn(columnName)}
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                                  title={`Xóa cột "${configForm[columnName].label}"`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      )
                    )}
                  </div>
                </div>

                <DialogFooter className="flex justify-between">
                  <Button
                    onClick={handleAddColumn}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm cột</span>
                  </Button>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfigEditor(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSaveConfig}
                      className="flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu cấu hình</span>
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Column Modal */}
            <Dialog
              open={showAddColumnModal}
              onOpenChange={setShowAddColumnModal}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Thêm cột điểm mới</span>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <Key className="w-4 h-4" />
                      <span>Tên cột (key)</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={newColumnForm.name}
                      onChange={(e) =>
                        setNewColumnForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="vd: Diem_thi_15_phut"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-md p-2">
                      <AlertCircle className="inline w-3 h-3 mr-1" />
                      Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <FileEdit className="w-4 h-4" />
                      <span>Tên hiển thị</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={newColumnForm.label}
                      onChange={(e) =>
                        setNewColumnForm((prev) => ({
                          ...prev,
                          label: e.target.value,
                        }))
                      }
                      placeholder="vd: Điểm thi 15 phút"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <Scale className="w-4 h-4" />
                      <span>Hệ số</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newColumnForm.he_so}
                      onChange={(e) =>
                        setNewColumnForm((prev) => ({
                          ...prev,
                          he_so: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddColumnModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmAddColumn}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm cột</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Students Grade Table */}
            {gradeConfig ? (
              <div className="overflow-hidden bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-bold text-gray-800">
                        Danh sách học sinh
                      </h3>
                      <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                        {students.length} học sinh
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">
                        Số lượng/trang:
                      </label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      {/* First header row: Parent columns */}
                      <tr className="bg-gray-50">
                        <th
                          className="px-5 py-3 text-left border-b-2 border-gray-300"
                          rowSpan="2"
                        >
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <User className="w-4 h-4" />
                            <span>Học sinh</span>
                          </span>
                        </th>
                        {getDisplayColumns(
                          gradeConfig?.grade_column_config || {}
                        ).map((column) => {
                          if (column.hasChildren) {
                            // Parent column with children - use colspan
                            return (
                              <th
                                key={column.key}
                                colSpan={column.children.length}
                                className="px-3 py-3 text-center border-b-2 border-gray-300 border-x bg-gray-50"
                              >
                                <div className="text-xs font-semibold tracking-wider text-gray-700 uppercase">
                                  {column.label}
                                </div>
                                <div className="text-xs text-gray-600 normal-case font-normal mt-0.5">
                                  {column.children.length} điểm
                                </div>
                              </th>
                            );
                          } else {
                            // Regular column without children - use rowspan
                            return (
                              <th
                                key={column.key}
                                rowSpan="2"
                                className="px-5 py-3 text-center border-b-2 border-gray-300"
                              >
                                <div className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
                                  {column.label}
                                </div>
                                <div className="text-xs text-blue-600 normal-case font-normal mt-0.5">
                                  Hệ số: {column.he_so}
                                </div>
                              </th>
                            );
                          }
                        })}
                        <th
                          className="px-5 py-3 text-left border-b-2 border-gray-300"
                          rowSpan="2"
                        >
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <Star className="w-4 h-4" />
                            <span>Điểm TB</span>
                          </span>
                        </th>
                        <th
                          className="px-5 py-3 text-left border-b-2 border-gray-300"
                          rowSpan="2"
                        >
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <Zap className="w-4 h-4" />
                            <span>Thao tác</span>
                          </span>
                        </th>
                      </tr>
                      {/* Second header row: Child columns */}
                      <tr className="bg-gray-50">
                        {getDisplayColumns(
                          gradeConfig?.grade_column_config || {}
                        ).map((column) => {
                          if (column.hasChildren) {
                            // Render child column headers
                            return column.children.map((child) => (
                              <th
                                key={child.key}
                                className="px-3 py-2 text-center border-b-2 border-gray-300 border-x bg-gray-50"
                              >
                                <div className="text-xs font-medium text-gray-700">
                                  {child.label}
                                </div>
                                <div className="text-xs text-gray-600 normal-case font-normal mt-0.5">
                                  Hệ số: {child.he_so}
                                </div>
                              </th>
                            ));
                          }
                          // Regular columns already span 2 rows, no header needed here
                          return null;
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Calculate pagination
                        const totalStudents = students.length;
                        const startIndex = (currentPage - 1) * pageSize;
                        const endIndex = startIndex + pageSize;
                        const paginatedStudents = students.slice(
                          startIndex,
                          endIndex
                        );

                        return paginatedStudents.map((studentData, index) => (
                          <tr
                            key={studentData.student.id}
                            className="transition-colors hover:bg-gray-50"
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center space-x-2.5">
                                <div className="flex items-center justify-center text-sm font-bold text-white bg-blue-600 rounded-lg w-9 h-9">
                                  {startIndex + index + 1}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {studentData.student.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
                                    {studentData.student.student_id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {getDisplayColumns(
                              gradeConfig?.grade_column_config || {}
                            ).map((column) => {
                              if (column.hasChildren) {
                                // Render cells for all child columns
                                return column.children.map((child) => (
                                  <td
                                    key={child.key}
                                    className="px-3 py-3 text-center"
                                  >
                                    {studentData.grade?.grade_data?.[child.key]
                                      ?.Diem ? (
                                      <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                        {
                                          studentData.grade.grade_data[
                                            child.key
                                          ].Diem
                                        }
                                      </span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                                        -
                                      </span>
                                    )}
                                  </td>
                                ));
                              } else {
                                // Regular column cell
                                return (
                                  <td
                                    key={column.key}
                                    className="px-5 py-3 text-center"
                                  >
                                    {studentData.grade?.grade_data?.[column.key]
                                      ?.Diem ? (
                                      <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                        {
                                          studentData.grade.grade_data[
                                            column.key
                                          ].Diem
                                        }
                                      </span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                                        -
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                            })}
                            <td className="px-5 py-3">
                              {studentData.grade?.grade_data ? (
                                <span className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold">
                                  {calculateFinalGrade(
                                    studentData.grade.grade_data
                                  )}
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => handleEditGrade(studentData)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                              >
                                {studentData.grade ? (
                                  <Pencil className="w-4 h-4" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                <span>
                                  {studentData.grade ? "Sửa" : "Nhập điểm"}
                                </span>
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const totalStudents = students.length;
                  const totalPages = Math.ceil(totalStudents / pageSize);
                  const startIndex = (currentPage - 1) * pageSize;
                  const endIndex = startIndex + pageSize;

                  if (totalPages <= 1) return null;

                  return (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-gray-700">
                          Hiển thị{" "}
                          <span className="font-semibold">
                            {startIndex + 1}
                          </span>{" "}
                          đến{" "}
                          <span className="font-semibold">
                            {Math.min(endIndex, totalStudents)}
                          </span>{" "}
                          trong tổng số{" "}
                          <span className="font-semibold">{totalStudents}</span>{" "}
                          học sinh
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ← Trước
                          </button>

                          <div className="flex items-center space-x-1">
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            ).map((pageNum) => {
                              const showPage =
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 &&
                                  pageNum <= currentPage + 1);

                              if (!showPage) {
                                if (
                                  pageNum === currentPage - 2 ||
                                  pageNum === currentPage + 2
                                ) {
                                  return (
                                    <span
                                      key={pageNum}
                                      className="px-2 text-gray-500"
                                    >
                                      ...
                                    </span>
                                  );
                                }
                                return null;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    currentPage === pageNum
                                      ? "bg-blue-600 text-white"
                                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Sau →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="py-12 text-center bg-white rounded-lg shadow-md">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-800">
                  Chưa có cấu hình cột điểm
                </h3>
                <p className="mb-6 text-gray-600">
                  Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt
                  đầu nhập điểm.
                </p>
                <button
                  onClick={handleShowConfigEditor}
                  className="inline-flex items-center px-6 py-3 space-x-2 font-medium text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  <span>Tạo cấu hình cột điểm</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grade Edit Modal */}
        <Dialog
          open={!!editingStudent}
          onOpenChange={() => setEditingStudent(null)}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Pencil className="w-4 h-4" />
                <span>Nhập điểm cho {editingStudent?.student?.full_name}</span>
              </DialogTitle>
              <DialogDescription>
                Mã số: {editingStudent?.student?.student_id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {editingStudent && gradeConfig && (
                <>
                  {getDisplayColumns(gradeConfig.grade_column_config).map(
                    (column) => {
                      if (column.hasChildren) {
                        // Parent column with children - show grouped inputs
                        return (
                          <div
                            key={column.key}
                            className="p-4 border rounded-lg bg-blue-50"
                          >
                            <div className="mb-3 text-sm font-semibold text-blue-900">
                              {column.label}
                            </div>
                            <div className="space-y-3">
                              {column.children.map((child) => (
                                <div
                                  key={child.key}
                                  className="flex items-center space-x-3"
                                >
                                  <Label className="w-32 text-sm font-medium text-gray-700">
                                    {child.label}
                                  </Label>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Hệ số: {child.he_so}
                                  </Badge>
                                  <Input
                                    type="text"
                                    placeholder="-"
                                    value={gradeForm[child.key]?.Diem || ""}
                                    onChange={(e) =>
                                      handleGradeInputChange(
                                        child.key,
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 text-lg font-semibold text-center"
                                  />
                                  <div className="text-xs text-gray-500 min-w-16">
                                    <div>Số: 0-10</div>
                                    <div>Chữ: Đ/KĐ</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        // Regular column without children
                        return (
                          <div
                            key={column.key}
                            className="p-4 rounded-lg bg-muted"
                          >
                            <Label className="block mb-2 text-sm font-medium">
                              <span className="flex items-center justify-between">
                                <span>{column.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Hệ số: {column.he_so}
                                </Badge>
                              </span>
                            </Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="text"
                                placeholder="0.0, Đ, hoặc KĐ"
                                value={gradeForm[column.key]?.Diem || ""}
                                onChange={(e) =>
                                  handleGradeInputChange(
                                    column.key,
                                    e.target.value
                                  )
                                }
                                className="flex-1 text-lg font-semibold text-center"
                              />
                              <div className="text-xs text-gray-500 min-w-16">
                                <div>Số: 0-10</div>
                                <div>Chữ: Đ/KĐ</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStudent(null)}>
                Hủy
              </Button>
              <Button onClick={handleSaveGrade}>Lưu điểm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Modal */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Clipboard className="w-4 h-4" />
                <span>Xem trước dữ liệu import</span>
              </DialogTitle>
              <DialogDescription>
                Kiểm tra kỹ thông tin trước khi cập nhật điểm •{" "}
                {importedData.length} học sinh
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto">
              {importErrors.length > 0 && (
                <div className="p-4 mb-4 border rounded-lg bg-destructive/10 border-destructive/20">
                  <h4 className="flex items-center mb-2 space-x-1 font-bold text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>Có {importErrors.length} lỗi:</span>
                  </h4>
                  <ul className="space-y-1 text-sm list-disc list-inside text-destructive">
                    {importErrors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {importErrors.length > 10 && (
                      <li className="font-medium text-destructive">
                        ... và {importErrors.length - 10} lỗi khác
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Mã HS</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      {gradeConfig &&
                        flattenGradeColumns(
                          gradeConfig.grade_column_config
                        ).map((column) => (
                          <TableHead key={column.key} className="text-center">
                            {column.label}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium text-primary">
                          {row.student_id}
                        </TableCell>
                        <TableCell>{row.ho_va_ten}</TableCell>
                        {gradeConfig &&
                          flattenGradeColumns(
                            gradeConfig.grade_column_config
                          ).map((column) => (
                            <TableCell key={column.key} className="text-center">
                              {row[column.key] !== null &&
                              row[column.key] !== undefined ? (
                                <Badge
                                  variant="secondary"
                                  className="text-green-700 bg-green-100"
                                >
                                  {row[column.key]}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importedData.length === 0 && (
                <div className="py-12 text-center">
                  <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-muted">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Không có dữ liệu hợp lệ
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">{importedData.length}</span> bản
                ghi sẽ được cập nhật
                {importErrors.length > 0 && (
                  <span className="ml-2 text-destructive">
                    •{" "}
                    <span className="font-semibold">{importErrors.length}</span>{" "}
                    lỗi
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportedData([]);
                    setImportErrors([]);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={
                    importedData.length === 0 || importErrors.length > 0
                  }
                >
                  ✅ Cập nhật điểm
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GradeManagement;
