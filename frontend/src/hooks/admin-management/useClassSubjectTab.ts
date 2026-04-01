import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';

export function useClassSubjectTab(
  activeTab: string,
  classes: any[],
  teachers: any[],
  subjects: any[],
  subjectTeachersData: any[],
  formData: Record<string, any>,
  selectedAcademicYear: string,
  selectedClassId: string
) {
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);

  // Auto-filter teachers for class_subjects based on selected subject
  useEffect(() => {
    if (activeTab === 'class_subjects' && formData.subject_id && subjectTeachersData.length > 0 && teachers.length > 0) {
      const teachersForSubject = subjectTeachersData
        .filter((st) => st.subject_id === formData.subject_id && st.is_active !== false)
        .map((st) => st.teacher_id);

      const filtered = teachers.filter((t) => teachersForSubject.includes(t.id));
      setFilteredTeachers(filtered);
    }
  }, [activeTab, formData.subject_id, subjectTeachersData, teachers]);

  // Filter classes when academic year or grade changes
  const getFilteredClasses = useCallback(
    (selectedGrade: string) => {
      let filtered = [...classes];

      if (selectedAcademicYear) {
        filtered = filtered.filter((cls) => cls.academic_year === selectedAcademicYear);
      }

      if (selectedGrade) {
        filtered = filtered.filter((cls) => cls.grade.toString() === selectedGrade);
      }

      return filtered;
    },
    [classes, selectedAcademicYear]
  );

  // Initialize class subjects
  const handleInitializeClassSubjects = useCallback(
    (onConfirm: (callback: () => Promise<void>) => void) => {
      if (!selectedClassId || !selectedAcademicYear) {
        toast.error('Vui lòng chọn lớp và năm học!');
        return;
      }

      onConfirm(async () => {
        try {
          await doInitializeClassSubjects();
        } catch (error) {
          logger.error('Error initializing class subjects:', error);
        }
      });
    },
    [selectedClassId, selectedAcademicYear]
  );

  // Perform initialization
  const doInitializeClassSubjects = useCallback(async () => {
    try {
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
      }

      toast.success(message);
      return { successCount, errorCount };
    } catch (error) {
      logger.error('Error initializing class subjects:', error);
      const errorMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
      toast.error('Lỗi khi khởi tạo môn học: ' + errorMsg);
      throw error;
    }
  }, [selectedClassId, selectedAcademicYear, subjects]);

  const handleChange = useCallback(
    (field: string, value: any) => {
      // This will be used by the form to filter teachers based on subject selection
      if (field === 'subject_id' && value) {
        const teachersForSubject = subjectTeachersData
          .filter((st) => st.subject_id === parseInt(value) && st.is_active !== false)
          .map((st) => st.teacher_id);

        const filtered = teachers.filter((t) => teachersForSubject.includes(t.id));
        setFilteredTeachers(filtered);
      }
    },
    [subjectTeachersData, teachers]
  );

  return {
    filteredTeachers,
    setFilteredTeachers,
    getFilteredClasses,
    handleInitializeClassSubjects,
    doInitializeClassSubjects,
    handleChange,
  };
}
