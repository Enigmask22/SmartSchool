import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
  [key: string]: any;
}

const INITIAL_FORM_DATA: StudentFormData = {
  full_name: '',
  email: '',
  phone: '',
  received_email: '',
  class_name: '',
  grade: '',
  class_id: null,
  date_of_birth: '',
  address: '',
  parent_contacts: [{ relation: 'parent', name: '', phone: '' }],
  gender: 'Nam',
};

export const useClassManagementStudentOps = () => {
  // Add Student Form State
  const [studentFormData, setStudentFormData] = useState<StudentFormData>(INITIAL_FORM_DATA);
  const [studentFormErrors, setStudentFormErrors] = useState<Record<string, string | null>>({});
  const [studentFormLoading, setStudentFormLoading] = useState(false);

  // Edit Student Form State
  const [editForm, setEditForm] = useState<Partial<EditFormData>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Import Form State
  const [importedData, setImportedData] = useState<ImportedGradeRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Restore loading
  const [restoreLoading, setRestoreLoading] = useState(false);

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

    if (!studentFormData.class_name.trim()) {
      newErrors.class_name = 'Lớp học là bắt buộc';
    }

    if (!studentFormData.grade.trim()) {
      newErrors.grade = 'Khối là bắt buộc';
    }

    if (studentFormData.email && !/\S+@\S+\.\S+/.test(studentFormData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setStudentFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============== ID Generation ===============
  const generateStudentId = useCallback(async (grade: string) => {
    if (!grade) return Date.now().toString();

    try {
      const response = await api.request(`/students/by-grade/${grade}`);
      if (response.success && response.data) {
        const currentYear = new Date().getFullYear();
        let yearPrefix;
        if (grade === '10') yearPrefix = currentYear.toString().slice(-2);
        else if (grade === '11') yearPrefix = (currentYear - 1).toString().slice(-2);
        else if (grade === '12') yearPrefix = (currentYear - 2).toString().slice(-2);
        else yearPrefix = currentYear.toString().slice(-2);

        const students = response.data.map((s: any) => parseInt(s.student_id));
        let nextId = parseInt(yearPrefix + '0001');
        if (students.length > 0) {
          const maxId = Math.max(...students);
          nextId = maxId + 1;
        }

        return nextId.toString();
      }
    } catch (error) {
      logger.error('Error generating student ID:', error);
      const currentYear = new Date().getFullYear();
      let yearPrefix;
      if (grade === '10') yearPrefix = currentYear.toString().slice(-2);
      else if (grade === '11') yearPrefix = (currentYear - 1).toString().slice(-2);
      else if (grade === '12') yearPrefix = (currentYear - 2).toString().slice(-2);
      else yearPrefix = currentYear.toString().slice(-2);

      return yearPrefix + Date.now().toString().slice(-4);
    }
  }, []);

  // =============== Student CRUD Operations ===============
  const handleSubmitStudentForm = async (
    onSuccess: () => void,
  ) => {
    if (!validateStudentForm()) {
      return;
    }

    setStudentFormLoading(true);
    try {
      const studentId = await generateStudentId(studentFormData.grade);

      const studentData = {
        student_id: studentId,
        ...studentFormData,
      };

      const nullableFields = ['received_email'];
      const cleanData: any = {};
      for (const key in studentData) {
        if (nullableFields.includes(key) && !studentData[key]) {
          cleanData[key] = null;
        } else {
          cleanData[key] = studentData[key];
        }
      }

      const response = await api.post('/students', cleanData);

      if (response.success) {
        toast.success('Thêm học sinh thành công!');
        setStudentFormData(INITIAL_FORM_DATA);
        setStudentFormErrors({});
        onSuccess();
      } else {
        toast.error('Lỗi khi thêm học sinh!');
      }
    } catch (error) {
      logger.error('Error adding student:', error);
      toast.error('Lỗi khi thêm học sinh!');
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

  const handleDeleteStudent = (studentId: number, onOpenConfirm: (config: any) => void) => {
    onOpenConfirm({
      title: 'Vô hiệu học sinh',
      description: 'Bạn có chắc muốn vô hiệu hóa học sinh này?',
      confirmText: 'Vô hiệu hóa',
      onConfirm: async () => {
        try {
          const response = await api.request(`/students/${studentId}/deactivate`, {
            method: 'PUT',
          });
          if (response.success) {
            toast.success('Vô hiệu hóa học sinh thành công!');
          }
        } catch (error) {
          logger.error('Error deactivating student:', error);
          toast.error('Lỗi khi vô hiệu hóa học sinh!');
        }
      },
    });
  };

  const handlePermanentDeleteStudent = (
    studentId: number,
    studentName: string,
    onOpenConfirm: (config: any) => void,
  ) => {
    onOpenConfirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc muốn xóa vĩnh viễn học sinh "${studentName}"?`,
      confirmText: 'Xóa',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await api.request(`/students/${studentId}`, { method: 'DELETE' });
          if (response.success) {
            toast.success('Xóa học sinh thành công!');
          }
        } catch (error) {
          logger.error('Error deleting student:', error);
          toast.error('Lỗi khi xóa học sinh!');
        }
      },
    });
  };

  const handleRestore = async (student: StudentData, onSuccess?: () => void) => {
    setRestoreLoading(true);
    try {
      const response = await api.request(`/students/${student.id}/activate`, {
        method: 'PUT',
      });
      if (response.success) {
        toast.success('Khôi phục học sinh thành công!');
        onSuccess?.();
      }
    } catch (error) {
      logger.error('Error restoring student:', error);
      toast.error('Lỗi khi khôi phục học sinh!');
    } finally {
      setRestoreLoading(false);
    }
  };

  // =============== Import/Export ===============
  const downloadStudentTemplate = () => {
    const headers = [
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Lớp học',
      'Khối',
      'Ngày sinh',
      'Giới tính',
      'Địa chỉ',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'student_template.xlsx');
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
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
        }) as any[];

        const errors: string[] = [];
        const validData: ImportedGradeRow[] = [];

        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          const mapped: ImportedGradeRow = {
            ho_va_ten: row.ho_va_ten || row['Họ và tên'] || '',
            email: row.email || row['Email'] || '',
            so_dien_thoai: row.so_dien_thoai || row['Số điện thoại'] || '',
            lop_hoc: row.lop_hoc || row['Lớp học'] || '',
            khoi: row.khoi || row['Khối'] || '',
            ngay_sinh: row.ngay_sinh || row['Ngày sinh'] || '',
            gioi_tinh: row.gioi_tinh || row['Giới tính'] || '',
            dia_chi: row.dia_chi || row['Địa chỉ'] || '',
          };

          if (!mapped.ho_va_ten || !mapped.lop_hoc) {
            errors.push(`Hàng ${i + 1}: Thiếu họ tên hoặc lớp học`);
          } else {
            validData.push(mapped);
          }
        }

        setImportedData(validData);
        setImportErrors(errors);
        if (validData.length > 0 && errors.length === 0) {
          toast.success(`Đã tải ${validData.length} học sinh`);
        } else if (errors.length > 0) {
          toast.error(`${errors.length} lỗi được tìm thấy`);
        }
      } catch (error) {
        logger.error('Error parsing file:', error);
        toast.error('Lỗi khi đọc file!');
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleConfirmImport = async (onSuccess?: () => void) => {
    if (importedData.length === 0) {
      toast.error('Không có dữ liệu để import!');
      return;
    }

    setImportLoading(true);
    try {
      const response = await api.post('/students/bulk-create', {
        students: importedData,
      });

      if (response.success) {
        toast.success(`${response.data?.success_count || 0} học sinh được thêm`);
        setImportedData([]);
        setImportErrors([]);
        onSuccess?.();
      } else {
        toast.error('Lỗi khi import học sinh!');
      }
    } catch (error) {
      logger.error('Error importing students:', error);
      toast.error('Lỗi khi import học sinh!');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportModal = () => {
    setImportedData([]);
    setImportErrors([]);
  };

  // =============== Return ===============
  return {
    // Add form
    studentFormData,
    setStudentFormData,
    studentFormErrors,
    studentFormLoading,
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
    handlePermanentDeleteStudent,
    handleRestore,
    restoreLoading,

    // Import/Export
    importedData,
    setImportedData,
    importErrors,
    setImportErrors,
    importLoading,
    downloadStudentTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleCloseImportModal,
  };
};
