import { useState, useCallback, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';

export interface ParentContact {
  relation: string;
  name: string;
  phone: string;
}

export interface StudentFormData {
  full_name: string;
  email: string;
  phone: string;
  received_email: string;
  academic_year: string;
  class_name: string;
  grade: string;
  class_id: number | null;
  date_of_birth: string;
  address: string;
  parent_contacts: ParentContact[];
  gender: string;
}

export interface EditFormData extends StudentFormData {
  parent_name?: string;
  parent_phone?: string;
}

export interface StudentData {
  id: number;
  full_name: string;
  student_id: string;
  email: string;
  phone: string;
  received_email?: string;
  class_name: string;
  grade: string | number;
  date_of_birth: string;
  address: string;
  parent_contacts: ParentContact[];
  gender: string;
  is_active: boolean;
  face_samples_count?: number;
}

export interface ImportedGradeRow {
  ho_va_ten: string;
  email: string;
  so_dien_thoai: string;
  lop_hoc: string;
  khoi: string;
  ngay_sinh: string;
  gioi_tinh: string;
  dia_chi: string;
  nam_nhap_hoc: string;
  ten_phu_huynh?: string;
  sdt_phu_huynh?: string;
  ten_bo?: string;
  sdt_bo?: string;
  ten_me?: string;
  sdt_me?: string;
  parent_contacts?: any;
  [key: string]: any;
}

const INITIAL_FORM_DATA: StudentFormData = {
  full_name: '',
  email: '',
  phone: '',
  received_email: '',
  academic_year: '',
  class_name: '',
  grade: '',
  class_id: null,
  date_of_birth: '',
  address: '',
  parent_contacts: [{ relation: 'parent', name: '', phone: '' }],
  gender: 'Nam',
};

export const useClassManagementStudentOps = (academicYear?: string, classId?: number | null) => {
  // Academic Year State
  const [storedAcademicYear, setStoredAcademicYear] = useState<string | undefined>(academicYear);
  const [storedClassId, setStoredClassId] = useState<number | null | undefined>(classId);

  // Update storedAcademicYear when academicYear parameter changes
  useEffect(() => {
    setStoredAcademicYear(academicYear);
  }, [academicYear]);

  // Update storedClassId when classId parameter changes
  useEffect(() => {
    setStoredClassId(classId);
  }, [classId]);

  // Add Student Form State
  const [studentFormData, setStudentFormData] = useState<StudentFormData>(INITIAL_FORM_DATA);
  const [studentFormErrors, setStudentFormErrors] = useState<Record<string, string | null>>({});
  const [studentFormLoading, setStudentFormLoading] = useState(false);
  const [forceCreateEnabled, setForceCreateEnabled] = useState(false);  // NEW: for duplicate bypass
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);  // NEW: duplicate message

  // Edit Student Form State
  const [editForm, setEditForm] = useState<Partial<EditFormData>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Import Form State
  const [importedData, setImportedData] = useState<ImportedGradeRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importBackendError, setImportBackendError] = useState<string>('');

  // Restore loading
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Refs for callbacks to avoid stale closures in dialog confirmations
  const deleteSuccessCallbackRef = useRef<(() => void) | undefined>(undefined);
  const deleteCloseCallbackRef = useRef<(() => void) | undefined>(undefined);
  const permanentDeleteSuccessCallbackRef = useRef<(() => void) | undefined>(undefined);
  const permanentDeleteCloseCallbackRef = useRef<(() => void) | undefined>(undefined);
  const removeFromClassSuccessCallbackRef = useRef<(() => void) | undefined>(undefined);
  const removeFromClassCloseCallbackRef = useRef<(() => void) | undefined>(undefined);
  const restoreSuccessCallbackRef = useRef<(() => void) | undefined>(undefined);

  // =============== Form Handlers ===============
  const handleStudentFormChange = (field: string, value: any) => {
    setStudentFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (studentFormErrors[field]) {
      setStudentFormErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =============== Parent Contact Handlers ===============
  const addParentContactRow = () => {
    setStudentFormData((prev) => ({
      ...prev,
      parent_contacts: [
        ...(prev.parent_contacts || []),
        { relation: 'parent', name: '', phone: '' },
      ],
    }));
  };

  const removeParentContactRow = (index: number) => {
    setStudentFormData((prev) => ({
      ...prev,
      parent_contacts: (prev.parent_contacts || []).filter((_, i) => i !== index),
    }));
  };

  const updateParentContactField = (index: number, field: string, value: string) => {
    setStudentFormData((prev) => {
      const list = [...(prev.parent_contacts || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, parent_contacts: list };
    });
  };

  const addParentContactRowEdit = () => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: [
        ...(prev.parent_contacts || []),
        { relation: 'parent', name: '', phone: '' },
      ],
    }));
  };

  const removeParentContactRowEdit = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: (prev.parent_contacts || []).filter((_, i) => i !== index),
    }));
  };

  const updateParentContactFieldEdit = (index: number, field: string, value: string) => {
    setEditForm((prev) => {
      const list = [...(prev.parent_contacts || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, parent_contacts: list };
    });
  };

  // =============== Validation ===============
  const validateStudentForm = () => {
    const newErrors: Record<string, string> = {};

    if (!studentFormData.full_name.trim()) {
      newErrors.full_name = 'Họ tên là bắt buộc';
    }

    if (!studentFormData.academic_year.trim()) {
      newErrors.academic_year = 'Năm học là bắt buộc';
    }

    if (!studentFormData.grade.trim()) {
      newErrors.grade = 'Khối là bắt buộc';
    }

    if (!studentFormData.class_name.trim()) {
      newErrors.class_name = 'Lớp học là bắt buộc';
    }

    if (studentFormData.email && !/\S+@\S+\.\S+/.test(studentFormData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setStudentFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============== ID Generation ===============
  const generateStudentId = useCallback(
    async (grade: string, academicYear: string) => {
      if (!grade || !academicYear) {
        logger.error('Grade and academic year are required for ID generation');
        throw new Error('Grade and academic year are required');
      }

      try {
        // Extract end year from academic year (e.g., "2024-2025" → "2025")
        if (!academicYear.includes('-')) {
          throw new Error('Invalid academic year format. Expected "XXXX-YYYY"');
        }

        const endYear = academicYear.split('-')[1]; // "2025"
        const endYearInt = parseInt(endYear);

        // Calculate year prefix based on grade
        let yearForPrefix: number;
        if (grade === '10') {
          yearForPrefix = endYearInt;  // Grade 10: "25"
        } else if (grade === '11') {
          yearForPrefix = endYearInt - 1;  // Grade 11: "24"
        } else if (grade === '12') {
          yearForPrefix = endYearInt - 2;  // Grade 12: "23"
        } else {
          throw new Error('Invalid grade. Must be 10, 11, or 12');
        }

        const yearPrefix = yearForPrefix.toString().slice(-2);

        // Fetch all students with this year prefix
        const response = await api.request(`/students/by-prefix/${yearPrefix}`);
        if (response.success && response.data) {
          const students = response.data.map((s: any) => parseInt(s.student_id));
          let nextId = parseInt(yearPrefix + '0001');
          if (students.length > 0) {
            const maxId = Math.max(...students);
            nextId = maxId + 1;
          }

          return nextId.toString();
        }

        // Fallback: return first ID for prefix if query returns no students
        return yearPrefix + '0001';
      } catch (error) {
        logger.error('Error generating student ID:', error);
        throw error;  // Re-throw to caller
      }
    },
    []
  );

  // =============== Student CRUD Operations ===============
  const handleSubmitStudentForm = async (
    onSuccess: () => void,
    academicYear: string = '',
  ) => {
    if (!validateStudentForm()) {
      return;
    }

    setStudentFormLoading(true);
    try {
      // Use academic_year from form data if available, otherwise use parameter
      const yearForGeneration = studentFormData.academic_year || academicYear;
      const studentId = await generateStudentId(studentFormData.grade, yearForGeneration);

      const studentData = {
        student_id: studentId,
        ...studentFormData,
        force_create: forceCreateEnabled,
      };

      // Convert empty strings to null for optional fields
      const nullableFields = ['received_email', 'date_of_birth', 'email', 'phone', 'address'];
      const cleanData: any = {};
      for (const key in studentData) {
        if (nullableFields.includes(key) && !studentData[key]) {
          cleanData[key] = null;
        } else if (key === 'parent_contacts' && Array.isArray(studentData[key])) {
          // Filter out parent contacts with no name and no phone
          cleanData[key] = studentData[key].filter((contact: any) => 
            (contact.name && contact.name.trim()) || (contact.phone && contact.phone.trim())
          );
        } else {
          cleanData[key] = studentData[key];
        }
      }

      const response = await api.post('/students/', cleanData);

      if (response.success) {
        toast.success('Thêm học sinh thành công!');
        setStudentFormData(INITIAL_FORM_DATA);
        setStudentFormErrors({});
        setForceCreateEnabled(false);  // NEW: reset flag
        setDuplicateWarning(null);  // NEW: clear warning
        onSuccess();
      } else {
        toast.error('Lỗi khi thêm học sinh!');
      }
    } catch (error: any) {
      logger.error('Error adding student:', error);
      
      // NEW: Handle 409 Conflict (duplicate detected)
      if (error.response?.status === 409) {
        setDuplicateWarning(error.response?.data?.detail || 'Học sinh này có thể đã tồn tại');
        toast.warning('Phát hiện học sinh trùng. Vui lòng xác nhận để tiếp tục.');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.detail || 'Dữ liệu không hợp lệ');
      } else {
        toast.error('Lỗi khi thêm học sinh!');
      }
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleCloseAddStudentModal = () => {
    setStudentFormData(INITIAL_FORM_DATA);
    setStudentFormErrors({});
  };

  const handleEditStudent = (student: StudentData) => {
    setEditForm({
      ...student,
      grade: String(student.grade),
    });
  };

  const submitEditForm = async (onSuccess?: () => void) => {
    setEditLoading(true);
    try {
      const response = await api.put(`/students/${(editForm as any).id}`, editForm);

      if (response.success) {
        toast.success('Cập nhật học sinh thành công!');
        setEditForm({});
        onSuccess?.();
      } else {
        toast.error('Lỗi khi cập nhật học sinh!');
      }
    } catch (error) {
      logger.error('Error updating student:', error);
      toast.error('Lỗi khi cập nhật học sinh!');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteStudent = (studentId: number, onOpenConfirm: (config: any) => void, onCloseConfirm?: () => void, onSuccess?: () => void) => {
    logger.debug('[handleDeleteStudent] Opening confirm dialog for studentId:', studentId);
    logger.debug('[handleDeleteStudent] onSuccess provided:', !!onSuccess, 'ref before set:', !!deleteSuccessCallbackRef.current);
    // Store callbacks in refs to avoid stale closure when onConfirm runs
    deleteSuccessCallbackRef.current = onSuccess;
    deleteCloseCallbackRef.current = onCloseConfirm;
    logger.debug('[handleDeleteStudent] Ref after set:', !!deleteSuccessCallbackRef.current);
    onOpenConfirm({
      title: 'Vô hiệu học sinh',
      description: 'Bạn có chắc muốn vô hiệu hóa học sinh này?',
      confirmText: 'Vô hiệu hóa',
      onConfirm: async () => {
        logger.debug('[handleDeleteStudent] Confirm clicked, calling API...');
        logger.debug('[handleDeleteStudent] Ref value when confirm clicked:', !!deleteSuccessCallbackRef.current);
        try {
          const response = await api.request(`/students/${studentId}`, {
            method: 'DELETE',
          });
          logger.debug('[handleDeleteStudent] API response:', response);
          if (response.success) {
            toast.success('Vô hiệu hóa học sinh thành công!');
            logger.debug('[handleDeleteStudent] About to call ref callback, exists:', !!deleteSuccessCallbackRef.current);
            deleteSuccessCallbackRef.current?.();
            logger.debug('[handleDeleteStudent] After ref callback call');
            deleteCloseCallbackRef.current?.();
          }
        } catch (error: any) {
          logger.error('Error deactivating student:', error);
          toast.error('Lỗi khi vô hiệu hóa học sinh!');
          deleteCloseCallbackRef.current?.();
        }
      },
    });
  };

  const handleRemoveFromClass = (
    studentId: number,
    classId: number,
    onOpenConfirm: (config: any) => void,
    onCloseConfirm?: () => void,
    onSuccess?: () => void,
  ) => {
    // Store callbacks in refs to avoid stale closure when onConfirm runs
    removeFromClassSuccessCallbackRef.current = onSuccess;
    removeFromClassCloseCallbackRef.current = onCloseConfirm;
    onOpenConfirm({
      title: 'Xóa học sinh khỏi lớp',
      description: 'Bạn có chắc muốn xóa học sinh khỏi lớp này? Học sinh sẽ được chuyển sang lớp khác nếu có hoặc xóa nếu không có lớp nào khác.',
      confirmText: 'Xác nhận',
      onConfirm: async () => {
        try {
          const response = await api.request(`/students/${studentId}/from-class/${classId}`, {
            method: 'DELETE',
          });
          if (response.success) {
            toast.success(response.message || 'Xóa học sinh khỏi lớp thành công!');
            removeFromClassSuccessCallbackRef.current?.();
            removeFromClassCloseCallbackRef.current?.();
          }
        } catch (error: any) {
          logger.error('Error removing student from class:', error);
          const errorMessage = error.response?.data?.detail || 'Lỗi khi xóa học sinh khỏi lớp!';
          toast.error(errorMessage);
          removeFromClassCloseCallbackRef.current?.();
        }
      },
    });
  };

  const handlePermanentDeleteStudent = (
    studentId: number,
    studentName: string,
    onOpenConfirm: (config: any) => void,
    onCloseConfirm?: () => void,
    onSuccess?: () => void,
  ) => {
    // Store callbacks in refs to avoid stale closure when onConfirm runs
    permanentDeleteSuccessCallbackRef.current = onSuccess;
    permanentDeleteCloseCallbackRef.current = onCloseConfirm;
    onOpenConfirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc muốn xóa vĩnh viễn học sinh "${studentName}"?`,
      confirmText: 'Xóa',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await api.permanentDeleteStudent(studentId);
          if (response.success) {
            toast.success('Xóa học sinh thành công!');
            permanentDeleteSuccessCallbackRef.current?.();
            permanentDeleteCloseCallbackRef.current?.();
          }
        } catch (error) {
          logger.error('Error deleting student:', error);
          toast.error('Lỗi khi xóa học sinh!');
          permanentDeleteCloseCallbackRef.current?.();
        }
      },
    });
  };

  const handleRestore = async (student: StudentData, onSuccess?: () => void) => {
    // Store callback in ref to ensure fresh reference when async completes
    restoreSuccessCallbackRef.current = onSuccess;
    setRestoreLoading(true);
    try {
      const response = await api.request(`/students/${student.id}/restore`, {
        method: 'POST',
      });
      if (response.success) {
        toast.success('Khôi phục học sinh thành công!');
        restoreSuccessCallbackRef.current?.();
      }
    } catch (error) {
      logger.error('Error restoring student:', error);
      toast.error('Lỗi khi khôi phục học sinh!');
    } finally {
      setRestoreLoading(false);
    }
  };

  // =============== Import/Export ===============
  const downloadStudentTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');

      const headers = [
        'Họ và tên',
        'Email',
        'Số điện thoại',
        'Lớp học',
        'Khối',
        'Ngày sinh',
        'Giới tính',
        'Địa chỉ',
        'Năm nhập học',
      ];

      // Define borders
      const borders = {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } },
      };

      // Add header row
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FF000000' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      headerRow.height = 25;

      // Apply borders to header row
      headerRow.eachCell((cell) => {
        cell.border = borders;
      });

      // Add example row with data
      const exampleRow = worksheet.addRow([
        'Nguyễn Văn A',
        'nguyenvana@example.com',
        '0123456789',
        '10A1',
        '10',
        '15/01/2009',  // dd/mm/yyyy format
        'Nam',
        '123 Đường ABC, TP HCM',
        '2025-2026',
      ]);
      exampleRow.height = 20;
      exampleRow.alignment = { horizontal: 'left', vertical: 'middle' };
      exampleRow.font = { italic: true, color: { argb: 'FF999999' } };
      exampleRow.eachCell((cell) => {
        cell.border = borders;
      });

      // Add 9 empty rows (after the example row)
      for (let i = 0; i < 9; i++) {
        const row = worksheet.addRow(Array(headers.length).fill(''));
        row.height = 20;
        row.alignment = { horizontal: 'left', vertical: 'middle' };
        row.eachCell((cell) => {
          cell.border = borders;
        });
      }

      // Set column widths
      worksheet.columns = [
        { width: 20 }, // Họ và tên
        { width: 25 }, // Email
        { width: 15 }, // Số điện thoại
        { width: 15 }, // Lớp học
        { width: 10 }, // Khối
        { width: 15 }, // Ngày sinh
        { width: 12 }, // Giới tính
        { width: 25 }, // Địa chỉ
        { width: 15 }, // Năm nhập học
      ];

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'student_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Tải template thành công!');
    } catch (error) {
      logger.error('Error downloading template:', error);
      toast.error('Lỗi khi tải template!');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let parsedData: any[] = [];

        if (isCSV) {
          // Handle CSV files
          const csvText = e.target?.result as string;
          const lines = csvText.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            parsedData.push(row);
          }
        } else {
          // Handle Excel files (.xlsx, .xls)
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
          }) as any[];
        }

        if (parsedData.length === 0) {
          toast.error('File không chứa dữ liệu');
          return;
        }

        const errors: string[] = [];
        const validData: ImportedGradeRow[] = [];
        let rowNum = 1; // Start from row 1 (after header)

        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          
          // Skip completely empty rows
          const isEmptyRow = Object.values(row).every(
            (val) => !val || val === '' || (typeof val === 'string' && val.trim() === '')
          );
          if (isEmptyRow) {
            continue;
          }

          rowNum++;

          const mapped: ImportedGradeRow = {
            ho_va_ten: row.ho_va_ten || row['Họ và tên'] || row['Họ tên'] || '',
            email: row.email || row['Email'] || '',
            so_dien_thoai: row.so_dien_thoai || row['Số điện thoại'] || row['SĐT'] || '',
            lop_hoc: row.lop_hoc || row['Lớp học'] || row['Lớp'] || '',
            khoi: row.khoi || row['Khối'] || '',
            ngay_sinh: row.ngay_sinh || row['Ngày sinh'] || row['Ngày sinh'] || '',
            gioi_tinh: row.gioi_tinh || row['Giới tính'] || '',
            dia_chi: row.dia_chi || row['Địa chỉ'] || row['Địa chỉ'] || '',
            nam_nhap_hoc: row.nam_nhap_hoc || row['Năm nhập học'] || '',
            ten_phu_huynh: row.ten_phu_huynh || row['Tên phụ huynh'] || '',
            sdt_phu_huynh: row.sdt_phu_huynh || row['SĐT phụ huynh'] || '',
            ten_bo: row.ten_bo || row['Tên bố'] || '',
            sdt_bo: row.sdt_bo || row['SĐT bố'] || '',
            ten_me: row.ten_me || row['Tên mẹ'] || '',
            sdt_me: row.sdt_me || row['SĐT mẹ'] || '',
            parent_contacts: row.parent_contacts || undefined,
          };

          if (!mapped.ho_va_ten) {
            errors.push(`Hàng ${rowNum}: Thiếu họ và tên (bắt buộc)`);
          } else {
            validData.push(mapped);
          }
        }

        // Check if all rows were filtered out (all empty)
        if (validData.length === 0 && parsedData.length > 0) {
          toast.error('File không chứa dữ liệu hợp lệ (tất cả hàng đều trống)');
        }

        setImportedData(validData);
        setImportErrors(errors);
        // if (validData.length > 0 && errors.length === 0) {
        //   toast.success(`✅ Đã tải ${validData.length} học sinh`);
        // } else if (validData.length > 0 && errors.length > 0) {
        //   toast.warning(`⚠️ Tải ${validData.length} học sinh, ${errors.length} lỗi ở các hàng trống`);
        // } else if (errors.length > 0) {
        //   toast.error(`❌ ${errors.length} lỗi được tìm thấy`);
        // }
      } catch (error) {
        logger.error('Error parsing file:', error);
        const errorMsg = error instanceof Error ? error.message : 'Không xác định';
        toast.error(`❌ Lỗi khi đọc file: ${errorMsg}`);
      }
    };

    reader.onerror = () => {
      logger.error('Error reading file');
      toast.error('❌ Lỗi khi đọc file');
    };

    if (isCSV) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = '';
  };

  const handleConfirmImport = async (onSuccess?: () => void) => {
    if (importedData.length === 0) {
      toast.error('Không có dữ liệu để import!');
      return;
    }

    // Helper function to convert date to YYYY-MM-DD format
    // Handles both Excel date serial and text dates (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd)
    const convertDateToISOFormat = (dateValue: string | number): string => {
      if (!dateValue) return '';
      
      const dateStr = String(dateValue).trim();
      
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // Try to parse dd/mm/yyyy or dd-mm-yyyy format
      const ddmmyyyyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
      const match = dateStr.match(ddmmyyyyRegex);
      if (match) {
        const day = String(match[1]).padStart(2, '0');
        const month = String(match[2]).padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
      
      // Try to parse as Excel date serial number
      const num = typeof dateValue === 'string' ? parseFloat(dateValue) : dateValue;
      if (!isNaN(num) && num > 0) {
        // Excel date serial (days since Jan 1, 1900, but with a leap year bug)
        // JavaScript uses milliseconds since Jan 1, 1970
        // Excel serial 1 = Jan 1, 1900
        // Excel serial 44562 = Jan 1, 2022
        const excelEpoch = new Date(1900, 0, 1);
        const jsDate = new Date(excelEpoch.getTime() + num * 86400000); // 86400000 ms in a day
        
        // Format as YYYY-MM-DD
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Return as-is if cannot parse
      return dateStr;
    };

    setImportLoading(true);
    setImportBackendError('');
    try {
      // Validate and format data before sending
      const validationErrors: string[] = [];
      const formattedStudents: Record<string, any>[] = [];

      for (let i = 0; i < importedData.length; i++) {
        const student = importedData[i];
        const rowNum = i + 2; // +2 because Excel is 1-indexed and row 1 is header

        // Validate required fields - convert to string first
        const hoVaTen = String(student.ho_va_ten || '').trim();
        const lopHoc = String(student.lop_hoc || '').trim();
        const khoi = String(student.khoi || '').trim();

        if (!hoVaTen) {
          validationErrors.push(`Hàng ${rowNum}: Thiếu họ và tên`);
          continue;
        }
        if (!lopHoc) {
          validationErrors.push(`Hàng ${rowNum}: Thiếu lớp học`);
          continue;
        }
        if (!khoi) {
          validationErrors.push(`Hàng ${rowNum}: Thiếu khối`);
          continue;
        }

        // Validate khoi is 10, 11, or 12
        if (!['10', '11', '12'].includes(khoi)) {
          validationErrors.push(`Hàng ${rowNum}: Khối không hợp lệ (phải là 10, 11 hoặc 12)`);
          continue;
        }

        // Validate nam_nhap_hoc format if provided
        const namNhapHoc = String(student.nam_nhap_hoc || '').trim();
        if (namNhapHoc && !/^\d{4}-\d{4}$/.test(namNhapHoc)) {
          validationErrors.push(`Hàng ${rowNum}: Năm nhập học không hợp lệ (định dạng: YYYY-YYYY, ví dụ: 2025-2026)`);
          continue;
        }

        // Warn if nam_nhap_hoc doesn't match stored academic year
        if (namNhapHoc && namNhapHoc !== storedAcademicYear) {
          logger.warn(`Hàng ${rowNum}: Năm nhập học '${namNhapHoc}' không khớp với năm học hiện tại '${storedAcademicYear}'. Sẽ dùng năm học hiện tại cho tạo mã học sinh.`);
        }

        // Format the student record with proper null handling
        const formatted: Record<string, any> = {
          ho_va_ten: hoVaTen,
          lop_hoc: lopHoc,
          khoi: khoi,
          gioi_tinh: String(student.gioi_tinh || 'Nam').trim() || 'Nam',
        };

        // Add optional fields only if they have values
        const email = String(student.email || '').trim();
        if (email) {
          formatted.email = email;
        }

        const sodt = String(student.so_dien_thoai || '').trim();
        if (sodt) {
          formatted.so_dien_thoai = sodt;
        }

        // Convert date to proper YYYY-MM-DD format
        const ngaysinh = convertDateToISOFormat(student.ngay_sinh || '');
        if (ngaysinh) {
          formatted.ngay_sinh = ngaysinh;
        }

        const diachi = String(student.dia_chi || '').trim();
        if (diachi) {
          formatted.dia_chi = diachi;
        }

        const tenph = String(student.ten_phu_huynh || '').trim();
        if (tenph) {
          formatted.ten_phu_huynh = tenph;
        }

        const sdtph = String(student.sdt_phu_huynh || '').trim();
        if (sdtph) {
          formatted.sdt_phu_huynh = sdtph;
        }

        const tenbo = String(student.ten_bo || '').trim();
        if (tenbo) {
          formatted.ten_bo = tenbo;
        }

        const sdtbo = String(student.sdt_bo || '').trim();
        if (sdtbo) {
          formatted.sdt_bo = sdtbo;
        }

        const tenme = String(student.ten_me || '').trim();
        if (tenme) {
          formatted.ten_me = tenme;
        }

        const sdtme = String(student.sdt_me || '').trim();
        if (sdtme) {
          formatted.sdt_me = sdtme;
        }

        if (student.parent_contacts) {
          formatted.parent_contacts = student.parent_contacts;
        }

        formattedStudents.push(formatted);
      }

      // Check for validation errors
      if (validationErrors.length > 0) {
        setImportBackendError(validationErrors.join('\n'));
        toast.error(`Có ${validationErrors.length} lỗi validation trước khi gửi`);
        setImportLoading(false);
        return;
      }

      if (formattedStudents.length === 0) {
        setImportBackendError('Không có học sinh hợp lệ để import');
        setImportLoading(false);
        return;
      }

      const payload: any = {
        students: formattedStudents,
        academic_year: storedAcademicYear,
      };
      
      // Include class_id if available (for homeroom_students_history)
      if (storedClassId) {
        payload.class_id = storedClassId;
      }

      logger.debug('Bulk import payload:', payload);

      const response = await api.post('/admin/students/bulk-import', payload);

      if (response.success) {
        toast.success(`${response.data?.success_count || 0} học sinh được thêm`);
        setImportedData([]);
        setImportErrors([]);
        setImportBackendError('');
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } else {
        const errorMsg = response.message || 'Lỗi khi import học sinh!';
        logger.error('Import response error:', response);
        setImportBackendError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      logger.error('Error importing students:', error);
      const errorMsg = error instanceof Error ? error.message : 'Lỗi khi import học sinh!';
      setImportBackendError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportModal = () => {
    setImportedData([]);
    setImportErrors([]);
  };

  // =============== Tab 1: Profile Management ===============

  /**
   * Load all students (active and inactive) - fetches all pages
   * Used in ClassManagement Tab 1 (Profiles)
   * Automatically fetches all pages from paginated API response
   * 
   * Note: For 10,000+ records, consider implementing:
   * - Server-side search/filter to reduce data transfer
   * - Virtual scrolling for large tables
   * - Lazy loading / infinite scroll pattern
   */
  const loadAllStudents = useCallback(async () => {
    try {
      const allStudents: any[] = [];
      let page = 1;
      let hasMore = true;
      const PAGE_SIZE = 100; // Use max allowed by backend

      while (hasMore) {
        const response = await api.get(`/students/?page=${page}&page_size=${PAGE_SIZE}`);
        
        if (response.success && response.data) {
          allStudents.push(...response.data);
          
          // Check if we got fewer records than requested (means this is the last page)
          if (response.data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          toast.error(response.message || 'Lỗi tải danh sách học sinh!');
          hasMore = false;
        }
      }

      return allStudents;
    } catch (error) {
      logger.error('Error loading all students:', error);
      const errorMsg = error instanceof Error ? error.message : 'Lỗi tải danh sách học sinh!';
      toast.error(errorMsg);
      return [];
    }
  }, []);

  /**
   * Assign a student to a class
   * Used in ClassManagement Tab 1 (Profiles) for orphaned student assignment
   */
  const assignStudentToClass = useCallback(
    async (studentId: number | string, classId: number | string) => {
      try {
        const response = await api.put(`/students/${studentId}/assign-class`, {
          class_id: classId,
        });

        if (response.success) {
          toast.success('Phân bổ lớp thành công!');
          return { success: true, data: response.data };
        } else {
          const errorMsg = response.message || 'Lỗi phân bổ lớp!';
          toast.error(errorMsg);
          return { success: false, message: errorMsg };
        }
      } catch (error) {
        logger.error('Error assigning student to class:', error);
        const errorMsg = error instanceof Error ? error.message : 'Lỗi phân bổ lớp!';
        toast.error(errorMsg);
        return { success: false, message: errorMsg };
      }
    },
    []
  );

  // =============== Return ===============
  return {
    // Add form
    studentFormData,
    setStudentFormData,
    studentFormErrors,
    studentFormLoading,
    forceCreateEnabled,  // NEW
    setForceCreateEnabled,  // NEW
    duplicateWarning,  // NEW
    setDuplicateWarning,  // NEW
    handleStudentFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    validateStudentForm,
    handleSubmitStudentForm,
    handleCloseAddStudentModal,

    // Edit form
    editForm,
    setEditForm,
    editLoading,
    handleEditFormChange,
    addParentContactRowEdit,
    removeParentContactRowEdit,
    updateParentContactFieldEdit,
    handleEditStudent,
    submitEditForm,

    // Student operations
    handleDeleteStudent,
    handleRemoveFromClass,
    handlePermanentDeleteStudent,
    handleRestore,
    restoreLoading,

    // Import/Export
    importedData,
    setImportedData,
    importErrors,
    setImportErrors,
    importLoading,
    importBackendError,
    downloadStudentTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleCloseImportModal,

    // Tab 1: Profile Management
    loadAllStudents,
    assignStudentToClass,
  };
};
