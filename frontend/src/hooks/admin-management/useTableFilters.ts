export interface FilterConfig {
  type: 'text' | 'select' | 'boolean' | 'date' | 'multiselect';
  label: string;
  field: string;
  options?: { label: string; value: any }[];
  placeholder?: string;
}

export interface TabFilterConfigs {
  [tabName: string]: {
    filters: FilterConfig[];
    sortableFields: string[];
  };
}

export const FILTER_CONFIGS: TabFilterConfigs = {
  users: {
    filters: [
      {
        type: 'select',
        label: 'Vai trò',
        field: 'role',
        options: [
          { label: 'Quản trị viên', value: 'admin' },
          { label: 'GVCN', value: 'homeroom_teacher' },
          { label: 'Giáo viên', value: 'teacher' },
        ],
      },
    ],
    sortableFields: ['id', 'username', 'email', 'full_name', 'role'],
  },
  teachers: {
    filters: [
      {
        type: 'select',
        label: 'Giới tính',
        field: 'gender',
        options: [
          { label: 'Nam', value: 'Nam' },
          { label: 'Nữ', value: 'Nữ' },
        ],
      },
      {
        type: 'multiselect',
        label: 'Môn học',
        field: 'subjects',
        // Options will be populated dynamically from available subjects
      },
    ],
    sortableFields: ['id', 'teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender'],
  },
  subjects: {
    filters: [
      {
        type: 'select',
        label: 'Nhóm môn',
        field: 'is_mandatory',
        options: [
          { label: 'Bắt buộc', value: true },
          { label: 'Tự chọn', value: false },
        ],
      },
    ],
    sortableFields: ['id', 'subject_code', 'subject_name', 'is_mandatory'],
  },
  classes: {
    filters: [
      {
        type: 'select',
        label: 'Khối',
        field: 'grade',
        options: [
          { label: '10', value: '10' },
          { label: '11', value: '11' },
          { label: '12', value: '12' },
        ],
      },
      {
        type: 'select',
        label: 'Năm học',
        field: 'academic_year',
        // Options will be populated dynamically
      },
    ],
    sortableFields: ['id', 'class_name', 'grade', 'homeroom_teacher', 'room_number', 'academic_year', 'total_students'],
  },
  class_subjects: {
    filters: [
      {
        type: 'select',
        label: 'Năm học',
        field: 'academic_year',
        // Options will be populated dynamically
      },
      {
        type: 'select',
        label: 'Học kỳ',
        field: 'semester',
        options: [
          { label: 'HK1', value: 'HK1' },
          { label: 'HK2', value: 'HK2' },
        ],
      },
      {
        type: 'select',
        label: 'Khối',
        field: 'grade',
        options: [
          { label: '10', value: '10' },
          { label: '11', value: '11' },
          { label: '12', value: '12' },
        ],
      },
    ],
    sortableFields: ['id', 'subject_name', 'teacher_name', 'academic_year', 'semester'],
  },
};

/**
 * Apply filters to data based on filter values
 * @param data - The data array to filter
 * @param filterValues - The filter values to apply
 * @param activeTab - The active tab (needed for grade field handling: single-value in 'classes', multi-value in 'class_subjects')
 */
export function applyFilters(
  data: any[],
  filterValues: Record<string, any>,
  activeTab: string = 'classes'
): any[] {
  if (!filterValues || Object.keys(filterValues).length === 0) {
    return data;
  }

  return data.filter((item) => {
    for (const [field, value] of Object.entries(filterValues)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Handle multi-value fields (arrays) - check if array contains the value
      // Note: grade is multi-value in class_subjects (grouped by multiple classes) but single-value in classes
      const isGradeMultiValue = activeTab === 'class_subjects';
      const multiValueFields = isGradeMultiValue ? ['subjects', 'classes', 'grade'] : ['subjects', 'classes'];
      
      if (multiValueFields.includes(field)) {
        const itemArray = Array.isArray(item[field]) ? item[field] : [];
        // Support both single values and arrays of values
        const filterValue = Array.isArray(value) ? value : [value];
        const hasMatch = filterValue.some((v: any) =>
          itemArray.some((itemVal: any) => {
            // For subjects: compare by subject_code or id
            if (field === 'subjects') {
              const matches = itemVal?.subject_code === v || itemVal?.id === v || itemVal?.code === v;
              return matches;
            }
            // For classes: compare by class_name or id
            if (field === 'classes') {
              return itemVal?.class_name === v || itemVal?.id === v || itemVal?.name === v;
            }
            // For grade: compare as string (API may return number but filter value is string)
            if (field === 'grade') {
              return String(itemVal) === String(v);
            }
            return itemVal === v;
          })
        );
        if (!hasMatch) return false;
      }
      // Handle exact match filters (select fields)
      else if (
        field === 'role' ||
        field === 'gender' ||
        field === 'is_mandatory' ||
        field === 'academic_year' ||
        field === 'semester' ||
        field === 'grade'
      ) {
        // For grade field in classes tab: compare as strings since API returns number but filter value is string
        if (field === 'grade') {
          if (String(item[field]) !== String(value)) return false;
        } else {
          if (item[field] !== value) return false;
        }
      }
      // Handle text filters (partial match, case-insensitive)
      else if (typeof value === 'string' && value.trim()) {
        const itemValue = String(item[field] || '').toLowerCase();
        if (!itemValue.includes(value.toLowerCase())) return false;
      }
    }
    return true;
  });
}
