import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

/**
 * Hook for managing teacher subject selection and loaded subject data
 * Used in the teachers tab to track which subjects are selected for a teacher
 * @param editingItem - The ID of the teacher being edited (null when adding)
 * @param showAddForm - Whether the add form is open
 * @param activeTab - Current active tab (should be 'teachers')
 * @param currentTeacherSubjects - Map of current teacher->subjects from parent hook (optional, for pre-populating)
 */
export function useTeacherSubjectManagement(
  editingItem: any,
  showAddForm: boolean,
  activeTab: string,
  currentTeacherSubjects?: Record<string, any>
) {
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, any>>({});
  const [subjectTeachersData, setSubjectTeachersData] = useState<any[]>([]);

  // Update teacherSubjects when passed from parent (for editing mode)
  useEffect(() => {
    if (currentTeacherSubjects) {
      setTeacherSubjects(currentTeacherSubjects);
    }
  }, [currentTeacherSubjects]);

  // Load teacher subjects when editing or adding
  useEffect(() => {
    if (activeTab === 'teachers') {
      if (editingItem) {
        // Use passed teacherSubjects to get current subjects for this teacher
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
