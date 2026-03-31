import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

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

export const useClassManagementData = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load academic years on mount
  useEffect(() => {
    (async () => {
      try {
        const response = await api.request('/academic-years');
        if (response.success && response.data) {
          const years = response.data.map((item: any) => item.academic_year);
          setAcademicYears(years);
        }
      } catch (e) {
        logger.error('Error loading academic years:', e);
      }
    })();
  }, []);

  // Load classes based on academic year & grade
  const loadClasses = useCallback(
    async (selectedAcademicYear: string, selectedGrade: string) => {
      try {
        setLoading(true);
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
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    classes,
    academicYears,
    error,
    loading,
    loadClasses,
  };
};
