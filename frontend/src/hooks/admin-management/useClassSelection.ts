import { useState, useEffect } from 'react';

/**
 * Hook for managing class selection in the class_subjects form
 * Handles tracking which classes are selected for a teacher-subject assignment
 * @param editingItem - The item being edited (contains class_ids for pre-population)
 * @param showAddForm - Whether the add form is open
 * @param activeTab - Current active tab (should be 'class_subjects')
 */
export function useClassSelection(
  editingItem: any,
  showAddForm: boolean,
  activeTab: string
) {
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  // Load classes when editing an item or adding new
  useEffect(() => {
    if (activeTab === 'class_subjects') {
      if (editingItem && editingItem.class_ids) {
        // For grouped records, show all class_ids
        setSelectedClasses(editingItem.class_ids);
      } else if (showAddForm) {
        // Clear selection when adding new
        setSelectedClasses([]);
      }
    }
  }, [activeTab, editingItem, showAddForm]);

  return {
    selectedClasses,
    setSelectedClasses,
  };
}
