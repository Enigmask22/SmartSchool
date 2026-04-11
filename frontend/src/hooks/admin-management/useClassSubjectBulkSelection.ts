import { useState, useEffect, useCallback } from 'react';
import logger from '@/utils/logger';

/**
 * Hook for managing class selection for bulk class-subject assignments
 * Used in the class_subjects tab when assigning a teacher to teach a subject in multiple classes
 * 
 * Pattern: Teacher → Subject → Academic Year → Select Multiple Classes (checkboxes)
 * 
 * @param editingItem - The ID of the class-subject being edited (null when adding bulk)
 * @param showAddForm - Whether the add form is open
 * @param activeTab - Current active tab (should be 'class_subjects')
 * @param availableClasses - List of available classes to filter from
 * @param selectedAcademicYear - Currently selected academic year to filter classes
 */
export function useClassSubjectBulkSelection(
  editingItem: any,
  showAddForm: boolean,
  activeTab: string,
  availableClasses?: any[],
  selectedAcademicYear?: string
) {
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);

  // Filter classes by academic year when academic year changes
  useEffect(() => {
    if (activeTab === 'class_subjects' && availableClasses && selectedAcademicYear) {
      const filtered = availableClasses.filter(
        (cls) => cls.academic_year === selectedAcademicYear
      );
      setFilteredClasses(filtered);
      logger.debug(`Class filter for academic year ${selectedAcademicYear}:`, filtered);
    }
  }, [activeTab, availableClasses, selectedAcademicYear]);

  // Reset selected classes when entering/exiting add form
  useEffect(() => {
    if (activeTab === 'class_subjects') {
      if (editingItem) {
        // When editing a single class-subject, don't use bulk selection
        // This hook only applies to adding new bulk assignments
        setSelectedClassIds([]);
      } else if (showAddForm) {
        // When adding new, reset to empty selection
        setSelectedClassIds([]);
      } else {
        // When not in any form, clear
        setSelectedClassIds([]);
      }
    }
  }, [activeTab, editingItem, showAddForm]);

  // Toggle a class selection
  const toggleClass = useCallback((classId: number) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  }, []);

  // Select all visible classes
  const selectAllVisibleClasses = useCallback(() => {
    const allClassIds = filteredClasses.map((cls) => cls.id);
    setSelectedClassIds(allClassIds);
  }, [filteredClasses]);

  // Clear all selections
  const clearAllClasses = useCallback(() => {
    setSelectedClassIds([]);
  }, []);

  // Get count of selected classes
  const selectedCount = selectedClassIds.length;
  const totalCount = filteredClasses.length;

  return {
    selectedClassIds,
    setSelectedClassIds,
    filteredClasses,
    toggleClass,
    selectAllVisibleClasses,
    clearAllClasses,
    selectedCount,
    totalCount,
  };
}
