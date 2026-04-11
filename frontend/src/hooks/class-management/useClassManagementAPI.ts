import { useState, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

export interface ClassInfo {
  id: number;
  class_name: string;
  grade: number | string;
  academic_year: string;
  is_active: boolean;
  teachers?: {
    id: number;
    full_name: string;
    teacher_code: string;
  };
  student_count?: number;
}

export const useClassManagementAPI = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch academic years on initialization
  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await api.request('/admin/classes/academic-years');
      if (response.success && response.data) {
        setAcademicYears(response.data);
      }
    } catch (err) {
      logger.error('Error fetching academic years:', err);
      setError('Failed to load academic years');
    }
  }, []);

  // Fetch student count for a class
  const fetchClassStudentCount = useCallback(async (classId: number) => {
    try {
      const response = await api.request(`/admin/classes/${classId}/students`);
      if (response.success && response.data) {
        return (response.data || []).length;
      }
      return 0;
    } catch (err) {
      logger.error(`Error fetching student count for class ${classId}:`, err);
      return 0;
    }
  }, []);

  // Fetch classes for selected academic year with student counts
  const fetchClasses = useCallback(async (academicYear: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.request(
        `/admin/classes?academic_year=${encodeURIComponent(academicYear)}`
      );
      
      if (response.success && response.data) {
        // Fetch student counts for each class in parallel
        const classesWithCounts = await Promise.all(
          (response.data || []).map(async (classItem: ClassInfo) => {
            const studentCount = await fetchClassStudentCount(classItem.id);
            return {
              ...classItem,
              student_count: studentCount,
            };
          })
        );
        setClasses(classesWithCounts);
      } else {
        setClasses([]);
      }
    } catch (err) {
      logger.error('Error fetching classes:', err);
      setError('Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [fetchClassStudentCount]);

  // Filter classes by grade
  const filterClassesByGrade = useCallback((grade: string) => {
    if (!grade) return classes;
    return classes.filter(cls => cls.grade.toString() === grade);
  }, [classes]);

  // Get class by id
  const getClassById = useCallback((classId: number) => {
    return classes.find(cls => cls.id === classId);
  }, [classes]);

  return {
    classes,
    academicYears,
    loading,
    error,
    fetchAcademicYears,
    fetchClasses,
    filterClassesByGrade,
    getClassById,
  };
};
