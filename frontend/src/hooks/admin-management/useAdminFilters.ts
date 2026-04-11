import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import logger from '@/utils/logger';

export function useAdminFilters() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Load academic years
  const loadAcademicYears = useCallback(async () => {
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
  }, []);

  // Load classes
  const loadClasses = useCallback(async () => {
    try {
      const response = await api.request('/admin/classes');
      if (response.success) {
        setClasses(response.data || []);
      }
    } catch (e) {
      logger.error('Error loading classes:', e);
    }
  }, []);

  // Filter classes when academic year or grade changes
  useEffect(() => {
    let filtered = [...classes];

    if (selectedAcademicYear) {
      filtered = filtered.filter((cls) => cls.academic_year === selectedAcademicYear);
    }

    if (selectedGrade) {
      filtered = filtered.filter((cls) => cls.grade.toString() === selectedGrade);
    }

    setFilteredClasses(filtered);
  }, [classes, selectedAcademicYear, selectedGrade]);

  const resetFilters = useCallback(() => {
    setSelectedAcademicYear('');
    setSelectedGrade('');
    setSelectedClassId('');
    setFilteredClasses([]);
  }, []);

  return {
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedGrade,
    setSelectedGrade,
    selectedClassId,
    setSelectedClassId,
    filteredClasses,
    classes,
    loadAcademicYears,
    loadClasses,
    resetFilters,
  };
}
