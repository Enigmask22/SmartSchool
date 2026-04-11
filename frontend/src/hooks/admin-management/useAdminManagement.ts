import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';
import { TAB_CONFIG } from './useTabCrud';

// Helper function to group class_subjects by (subject, teacher, year, semester)
const groupClassSubjects = (items: any[]): any[] => {
  const groupedMap = new Map<string, any>();
  
  items.forEach((item) => {
    // Create a composite key for grouping
    const key = `${item.subject_id}_${item.teacher_id}_${item.academic_year}_${item.semester}`;
    
    if (!groupedMap.has(key)) {
      // Create new grouped record
      groupedMap.set(key, {
        id: item.id, // Will be replaced with array
        recordIds: [item.id], // Array of individual record IDs for operations
        class_ids: [item.class_id],
        class_names: [item.class_name],
        subject_id: item.subject_id,
        subject_name: item.subject_name,
        subject_code: item.subject_code,
        teacher_id: item.teacher_id,
        teacher_name: item.teacher_name,
        teacher_code: item.teacher_code,
        academic_year: item.academic_year,
        semester: item.semester,
        is_active: item.is_active,
        grade: item.grade,
      });
    } else {
      // Add to existing grouped record
      const grouped = groupedMap.get(key);
      if (!grouped.class_ids.includes(item.class_id)) {
        grouped.class_ids.push(item.class_id);
        grouped.class_names.push(item.class_name);
        grouped.recordIds.push(item.id);
      }
    }
  });
  
  return Array.from(groupedMap.values());
};

export function useAdminManagement() {
  // Tab Management - restore from localStorage on mount
  const [activeTab, setActiveTabState] = useState(() => {
    const saved = localStorage.getItem('adminManagement_activeTab');
    return saved || 'users';
  });

  // Wrapper to persist tab selection
  const setActiveTab = (tab: string) => {
    localStorage.setItem('adminManagement_activeTab', tab);
    setActiveTabState(tab);
  };

  // Main Data Management
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Reference Data
  const [teachers, setTeachers] = useState<any[]>([]);
  const [homeroomTeachers, setHomeroomTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [subjectTeachersData, setSubjectTeachersData] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  // Kept internal for CRUD operations (handleCreate, handleUpdate)
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, any>>({});

  // NOTE: Import Modal state moved to useAdminImport hook
  // NOTE: Score Column Config state moved to useScoreColumnManagement hook

  // Keep internal state for filter operations and class subject initialization
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const currentConfig = TAB_CONFIG[activeTab];

  // Data Loading
  const loadData = useCallback(async () => {
    if (!currentConfig?.endpoint) return;

    setLoading(true);
    setError(null);
    try {
      let endpoint = currentConfig.endpoint;
      const response = await api.request(endpoint);
      if (response.success) {
        let items = response.data || [];

        if (activeTab === 'subjects') {
          items = items
            .filter((item) => item !== null && item !== undefined) // Remove null/undefined items
            .map((s) => ({
              id: s.id || null,
              subject_code: s.subject_code || '-',
              subject_name: s.subject_name || '-',
              description: s.description || '-',
              is_mandatory: s.is_mandatory ?? false,
              score_column_config: s.score_column_config || null,
              is_active: s.is_active ?? true,
              ...s,
            }));
        }

        if (activeTab === 'score_settings') {
          items = items.map((item) => ({
            ...item,
            subject_name: item.subjects?.subject_name || item.subject_name || '-',
            subject_code: item.subjects?.subject_code || item.subject_code || '-',
          }));
        }

        // Group class_subjects by (subject, teacher, year, semester)
        if (activeTab === 'class_subjects') {
          items = groupClassSubjects(items);
        }

        // Note: Don't filter out inactive items here - let the UI layer handle visibility based on showDeleted flag
        setData(items);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint, activeTab]);

  const loadReferenceData = useCallback(async () => {
    try {
      // Load only data needed for the active tab to optimize API calls
      if (activeTab === 'teachers') {
        // Teachers tab needs: teachers, subjects, subject_teachers
        const [teachersRes, subjectsRes, subjectTeachersRes] = await Promise.all([
          api.request('/admin/teachers'),
          api.request('/admin/subjects'),
          api.request('/admin/subject-teachers'),
        ]);

        if (teachersRes.success) {
          const activeTeachers = (teachersRes.data || []).filter((t: any) => t.is_active !== false);
          setTeachers(activeTeachers);
        }

        if (subjectsRes.success) {
          const subjectsData = (subjectsRes.data || [])
            .filter((s) => s !== null && s !== undefined && s.is_active !== false)
            .map((s) => ({
              id: s.id || null,
              subject_code: s.subject_code || '-',
              subject_name: s.subject_name || '-',
              description: s.description || '-',
              is_mandatory: s.is_mandatory ?? false,
              is_active: s.is_active ?? true,
              ...s,
            }));
          setSubjects(subjectsData);
        }

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
      } else if (activeTab === 'class_subjects') {
        // Class subjects tab needs: teachers, subjects, classes, subject_teachers
        const [teachersRes, subjectsRes, classesRes, subjectTeachersRes] = await Promise.all([
          api.request('/admin/teachers'),
          api.request('/admin/subjects'),
          api.request('/admin/classes'),
          api.request('/admin/subject-teachers'),
        ]);

        // Filter to only active items
        if (teachersRes.success) {
          const activeTeachers = (teachersRes.data || []).filter((t: any) => t.is_active !== false);
          setTeachers(activeTeachers);
        }
        if (subjectsRes.success) {
          const activeSubjects = (subjectsRes.data || [])
            .filter((s) => s !== null && s !== undefined && s.is_active !== false);
          setSubjects(activeSubjects);
        }
        if (classesRes.success) {
          const activeClasses = (classesRes.data || []).filter((c: any) => c.is_active !== false);
          setClasses(activeClasses);
        }
        if (subjectTeachersRes.success) setSubjectTeachersData(subjectTeachersRes.data || []);
      } else if (activeTab === 'subjects') {
        // Subjects tab needs: subjects, teachers
        const [subjectsRes, teachersRes] = await Promise.all([
          api.request('/admin/subjects'),
          api.request('/admin/teachers'),
        ]);

        if (subjectsRes.success) {
          const subjectsData = (subjectsRes.data || [])
            .filter((s) => s !== null && s !== undefined && s.is_active !== false)
            .map((s) => ({
              id: s.id || null,
              subject_code: s.subject_code || '-',
              subject_name: s.subject_name || '-',
              description: s.description || '-',
              is_mandatory: s.is_mandatory ?? false,
              is_active: s.is_active ?? true,
              ...s,
            }));
          setSubjects(subjectsData);
        }
        if (teachersRes.success) {
          const activeTeachers = (teachersRes.data || []).filter((t: any) => t.is_active !== false);
          setTeachers(activeTeachers);
        }

        if (teachersRes.success) setTeachers(teachersRes.data || []);
      } else if (activeTab === 'classes') {
        // Classes tab needs: classes, teachers, homeroom_teachers
        const [classesRes, teachersRes, homeroomTeachersRes] = await Promise.all([
          api.request('/admin/classes'),
          api.request('/admin/teachers'),
          api.request('/admin/teachers/homeroom'),
        ]);

        if (classesRes.success) setClasses(classesRes.data || []);
        if (teachersRes.success) setTeachers(teachersRes.data || []);
        if (homeroomTeachersRes.success) setHomeroomTeachers(homeroomTeachersRes.data || []);
      } else if (activeTab === 'users') {
        // Users tab needs: users only
        const usersRes = await api.request('/admin/users');
        if (usersRes.success) setUsers(usersRes.data || []);
      }
    } catch (err) {
      logger.error('Error loading reference data:', err);
    }
  }, [activeTab]);

  // Load data when tab changes
  useEffect(() => {
    const loadAllData = async () => {
      if (activeTab === 'teachers' || activeTab === 'class_subjects' || activeTab === 'subject_teachers' || activeTab === 'classes' || activeTab === 'subjects') {
        // Load main data and reference data in parallel for better performance
        await Promise.all([loadData(), loadReferenceData()]);
      } else {
        await loadData();
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
            // Set academic years for the form dropdown
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
      setAcademicYears([]);
      setSelectedAcademicYear('');
      setSelectedClassId('');
    }
  }, [activeTab]);

  // Filter classes when academic year or grade changes
  // Score Settings
  const fetchSubjectScoreSettings = useCallback(async (subjectId) => {
    try {
      const res = await api.getScoreConfigBySubject(subjectId);
      if (res && res.success && res.data && res.data.score_column_config) {
        const sc = res.data.score_column_config as Record<string, any>;
        // Load score column config into form data (component level hook will display it)
        setFormData((prev) => ({ ...prev, score_column_config: sc }));
      }
    } catch (e) {
      // Silent fallback
    }
  }, []);

  // Confirm Dialog State and Functions
  const [confirmState, setConfirmState] = useState<any>(null);
  
  const openConfirm = useCallback((config: any) => {
    setConfirmState(config);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  // CRUD Operations
  const handleInitializeClassSubjects = useCallback(() => {
    if (!selectedClassId || !selectedAcademicYear) {
      toast.error('Vui lòng chọn lớp và năm học!');
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
        toast.error('Không có môn học nào để khởi tạo!');
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
        toast.warning(message);
      } else {
        toast.success(message);
      }
      await loadData();
    } catch (error) {
      logger.error('Error initializing class subjects:', error);
      const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
      toast.error('Lỗi khi khởi tạo môn học: ' + errorMsg);
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
          // Extract selected subjects from form data
          const submittedSubjects = data._selectedSubjects || [];
          delete (data as any)._selectedSubjects; // Remove from cleanData

          allowedFields.forEach((field) => {
            if (field in data && data[field] !== undefined && data[field] !== null && data[field] !== '') {
              cleanData[field] = data[field];
            }
          });

          logger.debug('Clean data to send:', cleanData);

          if (!(cleanData as any).full_name) {
            toast.error('Vui lòng nhập họ tên giáo viên');
            return;
          }

          const teacherResponse = await api.request(currentConfig.endpoint, {
            method: 'POST',
            body: JSON.stringify(cleanData),
          });

          if (!teacherResponse.success) {
            toast.error(teacherResponse.message || 'Không thể tạo giáo viên');
            return;
          }

          const newTeacher = teacherResponse.data;
          const newTeacherId = newTeacher.id;

          if (submittedSubjects.length > 0) {
            const subjectTeacherPromises = submittedSubjects.map((subjectId) =>
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
          toast.success(
            `Tạo giáo viên thành công${
              selectedSubjects.length > 0 ? ` và phân công ${selectedSubjects.length} môn học!` : '!'
            }`
          );
        } else if (activeTab === 'class_subjects' && data._selectedClasses) {
          // Bulk create for class_subjects
          const selectedClasses = data._selectedClasses || [];

          if (selectedClasses.length === 0) {
            toast.error('Vui lòng chọn ít nhất một lớp học');
            return;
          }

          const bulkCreatePayload = {
            teacher_id: data.teacher_id,
            subject_id: data.subject_id,
            class_ids: selectedClasses,
            academic_year: data.academic_year,
            semester: data.semester,
            is_active: true,
          };

          const bulkResponse = await api.request('/admin/class-subjects/bulk', {
            method: 'POST',
            body: JSON.stringify(bulkCreatePayload),
          });

          if (bulkResponse.success) {
            setShowAddForm(false);
            setFormData({});
            loadData();
            loadReferenceData();
            toast.success(bulkResponse.message || 'Phân công thành công!');
          } else {
            const errorMsg = bulkResponse.message || 'Không thể tạo phân công';
            toast.error(errorMsg);
          }
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
            toast.success('Tạo thành công!');
          } else {
            const errorMsg = response.message || 'Không thể tạo bản ghi';
            toast.error(errorMsg);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errorMsg = 'Lỗi khi tạo: ' + errMsg;
        toast.error(errorMsg);
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
            toast.error(teacherResponse.message || 'Không thể cập nhật giáo viên');
            return;
          }

          // Extract selected subjects from form data
          const submittedSubjects = data._selectedSubjects || [];
          delete (data as any)._selectedSubjects; // Remove from cleanData
          
          const currentSubjectIds = teacherSubjects[id] || [];

          const subjectsToAdd = submittedSubjects.filter((sid) => !currentSubjectIds.includes(sid));
          const subjectsToRemove = currentSubjectIds.filter((sid) => !submittedSubjects.includes(sid));

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
          toast.success('Cập nhật giáo viên thành công!');
        } else if (activeTab === 'class_subjects' && data._selectedClasses) {
          // Bulk update for class_subjects (changing class assignments)
          const recordIds = data._recordIds || [id];  // If not provided, use single id
          const selectedClasses = data._selectedClasses || [];

          const bulkUpdatePayload = {
            record_ids: recordIds,
            teacher_id: data.teacher_id,
            subject_id: data.subject_id,
            academic_year: data.academic_year,
            semester: data.semester,
            selected_class_ids: selectedClasses,
          };

          const bulkResponse = await api.request('/admin/class-subjects/bulk-update', {
            method: 'PUT',
            body: JSON.stringify(bulkUpdatePayload),
          });

          if (bulkResponse.success) {
            setEditingItem(null);
            setFormData({});
            loadData();
            loadReferenceData();
            toast.success(bulkResponse.message || 'Cập nhật phân công thành công!');
          } else {
            toast.error(bulkResponse.message || 'Không thể cập nhật phân công');
          }
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
            toast.success('Cập nhật thành công!');
          } else {
            const errorMsg = response.message || 'Không thể cập nhật';
            toast.error(errorMsg);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errorMsg = 'Lỗi khi cập nhật: ' + errMsg;
        toast.error(errorMsg);
      }
    },
    [activeTab, currentConfig?.endpoint, selectedSubjects, teacherSubjects, subjectTeachersData, loadData, loadReferenceData]
  );

  const filteredData = useCallback(
    (items = data, searchTerm = '', filterOptions?: { academicYear?: string; grade?: string; classId?: string; classes?: any[] }) => {
      return items.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some((value) => String(value).toLowerCase().includes(searchLower));

        if (activeTab === 'class_subjects' && filterOptions) {
          let matchesFilters = true;

          if (filterOptions.academicYear && item.academic_year !== filterOptions.academicYear) {
            matchesFilters = false;
          }

          if (filterOptions.grade && filterOptions.classes) {
            const classData = filterOptions.classes.find((c) => c.id === item.class_id);
            if (!classData || classData.grade.toString() !== filterOptions.grade) {
              matchesFilters = false;
            }
          }

          if (filterOptions.classId && item.class_id.toString() !== filterOptions.classId) {
            matchesFilters = false;
          }

          return matchesSearch && matchesFilters;
        }

        return matchesSearch;
      });
    },
    [data, activeTab]
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
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    teachers,
    homeroomTeachers,
    subjects,
    classes,
    users,
    filteredTeachers,
    setFilteredTeachers,
    subjectTeachersData,
    teacherSubjects,
    academicYears,
    currentConfig,
    // Data Loading
    loadData,
    loadReferenceData,
    fetchSubjectScoreSettings,
    // CRUD Operations
    handleInitializeClassSubjects,
    doInitializeClassSubjects,
    handleCreate,
    handleUpdate,
    // Confirm Dialog
    confirmState,
    openConfirm,
    closeConfirm,
    // Filtered Data
    filteredData,
  };
}