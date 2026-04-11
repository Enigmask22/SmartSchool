import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/utils/api';
import * as XLSX from 'xlsx';
import logger from '@/utils/logger';

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

export interface ClassData {
  id: number;
  class_name: string;
  grade: number | string;
  homeroom_teacher?: string;
  academic_year?: string;
  teachers?: {
    teacher_code: string;
    full_name: string;
  };
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

export interface ConfirmState {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: 'destructive' | 'default';
  onConfirm?: () => void;
}

export const useClassManagement = () => {
  // === Class Management Tab States ===
  const [selectedClassForManagement, setSelectedClassForManagement] = useState('');
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  const [classStudents, setClassStudents] = useState<StudentData[]>([]);
  const [homeroomTeacher, setHomeroomTeacher] = useState<{
    name: string;
    code: string;
    full_name: string;
  } | null>(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  // === Edit Student Modal States ===
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentData | null>(null);
  const [editForm, setEditForm] = useState<Partial<EditFormData>>({});
  const [editLoading, setEditLoading] = useState(false);

  // === Add Student Modal States ===
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentFormData, setStudentFormData] = useState<StudentFormData>({
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
  });
  const [studentFormErrors, setStudentFormErrors] = useState<Record<string, string | null>>({});
  const [studentFormLoading, setStudentFormLoading] = useState(false);

  // === Pagination States ===
  const [currentPage, setCurrentPage] = useState(1);
  const [classManagementPageSize, setClassManagementPageSize] = useState(10);

  // === Import Modal States ===
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ImportedGradeRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // === Reference Data & Filters ===
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');

  // === Move Class Modal States ===
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [moveYear, setMoveYear] = useState('');
  const [moveClasses, setMoveClasses] = useState<ClassData[]>([]);
  const [moveTargetClassId, setMoveTargetClassId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);

  // === Confirm Dialog Handlers ===
  const openConfirm = useCallback((config: Partial<ConfirmState>) =>
    setConfirmState({ open: true, variant: 'destructive', confirmText: 'Xác nhận', ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);

  // === Data Loading Functions ===
  const loadClassManagementData = useCallback(async () => {
    try {
      const endpoint = selectedAcademicYear
        ? `/admin/classes?academic_year=${encodeURIComponent(selectedAcademicYear)}`
        : '/admin/classes';
      const response = await api.request(endpoint);
      if (response.success) {
        let filteredClasses = response.data || [];

        if (selectedGrade) {
          filteredClasses = filteredClasses.filter(
            (cls) => cls.grade.toString() === selectedGrade,
          );
        }

        setClasses(filteredClasses);
      }
    } catch (err) {
      logger.error('Error loading classes:', err);
    }
  }, [selectedAcademicYear, selectedGrade]);

  const loadClassStudents = useCallback(async () => {
    if (!selectedClassForManagement) return;

    setLoadingClassData(true);
    setCurrentPage(1);

    try {
      const response = await api.request(
        `/admin/classes/${selectedClassForManagement}/students`,
      );
      if (response.success) {
        let students = response.data || [];

        if (showInactiveStudents) {
          students = students.filter((student: StudentData) => student.is_active === false);
        } else {
          students = students.filter((student: StudentData) => student.is_active !== false);
        }

        students = students.sort((a: StudentData, b: StudentData) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        setClassStudents(students);

        const classInfo = classes.find(
          (c) => c.id === parseInt(selectedClassForManagement),
        );
        if (classInfo) {
          setHomeroomTeacher({
            name: classInfo.homeroom_teacher || 'Chưa phân công',
            code: classInfo.teachers?.teacher_code || '',
            full_name: classInfo.teachers?.full_name || '',
          });
        }
      }
    } catch (err) {
      logger.error('Error loading class students:', err);
      setError('Không thể tải danh sách học sinh');
    } finally {
      setLoadingClassData(false);
    }
  }, [selectedClassForManagement, showInactiveStudents, classes]);

  // === Student ID Generation ===
  const generateStudentId = useCallback(async (grade: string, academicYear: string) => {
    try {
      if (!grade || !academicYear) {
        throw new Error('Grade and academic year are required');
      }

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

      // Fetch all students with this year prefix (not just by grade)
      const response = await api.request(`/admin/students/by-prefix/${yearPrefix}`);
      if (response.success) {
        const students = response.data || [];

        const filteredStudents = students
          .map((student: StudentData) => parseInt(student.student_id))
          .filter((id: number) => !isNaN(id))
          .sort((a: number, b: number) => a - b);

        let nextId = parseInt(yearPrefix + '0001');
        if (filteredStudents.length > 0) {
          const maxId = Math.max(...filteredStudents);
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
  }, []);

  // === Form Handlers ===
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

  // === Parent Contact Handlers (Add) ===
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
      parent_contacts: (prev.parent_contacts || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const updateParentContactField = (index: number, field: string, value: string) => {
    setStudentFormData((prev) => {
      const list = [...(prev.parent_contacts || [])];
      list[index] = { ...list[index], [field]: value };
      return {
        ...prev,
        parent_contacts: list,
      };
    });
  };

  // === Parent Contact Handlers (Edit) ===
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
      parent_contacts: (prev.parent_contacts || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const updateParentContactFieldEdit = (index: number, field: string, value: string) => {
    setEditForm((prev) => {
      const list = [...(prev.parent_contacts || [])];
      list[index] = { ...list[index], [field]: value };
      return {
        ...prev,
        parent_contacts: list,
      };
    });
  };

  // === Validation ===
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

  // === Student CRUD Operations ===
  const handleSubmitStudentForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStudentForm()) {
      return;
    }

    setStudentFormLoading(true);
    try {
      const studentId = await generateStudentId(studentFormData.grade, selectedAcademicYear);

      const studentData = {
        student_id: studentId,
        ...studentFormData,
      };

      const nullableFields = ['received_email'];
      const cleanData: any = {};
      Object.keys(studentData).forEach((key) => {
        const value = studentData[key as keyof typeof studentData];
        if (nullableFields.includes(key)) {
          cleanData[key] = value && value.toString().trim() !== '' ? value.toString().trim() : null;
        } else if (value !== '' && value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });

      cleanData.parent_contacts = (studentFormData.parent_contacts || [])
        .map((c) => ({
          relation: c.relation || 'parent',
          name: (c.name && c.name.trim()) || null,
          phone: (c.phone && c.phone.trim()) || null,
        }))
        .filter((c) => c.name || c.phone);

      if (cleanData.parent_contacts.length === 0) {
        delete cleanData.parent_contacts;
      }

      if (!cleanData.class_id && selectedClassForManagement) {
        cleanData.class_id = parseInt(selectedClassForManagement);
      }

      const response = await api.request('/admin/students', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });

      if (response.success) {
        setStudentFormData({
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
        });
        setStudentFormErrors({});
        setShowAddStudentModal(false);

        loadClassStudents();

        toast.success('Thêm học sinh thành công!');
      } else {
        setError(response.message || 'Không thể thêm học sinh');
      }
    } catch (error) {
      logger.error('Error creating student:', error);
      setError('Có lỗi xảy ra khi thêm học sinh: ' + (error as Error).message);
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleCloseAddStudentModal = () => {
    setStudentFormData({
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
    });
    setStudentFormErrors({});
    setShowAddStudentModal(false);
  };

  const handleEditStudent = (student: StudentData) => {
    setSelectedStudentForEdit(student);
    setEditForm({
      full_name: student.full_name || '',
      email: student.email || '',
      phone: student.phone || '',
      received_email: student.received_email || '',
      class_name: student.class_name || '',
      class_id: null,
      grade: String(student.grade) || '',
      date_of_birth: student.date_of_birth || '',
      address: student.address || '',
      parent_name:
        (student.parent_contacts && student.parent_contacts[0]?.name) || '',
      parent_phone:
        (student.parent_contacts && student.parent_contacts[0]?.phone) || '',
      parent_contacts:
        student.parent_contacts && student.parent_contacts.length > 0
          ? student.parent_contacts
          : [{ relation: 'parent', name: '', phone: '' }],
      gender: student.gender || 'Nam',
    });
    setShowEditModal(true);
  };

  const submitEditForm = async () => {
    if (!selectedStudentForEdit || !editForm.full_name?.toString().trim()) {
      toast.warning('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setEditLoading(true);
    try {
      const payload: any = { ...editForm };

      if (!payload.received_email || payload.received_email.toString().trim() === '') {
        payload.received_email = null;
      } else {
        payload.received_email = payload.received_email.toString().trim();
      }

      if (Array.isArray(payload.parent_contacts)) {
        payload.parent_contacts = payload.parent_contacts
          .map((c: ParentContact) => ({
            relation: c.relation || 'parent',
            name: (c.name && c.name.trim()) || null,
            phone: (c.phone && c.phone.trim()) || null,
          }))
          .filter((c: ParentContact) => c.name || c.phone);

        if (payload.parent_contacts.length === 0) {
          delete payload.parent_contacts;
        }
      }

      logger.debug('Updating student:', selectedStudentForEdit.id, payload);
      const response = await api.updateStudent(
        selectedStudentForEdit.id,
        payload,
      );
      logger.debug('Update response:', response);

      if (response.success) {
        toast.success('Cập nhật thông tin học sinh thành công!');

        await loadClassStudents();

        setShowEditModal(false);
        setSelectedStudentForEdit(null);
        setEditForm({});
      } else {
        toast.error(response.message || 'Không thể cập nhật thông tin học sinh');
      }
    } catch (error) {
      logger.error('Error updating student:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thông tin học sinh');
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

  const handleDeleteStudent = (studentId: number) => {
    openConfirm({
      title: 'Xóa tạm thời học sinh',
      description: 'Bạn có chắc chắn muốn xóa tạm thời học sinh này?\nBạn có thể khôi phục trong tab \'Hiển thị học sinh đã xóa\'.',
      confirmText: 'Xóa tạm thời',
      onConfirm: async () => {
        closeConfirm();
        try {
          const response = await api.deleteStudent(studentId);
          if (response.success) {
            toast.success('Xóa tạm thời học sinh thành công!', {
              description: 'Bạn có thể khôi phục trong tab \'Hiển thị học sinh đã xóa\'.',
            });
            loadClassStudents();
          } else {
            toast.error(response.message || 'Không thể xóa học sinh');
          }
        } catch (error) {
          logger.error('Error deleting student:', error);
          toast.error('Có lỗi xảy ra khi xóa học sinh: ' + (error as Error).message);
        }
      },
    });
  };

  const handlePermanentDeleteStudent = (studentId: number, studentName: string) => {
    openConfirm({
      title: 'Xóa vĩnh viễn học sinh',
      description: `Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN học sinh ${studentName}?\n\nHành động này sẽ xóa:\n- Thông tin học sinh\n- Tất cả bản ghi điểm danh\n- Tất cả bản ghi điểm số\n\nHành động này KHÔNG THỂ HOÀN TÁC!`,
      confirmText: 'Xóa vĩnh viễn',
      onConfirm: async () => {
        closeConfirm();
        try {
          const response = await api.permanentDeleteStudent(studentId);
          if (response.success) {
            toast.success('Xóa vĩnh viễn học sinh thành công!');
            loadClassStudents();
          } else {
            toast.error(response.message || 'Không thể xóa vĩnh viễn học sinh');
          }
        } catch (error) {
          logger.error('Error permanently deleting student:', error);
          toast.error('Có lỗi xảy ra khi xóa vĩnh viễn học sinh: ' + (error as Error).message);
        }
      },
    });
  };

  const handleRestore = (student: StudentData) => {
    logger.debug('Restore button clicked for student:', student);

    openConfirm({
      title: 'Khôi phục học sinh',
      description: `Bạn có chắc chắn muốn khôi phục học sinh ${student.full_name}?`,
      confirmText: 'Khôi phục',
      variant: 'default',
      onConfirm: async () => {
        closeConfirm();
        setRestoreLoading(true);
        try {
          logger.debug('Sending restore request for student ID:', student.id);
          const response = await api.restoreStudent(student.id);
          logger.debug('Restore response:', response);

          if (response.success) {
            toast.success('Khôi phục học sinh thành công!');
            loadClassStudents();
          } else {
            toast.error(response.message || 'Không thể khôi phục học sinh');
          }
        } catch (error) {
          logger.error('Error restoring student:', error);
          toast.error('Có lỗi xảy ra khi khôi phục học sinh: ' + (error as Error).message);
        } finally {
          setRestoreLoading(false);
        }
      },
    });
  };

  // === Import/Export ===
  const downloadStudentTemplate = () => {
    const templateData = [
      {
        ho_va_ten: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        so_dien_thoai: '0123456789',
        lop_hoc: '10A1',
        khoi: '10',
        ngay_sinh: '2006-01-01',
        gioi_tinh: 'Nam',
        dia_chi: '123 Đường ABC, Quận 1, TP.HCM',
        phu_huynh_1_quan_he: 'Bố',
        phu_huynh_1_ho_ten: 'Nguyễn Văn Bố',
        phu_huynh_1_sdt: '0987654321',
        phu_huynh_2_quan_he: 'Mẹ',
        phu_huynh_2_ho_ten: 'Trần Thị Mẹ',
        phu_huynh_2_sdt: '0976543210',
        phu_huynh_3_quan_he: '',
        phu_huynh_3_ho_ten: '',
        phu_huynh_3_sdt: '',
      },
      {
        ho_va_ten: 'Trần Thị B',
        email: 'tranthib@example.com',
        so_dien_thoai: '0123456788',
        lop_hoc: '10A1',
        khoi: '10',
        ngay_sinh: '2006-05-15',
        gioi_tinh: 'Nữ',
        dia_chi: '456 Đường XYZ, Quận 3, TP.HCM',
        phu_huynh_1_quan_he: 'Mẹ',
        phu_huynh_1_ho_ten: 'Nguyễn Thị Lan',
        phu_huynh_1_sdt: '0965432109',
        phu_huynh_2_quan_he: 'Bố',
        phu_huynh_2_ho_ten: 'Trần Văn Hoàng',
        phu_huynh_2_sdt: '0954321098',
        phu_huynh_3_quan_he: '',
        phu_huynh_3_ho_ten: '',
        phu_huynh_3_sdt: '',
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    const columnWidths = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'students_template.xlsx');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ImportedGradeRow[];

        const validData: ImportedGradeRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: ImportedGradeRow, index: number) => {
          const rowNum = index + 2;

          if (!row.ho_va_ten || !row.ho_va_ten.toString().trim()) {
            errors.push(`Dòng ${rowNum}: Họ và tên không được để trống`);
            return;
          }

          if (!row.lop_hoc || !row.lop_hoc.toString().trim()) {
            errors.push(`Dòng ${rowNum}: Lớp học không được để trống`);
            return;
          }

          if (!row.khoi || !row.khoi.toString().trim()) {
            errors.push(`Dòng ${rowNum}: Khối không được để trống`);
            return;
          }

          if (row.email && row.email.toString().trim()) {
            if (!/\S+@\S+\.\S+/.test(row.email.toString())) {
              errors.push(`Dòng ${rowNum}: Email không hợp lệ`);
              return;
            }
          }

          validData.push(row);
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          toast.error(`File có ${errors.length} lỗi. Vui lòng kiểm tra!`);
          return;
        }

        setImportedData(validData);
        setImportErrors([]);
        setShowImportModal(true);
      } catch (error) {
        logger.error('Error parsing file:', error);
        toast.error('Lỗi khi đọc file! Vui lòng kiểm tra định dạng file.');
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      toast.warning('Không có dữ liệu để import!');
      return;
    }

    try {
      setImportLoading(true);

      const importPayload = {
        students: importedData,
        academic_year: selectedAcademicYear || undefined,
        class_id: selectedClassForManagement
          ? parseInt(selectedClassForManagement)
          : undefined,
      };

      const response = await api.bulkImportStudents(importPayload);

      if (response.success) {
        toast.success(response.message, {
          description: `Thành công: ${response.data.success_count} học sinh${
            response.data.error_count > 0
              ? ` • Lỗi: ${response.data.error_count} học sinh`
              : ''
          }`,
        });

        if (response.data.errors && response.data.errors.length > 0) {
          logger.debug('Import errors:', response.data.errors);
        }

        if (selectedClassForManagement) {
          loadClassStudents();
        }
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        toast.error('Lỗi khi import học sinh: ' + response.message);
      }
    } catch (error) {
      logger.error('Error importing students:', error);
      toast.error('Lỗi khi import học sinh!');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportedData([]);
    setImportErrors([]);
  };

  // === Effects ===
  useEffect(() => {
    (async () => {
      try {
        const [yearsRes, defaultYearRes] = await Promise.all([
          api.request('/admin/classes/academic-years'),
          api.request('/admin/classes/default-academic-year'),
        ]);
        if (yearsRes.success) {
          const years = yearsRes.data || [];
          setAcademicYears(years);
          let toSelect = '';
          if (defaultYearRes.success && years.includes(defaultYearRes.data)) {
            toSelect = defaultYearRes.data;
          } else if (years.length > 0) {
            toSelect = years[years.length - 1];
          }
          setSelectedAcademicYear(toSelect);
        }
      } catch (e) {
        logger.error('Error loading academic years:', e);
      }
    })();
  }, []);

  useEffect(() => {
    loadClassManagementData();
    setSelectedClassForManagement('');
    setHomeroomTeacher(null);
    setClassStudents([]);
  }, [selectedAcademicYear, selectedGrade, loadClassManagementData]);

  useEffect(() => {
    if (selectedClassForManagement) {
      loadClassStudents();
      const cls = classes.find(
        (c) => c.id === parseInt(selectedClassForManagement),
      );
      if (cls) {
        setStudentFormData((prev) => ({
          ...prev,
          class_name: cls.class_name || '',
          grade: String(cls.grade || ''),
          class_id: cls.id,
        }));
      }
    }
  }, [selectedClassForManagement, loadClassStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === Computed Values ===
  const filteredStudents = classStudents.filter((student) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.student_id?.toLowerCase().includes(searchLower) ||
      student.class_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / classManagementPageSize);
  const startIndex = (currentPage - 1) * classManagementPageSize;
  const endIndex = startIndex + classManagementPageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  return {
    // Class Management
    selectedClassForManagement,
    setSelectedClassForManagement,
    showInactiveStudents,
    setShowInactiveStudents,
    classStudents,
    homeroomTeacher,
    loadingClassData,
    restoreLoading,
    searchTerm,
    setSearchTerm,
    confirmState,
    
    // Edit Modal
    showEditModal,
    setShowEditModal,
    selectedStudentForEdit,
    editForm,
    editLoading,
    
    // Add Modal
    showAddStudentModal,
    setShowAddStudentModal,
    studentFormData,
    studentFormErrors,
    studentFormLoading,
    
    // Pagination
    currentPage,
    setCurrentPage,
    classManagementPageSize,
    setClassManagementPageSize,
    
    // Import Modal
    showImportModal,
    setShowImportModal,
    importedData,
    importErrors,
    importLoading,
    
    // Reference Data
    classes,
    error,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedGrade,
    setSelectedGrade,
    
    // Move Class Modal
    showMoveModal,
    setShowMoveModal,
    selectedStudentIds,
    setSelectedStudentIds,
    moveYear,
    setMoveYear,
    moveClasses,
    setMoveClasses,
    moveTargetClassId,
    setMoveTargetClassId,
    moveLoading,
    setMoveLoading,
    
    // Handlers
    openConfirm,
    closeConfirm,
    loadClassManagementData,
    loadClassStudents,
    generateStudentId,
    handleStudentFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    addParentContactRowEdit,
    removeParentContactRowEdit,
    updateParentContactFieldEdit,
    validateStudentForm,
    handleSubmitStudentForm,
    handleCloseAddStudentModal,
    downloadStudentTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleCloseImportModal,
    handleDeleteStudent,
    handlePermanentDeleteStudent,
    handleEditStudent,
    handleEditFormChange,
    submitEditForm,
    closeEditModal,
    handleRestore,
    
    // Computed
    filteredStudents,
    totalStudents,
    totalPages,
    paginatedStudents,
  };
};
