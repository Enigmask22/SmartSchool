import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

// Tab Configuration
export const TAB_CONFIG = {
  users: {
    title: 'Quản lý người dùng',
    fields: ['email', 'username', 'full_name', 'password', 'role'],
    displayFields: ['id', 'email', 'username', 'full_name', 'role', 'is_active'],
    endpoint: '/admin/users',
  },
  teachers: {
    title: 'Quản lý giáo viên',
    fields: ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender'],
    displayFields: ['id', 'teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'subjects', 'is_active'],
    endpoint: '/admin/teachers',
  },
  subjects: {
    title: 'Quản lý môn học',
    fields: ['subject_code', 'subject_name', 'description', 'is_mandatory'],
    displayFields: ['id', 'subject_code', 'subject_name', 'description', 'is_mandatory', 'score_column_config', 'is_active'],
    endpoint: '/admin/subjects',
  },
  classes: {
    title: 'Quản lý lớp học',
    fields: ['class_name', 'grade', 'homeroom_teacher_id', 'room_number', 'academic_year'],
    displayFields: ['id', 'class_name', 'grade', 'homeroom_teacher', 'room_number', 'academic_year', 'total_students'],
    endpoint: '/admin/classes',
  },
  subject_teachers: {
    title: 'Quản lý giáo viên - môn học',
    fields: ['teacher_id', 'subject_id'],
    displayFields: ['id', 'teacher_name', 'subject_name', 'is_active'],
    endpoint: '/admin/subject-teachers',
  },
  class_subjects: {
    title: 'Quản lý lớp - môn học',
    fields: ['class_id', 'subject_id', 'teacher_id', 'academic_year', 'semester'],
    displayFields: ['id', 'class_name', 'subject_name', 'teacher_name', 'academic_year', 'semester', 'is_active'],
    endpoint: '/admin/class-subjects',
  },
  score_settings: {
    title: 'Cấu hình cột điểm',
    fields: ['subject_id', 'score_column_config'],
    displayFields: ['id', 'subject_name', 'score_column_config', 'is_active'],
    endpoint: '/score-settings',
  },
};

export const TABS = [
  { id: 'users', label: 'Người dùng', icon: 'User' },
  { id: 'teachers', label: 'Giáo viên', icon: 'GraduationCap' },
  { id: 'subjects', label: 'Môn học', icon: 'BookOpen' },
  { id: 'classes', label: 'Lớp học', icon: 'School' },
  { id: 'class_subjects', label: 'Phân công giảng dạy', icon: 'Building' },
  { id: 'cameras', label: 'Quản lý Camera', icon: 'Camera' },
  { id: 'system_settings', label: 'Cấu hình thời gian', icon: 'Settings' },
];

export function useAdminManagement() {
  // Tab Management
  const [activeTab, setActiveTab] = useState('users');

  // Main Data Management
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Confirm Dialog
  const [confirmState, setConfirmState] = useState<Record<string, any>>({ open: false });

  const openConfirm = useCallback(
    (config) =>
      setConfirmState({
        open: true,
        variant: 'destructive',
        confirmText: 'Xác nhận',
        ...config,
      }),
    []
  );

  const closeConfirm = useCallback(
    () => setConfirmState((prev) => ({ ...prev, open: false })),
    []
  );

  // Reference Data
  const [teachers, setTeachers] = useState<any[]>([]);
  const [homeroomTeachers, setHomeroomTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [subjectTeachersData, setSubjectTeachersData] = useState<any[]>([]);

  // Teacher Subjects (for teachers tab)
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, any>>({});

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<any[]>([]);
  const [userSubjects, setUserSubjects] = useState<Record<string, any>>({});
  const [importLoading, setImportLoading] = useState(false);

  // Score Column Config
  const [scoreColumns, setScoreColumns] = useState<any[]>([]);
  const [editingColumnKey, setEditingColumnKey] = useState<any>(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnFormData, setColumnFormData] = useState<Record<string, any>>({
    key: '',
    label: '',
    he_so: 1,
    hasSubColumns: false,
    subColumns: [],
  });

  // Class Subjects Filters
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);

  const currentConfig = TAB_CONFIG[activeTab];

  // Utility Functions
  const generatePassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  const handleGeneratePassword = useCallback(() => {
    const newPassword = generatePassword();
    setFormData((prev) => ({ ...prev, password: newPassword }));
  }, [generatePassword]);

  // Data Loading
  const loadData = useCallback(async () => {
    if (!currentConfig?.endpoint) return;

    setLoading(true);
    setError(null);
    try {
      let endpoint = currentConfig.endpoint;
      const tabsWithServerFiltering = ['subjects', 'subject_teachers', 'class_subjects'];

      if (tabsWithServerFiltering.includes(activeTab) && showDeleted) {
        endpoint = `${endpoint}?show_deleted=true`;
      }

      const response = await api.request(endpoint);
      if (response.success) {
        let items = response.data || [];

        if (activeTab === 'subjects') {
          items = items.map((s) => ({
            ...s,
            score_column_config: s.score_column_config || null,
          }));
        }

        if (activeTab === 'score_settings') {
          items = items.map((item) => ({
            ...item,
            subject_name: item.subjects?.subject_name || '-',
            subject_code: item.subjects?.subject_code || '-',
          }));
        }

        if (tabsWithServerFiltering.includes(activeTab)) {
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        } else {
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        }

        setData(items);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint, activeTab, showDeleted]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [teachersRes, homeroomTeachersRes, subjectsRes, classesRes, usersRes, subjectTeachersRes] = await Promise.all([
        api.request('/admin/teachers'),
        api.request('/admin/teachers/homeroom'),
        api.request('/admin/subjects'),
        api.request('/admin/classes'),
        api.request('/admin/users'),
        api.request('/admin/subject-teachers'),
      ]);

      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (homeroomTeachersRes.success) setHomeroomTeachers(homeroomTeachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
      if (classesRes.success) setClasses(classesRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (subjectTeachersRes.success) {
        setSubjectTeachersData(subjectTeachersRes.data || []);

        const teacherSubjectsMap = {};
        (subjectTeachersRes.data || []).forEach((st) => {
          if (st.is_active !== false) {
            if (!teacherSubjectsMap[st.teacher_id]) {
              teacherSubjectsMap[st.teacher_id] = [];
            }
            teacherSubjectsMap[st.teacher_id].push(st.subject_id);
          }
        });
        setTeacherSubjects(teacherSubjectsMap);
      }
    } catch (err) {
      logger.error('Error loading reference data:', err);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    const loadAllData = async () => {
      await loadData();
      if (activeTab === 'teachers' || activeTab === 'class_subjects' || activeTab === 'subject_teachers') {
        await loadReferenceData();
      }
    };
    loadAllData();
  }, [activeTab, loadData, loadReferenceData]);

  // Auto-filter teachers for class_subjects
  useEffect(() => {
    if (activeTab === 'class_subjects' && (formData as any).subject_id && subjectTeachersData.length > 0 && teachers.length > 0) {
      const teachersForSubject = subjectTeachersData
        .filter((st) => st.subject_id === (formData as any).subject_id && st.is_active !== false)
        .map((st) => st.teacher_id);

      const filtered = teachers.filter((t) => teachersForSubject.includes(t.id));
      setFilteredTeachers(filtered);
    }
  }, [activeTab, (formData as any).subject_id, subjectTeachersData, teachers]);

  // Load teacher subjects for teachers tab
  useEffect(() => {
    if (activeTab === 'teachers' && editingItem) {
      const teacherSubjectIds = teacherSubjects[editingItem] || [];
      setSelectedSubjects(teacherSubjectIds);
    } else if (activeTab === 'teachers' && showAddForm) {
      setSelectedSubjects([]);
    }
  }, [activeTab, editingItem, showAddForm, teacherSubjects]);

  // Load academic years for class_subjects
  useEffect(() => {
    if (activeTab === 'class_subjects') {
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
    } else {
      setSelectedAcademicYear('');
      setSelectedGrade('');
      setSelectedClassId('');
      setFilteredClasses([]);
    }
  }, [activeTab]);

  // Filter classes when academic year or grade changes
  useEffect(() => {
    if (activeTab === 'class_subjects') {
      let filtered = [...classes];

      if (selectedAcademicYear) {
        filtered = filtered.filter((cls) => cls.academic_year === selectedAcademicYear);
      }

      if (selectedGrade) {
        filtered = filtered.filter((cls) => cls.grade.toString() === selectedGrade);
      }

      setFilteredClasses(filtered);
    }
  }, [activeTab, classes, selectedAcademicYear, selectedGrade]);

  // Score Settings
  const fetchSubjectScoreSettings = useCallback(async (subjectId) => {
    try {
      const res = await api.getScoreConfigBySubject(subjectId);
      if (res && res.success && res.data && res.data.score_column_config) {
        const sc = res.data.score_column_config as Record<string, any>;
        const columnsArray = Object.entries(sc).map(([key, value]) => ({
          key,
          label: value.label as string,
          he_so: value.he_so as number,
          data: (value.data as any) || null,
        }));
        setScoreColumns(columnsArray);
        setFormData((prev) => ({ ...prev, score_column_config: sc }));
      }
    } catch (e) {
      // Silent fallback
    }
  }, []);

  // CRUD Operations
  const handleInitializeClassSubjects = useCallback(() => {
    if (!selectedClassId || !selectedAcademicYear) {
      alert('Vui lòng chọn lớp và năm học!');
      return;
    }

    openConfirm({
      title: 'Khởi tạo môn học cho lớp',
      description: `Bạn có chắc chắn muốn khởi tạo tất cả môn học cho lớp này?\n\nHệ thống sẽ tạo phân công giảng dạy cho tất cả ${subjects.length} môn học hiện có.`,
      confirmText: 'Khởi tạo',
      variant: 'default',
      onConfirm: async () => {
        closeConfirm();
        await doInitializeClassSubjects();
      },
    });
  }, [selectedClassId, selectedAcademicYear, subjects.length, openConfirm, closeConfirm]);

  const doInitializeClassSubjects = useCallback(async () => {
    try {
      setLoading(true);

      const currentSemester = 'HK1';

      const classSubjectsToCreate = subjects
        .filter((subject) => subject.is_active !== false)
        .map((subject) => ({
          class_id: parseInt(selectedClassId),
          subject_id: subject.id,
          teacher_id: null,
          academic_year: selectedAcademicYear,
          semester: currentSemester,
        }));

      if (classSubjectsToCreate.length === 0) {
        alert('Không có môn học nào để khởi tạo!');
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const classSubject of classSubjectsToCreate) {
        try {
          const response = await api.request('/admin/class-subjects', {
            method: 'POST',
            body: JSON.stringify(classSubject),
          });

          if (response.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${classSubject.subject_id}: ${response.message}`);
          }
        } catch (err) {
          errorCount++;
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`${classSubject.subject_id}: ${errMsg}`);
        }
      }

      let message = `✅ Khởi tạo thành công ${successCount}/${classSubjectsToCreate.length} môn học!`;

      if (errorCount > 0) {
        message += `\n\n⚠️ Có ${errorCount} môn học bị lỗi hoặc đã tồn tại.`;
        if (errors.length > 0 && errors.length <= 5) {
          message += `\n\nChi tiết lỗi:\n${errors.join('\n')}`;
        }
      }

      alert(message);
      await loadData();
    } catch (error) {
      logger.error('Error initializing class subjects:', error);
      const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
      alert('❌ Lỗi khi khởi tạo môn học: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedAcademicYear, subjects, loadData]);

  const handleCreate = useCallback(
    async (data) => {
      if (!currentConfig?.endpoint) return;

      try {
        if (activeTab === 'teachers') {
          const allowedFields = [
            'teacher_code',
            'full_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'user_id',
            'subject_specialization',
          ];
          const cleanData = {};

          allowedFields.forEach((field) => {
            if (field in data && data[field] !== undefined && data[field] !== null && data[field] !== '') {
              cleanData[field] = data[field];
            }
          });

          logger.debug('Clean data to send:', cleanData);

          if (!(cleanData as any).full_name) {
            setError('Vui lòng nhập họ tên giáo viên');
            return;
          }

          const teacherResponse = await api.request(currentConfig.endpoint, {
            method: 'POST',
            body: JSON.stringify(cleanData),
          });

          if (!teacherResponse.success) {
            setError(teacherResponse.message || 'Không thể tạo giáo viên');
            return;
          }

          const newTeacher = teacherResponse.data;
          const newTeacherId = newTeacher.id;

          if (selectedSubjects.length > 0) {
            const subjectTeacherPromises = selectedSubjects.map((subjectId) =>
              api.request('/admin/subject-teachers', {
                method: 'POST',
                body: JSON.stringify({
                  teacher_id: newTeacherId,
                  subject_id: subjectId,
                  is_active: true,
                }),
              })
            );

            await Promise.all(subjectTeacherPromises);
          }

          setShowAddForm(false);
          setFormData({});
          setSelectedSubjects([]);
          loadData();
          loadReferenceData();
          alert(
            `Tạo giáo viên thành công${
              selectedSubjects.length > 0 ? ` và phân công ${selectedSubjects.length} môn học!` : '!'
            }`
          );
        } else {
          const payload =
            activeTab === 'subjects'
              ? {
                  subject_code: data.subject_code,
                  subject_name: data.subject_name,
                  description: data.description ?? null,
                  is_mandatory: data.is_mandatory ?? false,
                  is_active: true,
                }
              : data;
          const response = await api.request(currentConfig.endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          if (response.success) {
            if (activeTab === 'subjects' && data.score_column_config) {
              try {
                const subjectId = response.data?.id;
                if (subjectId) {
                  let existing: any = null;
                  try {
                    const getRes = await api.getScoreConfigBySubject(subjectId);
                    if (getRes.success) existing = getRes.data;
                  } catch (e) {
                    existing = null;
                  }

                  if (existing && existing.id) {
                    await api.updateGradeSettings(existing.id, {
                      score_column_config: data.score_column_config,
                      is_active: true,
                    });
                  } else {
                    await api.createGradeSettings({
                      subject_id: subjectId,
                      score_column_config: data.score_column_config,
                      is_active: true,
                    });
                  }
                }
              } catch (e) {
                console.error('Sync grade settings failed:', e);
              }
            }
            setShowAddForm(false);
            setFormData({});
            loadData();
            alert('Tạo thành công!');
          } else {
            const errorMsg = response.message || 'Không thể tạo bản ghi';
            setError(errorMsg);
            alert('❌ ' + errorMsg);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errorMsg = 'Lỗi khi tạo: ' + errMsg;
        setError(errorMsg);
        alert('❌ ' + errorMsg);
      }
    },
    [activeTab, currentConfig?.endpoint, selectedSubjects, loadData, loadReferenceData]
  );

  const handleUpdate = useCallback(
    async (id, data) => {
      if (!currentConfig?.endpoint) return;

      try {
        logger.debug('Updating with id:', id, 'data:', data);

        if (activeTab === 'teachers') {
          const allowedFields = ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'user_id', 'is_active'];
          const cleanData = {};

          allowedFields.forEach((field) => {
            if (field in data) {
              cleanData[field] = data[field];
            }
          });

          const teacherResponse = await api.request(`${currentConfig.endpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(cleanData),
          });

          if (!teacherResponse.success) {
            setError(teacherResponse.message || 'Không thể cập nhật giáo viên');
            return;
          }

          const currentSubjectIds = teacherSubjects[id] || [];

          const subjectsToAdd = selectedSubjects.filter((sid) => !currentSubjectIds.includes(sid));
          const subjectsToRemove = currentSubjectIds.filter((sid) => !selectedSubjects.includes(sid));

          if (subjectsToAdd.length > 0) {
            const addPromises = subjectsToAdd.map((subjectId) =>
              api.request('/admin/subject-teachers', {
                method: 'POST',
                body: JSON.stringify({
                  teacher_id: id,
                  subject_id: subjectId,
                  is_active: true,
                }),
              })
            );
            await Promise.all(addPromises);
          }

          if (subjectsToRemove.length > 0) {
            const subjectTeachersToDelete = subjectTeachersData.filter(
              (st) => st.teacher_id === id && subjectsToRemove.includes(st.subject_id) && st.is_active !== false
            );

            const deletePromises = subjectTeachersToDelete.map((st) =>
              api.request(`/admin/subject-teachers/${st.id}`, {
                method: 'DELETE',
              })
            );
            await Promise.all(deletePromises);
          }

          setEditingItem(null);
          setFormData({});
          setSelectedSubjects([]);
          loadData();
          loadReferenceData();
          alert(`Cập nhật giáo viên thành công!`);
        } else {
          const updatePayload =
            activeTab === 'subjects'
              ? {
                  subject_code: data.subject_code,
                  subject_name: data.subject_name,
                  description: data.description ?? null,
                  is_mandatory: data.is_mandatory ?? false,
                  is_active: data.is_active ?? true,
                }
              : data;
          const response = await api.request(`${currentConfig.endpoint}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatePayload),
          });

          if (response.success) {
            if (activeTab === 'subjects' && data.score_column_config) {
              try {
                let existing: any = null;
                try {
                  const getRes = await api.getScoreConfigBySubject(id);
                  if (getRes.success) existing = getRes.data;
                } catch (e) {
                  existing = null;
                }
                if (existing && existing.id) {
                  await api.updateScoreSettings(id, {
                    score_column_config: data.score_column_config,
                    is_active: true,
                  });
                } else {
                  await api.createScoreSettings({
                    subject_id: id,
                    score_column_config: data.score_column_config,
                    is_active: true,
                  });
                }
              } catch (e) {
                console.error('Sync grade settings failed:', e);
              }
            }
            setEditingItem(null);
            setFormData({});
            loadData();
            alert('Cập nhật thành công!');
          } else {
            const errorMsg = response.message || 'Không thể cập nhật';
            setError(errorMsg);
            alert('❌ ' + errorMsg);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errorMsg = 'Lỗi khi cập nhật: ' + errMsg;
        setError(errorMsg);
        alert('❌ ' + errorMsg);
      }
    },
    [activeTab, currentConfig?.endpoint, selectedSubjects, teacherSubjects, subjectTeachersData, loadData, loadReferenceData]
  );

  const handleDelete = useCallback(
    (id) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: 'Xóa tạm thời bản ghi',
        description: 'Bạn có chắc muốn xóa tạm thời bản ghi này?\nBạn có thể khôi phục lại trong tab "Đã xóa tạm thời".',
        confirmText: 'Xóa tạm thời',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}`, {
              method: 'DELETE',
            });
            if (response.success) {
              loadData();
              alert('Xóa tạm thời thành công! Bạn có thể khôi phục trong tab "Đã xóa tạm thời".');
            } else {
              setError(response.message || 'Không thể xóa');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setError('Lỗi khi xóa: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, openConfirm, closeConfirm, loadData]
  );

  const handleRestore = useCallback(
    (id) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: 'Khôi phục bản ghi',
        description: 'Bạn có chắc muốn khôi phục bản ghi này?',
        confirmText: 'Khôi phục',
        variant: 'default',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}/restore`, {
              method: 'POST',
            });
            if (response.success) {
              loadData();
              alert('Khôi phục thành công!');
            } else {
              setError(response.message || 'Không thể khôi phục');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setError('Lỗi khi khôi phục: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, openConfirm, closeConfirm, loadData]
  );

  const handlePermanentDelete = useCallback(
    (id) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: '⚠️ Xóa vĩnh viễn bản ghi',
        description: 'Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN bản ghi này?\n\nHành động này KHÔNG THỂ HOÀN TÁC!',
        confirmText: 'Xóa vĩnh viễn',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}/permanent`, {
              method: 'DELETE',
            });
            if (response.success) {
              loadData();
              alert('Xóa vĩnh viễn thành công!');
            } else {
              setError(response.message || 'Không thể xóa vĩnh viễn');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setError('Lỗi khi xóa vĩnh viễn: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, openConfirm, closeConfirm, loadData]
  );

  const handleChange = useCallback(
    (field, value) => {
      setFormData((prev) => {
        const updated = { ...prev, [field]: value };
        return updated;
      });

      if (field === 'subject_id' && activeTab === 'class_subjects') {
        setFormData((prev) => ({ ...prev, [field]: value, teacher_id: null }));

        if (value) {
          logger.debug('=== DEBUG: Filter Teachers for Subject ===');
          logger.debug('Selected subject_id:', value);
          logger.debug('subjectTeachersData:', subjectTeachersData);

          const teachersForSubject = subjectTeachersData
            .filter((st) => st.subject_id === parseInt(value) && st.is_active !== false)
            .map((st) => st.teacher_id);

          logger.debug('teachersForSubject (IDs):', teachersForSubject);
          logger.debug('All teachers:', teachers);

          const filtered = teachers.filter((t) => teachersForSubject.includes(t.id));

          logger.debug('Filtered teachers:', filtered);
          setFilteredTeachers(filtered);
        } else {
          setFilteredTeachers([]);
        }
      }
    },
    [activeTab, subjectTeachersData, teachers]
  );

  // Import Functions
  const loadAvailableUsers = useCallback(async () => {
    try {
      const response = await api.request('/admin/users/teachers');
      if (response.success) {
        setAvailableUsers(response.data || []);
      } else {
        setError(response.message || 'Không thể tải danh sách users');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError('Lỗi khi tải danh sách users: ' + errMsg);
    }
  }, []);

  const handleImportTeachers = useCallback(async () => {
    if (selectedUserIds.length === 0) {
      alert('Vui lòng chọn ít nhất một user để tạo giáo viên');
      return;
    }

    setImportLoading(true);
    try {
      const response = await api.request('/admin/teachers/import-from-users', {
        method: 'POST',
        body: JSON.stringify(selectedUserIds),
      });

      if (response.success) {
        const createdTeachers = response.data;

        const subjectTeacherPromises: Promise<any>[] = [];

        createdTeachers.forEach((teacher) => {
          const subjectIds = userSubjects[teacher.user_id] || [];

          subjectIds.forEach((subjectId) => {
            subjectTeacherPromises.push(
              api.request('/admin/subject-teachers', {
                method: 'POST',
                body: JSON.stringify({
                  teacher_id: teacher.id,
                  subject_id: subjectId,
                  is_active: true,
                }),
              })
            );
          });
        });

        if (subjectTeacherPromises.length > 0) {
          await Promise.all(subjectTeacherPromises);
        }

        setShowImportModal(false);
        setSelectedUserIds([]);
        setUserSubjects({});
        loadData();
        loadReferenceData();

        const totalSubjects = Object.values(userSubjects as Record<string, any[]>).reduce((sum, subjects) => sum + (subjects as any[]).length, 0);
        alert(
          `Tạo thành công ${createdTeachers.length} giáo viên${
            totalSubjects > 0 ? ` và phân công ${totalSubjects} môn học!` : '!'
          }`
        );
      } else {
        setError(response.message || 'Không thể tạo giáo viên');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError('Lỗi khi tạo giáo viên: ' + errMsg);
    } finally {
      setImportLoading(false);
    }
  }, [selectedUserIds, userSubjects, loadData, loadReferenceData]);

  const handleUserSelect = useCallback((userId) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }, []);

  const handleSelectAllUsers = useCallback(() => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map((user) => user.id));
    }
  }, [selectedUserIds, availableUsers]);

  const handleUserSubjectToggle = useCallback((userId, subjectId) => {
    setUserSubjects((prev) => {
      const currentSubjects = prev[userId] || [];
      const newSubjects = currentSubjects.includes(subjectId)
        ? currentSubjects.filter((id) => id !== subjectId)
        : [...currentSubjects, subjectId];

      return {
        ...prev,
        [userId]: newSubjects,
      };
    });
  }, []);

  const filteredData = useCallback(
    (items = data) => {
      return items.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some((value) => String(value).toLowerCase().includes(searchLower));

        if (activeTab === 'class_subjects') {
          let matchesFilters = true;

          if (selectedAcademicYear && item.academic_year !== selectedAcademicYear) {
            matchesFilters = false;
          }

          if (selectedGrade) {
            const classData = classes.find((c) => c.id === item.class_id);
            if (!classData || classData.grade.toString() !== selectedGrade) {
              matchesFilters = false;
            }
          }

          if (selectedClassId && item.class_id.toString() !== selectedClassId) {
            matchesFilters = false;
          }

          return matchesSearch && matchesFilters;
        }

        return matchesSearch;
      });
    },
    [data, searchTerm, activeTab, selectedAcademicYear, selectedGrade, selectedClassId, classes]
  );

  return {
    // Tab Management
    activeTab,
    setActiveTab,
    // Main Data
    data,
    setData,
    loading,
    error,
    editingItem,
    setEditingItem,
    showAddForm,
    setShowAddForm,
    searchTerm,
    setSearchTerm,
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    showDeleted,
    setShowDeleted,
    // Confirm Dialog
    confirmState,
    openConfirm,
    closeConfirm,
    // Reference Data
    teachers,
    homeroomTeachers,
    subjects,
    classes,
    users,
    filteredTeachers,
    setFilteredTeachers,
    subjectTeachersData,
    // Teacher Subjects
    selectedSubjects,
    setSelectedSubjects,
    teacherSubjects,
    // Import Modal
    showImportModal,
    setShowImportModal,
    availableUsers,
    selectedUserIds,
    setSelectedUserIds,
    userSubjects,
    setUserSubjects,
    importLoading,
    // Score Column Config
    scoreColumns,
    setScoreColumns,
    editingColumnKey,
    setEditingColumnKey,
    showColumnForm,
    setShowColumnForm,
    columnFormData,
    setColumnFormData,
    // Class Subjects Filters
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedGrade,
    setSelectedGrade,
    selectedClassId,
    setSelectedClassId,
    filteredClasses,
    // Config
    currentConfig,
    // Utility Functions
    generatePassword,
    handleGeneratePassword,
    // Data Loading
    loadData,
    loadReferenceData,
    fetchSubjectScoreSettings,
    // CRUD Operations
    handleInitializeClassSubjects,
    doInitializeClassSubjects,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    handleChange,
    // Import Functions
    loadAvailableUsers,
    handleImportTeachers,
    handleUserSelect,
    handleSelectAllUsers,
    handleUserSubjectToggle,
    // Filtered Data
    filteredData,
  };
}
