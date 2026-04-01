import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

/**
 * Hook for managing teacher subject selection and loaded subject data
 * Used in the teachers tab to track which subjects are selected for a teacher
 */
export function useTeacherSubjectManagement(
  editingItem: any,
  showAddForm: boolean,
  activeTab: string
) {
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, any>>({});
  const [subjectTeachersData, setSubjectTeachersData] = useState<any[]>([]);

  // Load teacher subjects when editing or adding
  useEffect(() => {
    if (activeTab === 'teachers') {
      if (editingItem) {
        const teacherSubjectIds = teacherSubjects[editingItem] || [];
        setSelectedSubjects(teacherSubjectIds);
      } else if (showAddForm) {
        setSelectedSubjects([]);
      }
    }
  }, [activeTab, editingItem, showAddForm, teacherSubjects]);

  // Load subject-teacher mappings
  const loadTeacherSubjectData = useCallback(async () => {
    try {
      const response = await api.request('/admin/subject-teachers');
      if (response.success) {
        setSubjectTeachersData(response.data || []);

        const teacherSubjectsMap = {};
        (response.data || []).forEach((st) => {
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
      logger.error('Error loading teacher subjects:', err);
    }
  }, []);

  return {
    selectedSubjects,
    setSelectedSubjects,
    teacherSubjects,
    setTeacherSubjects,
    subjectTeachersData,
    setSubjectTeachersData,
    loadTeacherSubjectData,
  };
}
