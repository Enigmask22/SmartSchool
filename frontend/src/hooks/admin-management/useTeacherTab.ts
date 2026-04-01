import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';

export function useTeacherTab(editingItem: any, showAddForm: boolean, formData: Record<string, any>) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, any>>({});
  const [subjectTeachersData, setSubjectTeachersData] = useState<any[]>([]);

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    try {
      const [teachersRes, subjectsRes, subjectTeachersRes] = await Promise.all([
        api.request('/admin/teachers'),
        api.request('/admin/subjects'),
        api.request('/admin/subject-teachers'),
      ]);

      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
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

  // Load teacher subjects when editing or adding
  useEffect(() => {
    if (editingItem) {
      const teacherSubjectIds = teacherSubjects[editingItem] || [];
      setSelectedSubjects(teacherSubjectIds);
    } else if (showAddForm) {
      setSelectedSubjects([]);
    }
  }, [editingItem, showAddForm, teacherSubjects]);

  // Create teacher
  const handleCreate = useCallback(
    async (data, onSuccess: () => void) => {
      try {
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

        if (!(cleanData as any).full_name) {
          throw new Error('Vui lòng nhập họ tên giáo viên');
        }

        const teacherResponse = await api.request('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(cleanData),
        });

        if (!teacherResponse.success) {
          throw new Error(teacherResponse.message || 'Không thể tạo giáo viên');
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

        onSuccess();
        toast.success(
          `Tạo giáo viên thành công${
            selectedSubjects.length > 0 ? ` và phân công ${selectedSubjects.length} môn học!` : '!'
          }`
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toast.error(errorMsg);
        throw err;
      }
    },
    [selectedSubjects]
  );

  // Update teacher
  const handleUpdate = useCallback(
    async (id: number, data, onSuccess: () => void) => {
      try {
        const allowedFields = ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'user_id', 'is_active'];
        const cleanData = {};

        allowedFields.forEach((field) => {
          if (field in data) {
            cleanData[field] = data[field];
          }
        });

        const teacherResponse = await api.request(`/admin/teachers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(cleanData),
        });

        if (!teacherResponse.success) {
          throw new Error(teacherResponse.message || 'Không thể cập nhật giáo viên');
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

        onSuccess();
        toast.success('Cập nhật giáo viên thành công!');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toast.error(errorMsg);
        throw err;
      }
    },
    [selectedSubjects, teacherSubjects, subjectTeachersData]
  );

  return {
    teachers,
    subjects,
    selectedSubjects,
    setSelectedSubjects,
    teacherSubjects,
    subjectTeachersData,
    loadReferenceData,
    handleCreate,
    handleUpdate,
  };
}
