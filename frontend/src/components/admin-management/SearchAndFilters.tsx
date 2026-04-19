import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useAdminFilters } from '@/hooks/admin-management/useAdminFilters';
import { FILTER_CONFIGS, type FilterConfig } from '@/hooks/admin-management/useTableFilters';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';


interface SearchAndFiltersProps {
  activeTab: string;
  loading?: boolean;
  search: ReturnType<typeof useAdminSearch>;
  filters: ReturnType<typeof useAdminFilters>;
  tabFilters?: Record<string, any>;
  onTabFiltersChange?: (fieldName: string, value: any) => void;
  allData?: any[]; // For extracting available subjects/classes
  subjects?: any[]; // Full subjects array from hook
  classes?: any[]; // Full classes array from hook
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  activeTab,
  loading = false,
  search,
  tabFilters = {},
  onTabFiltersChange,
  allData = [],
  subjects = [],
  classes = [],
}) => {
  const shouldShowFilters =
    activeTab === 'users' ||
    activeTab === 'teachers' ||
    activeTab === 'subjects' ||
    activeTab === 'classes' ||
    activeTab === 'class_subjects';

  const filterConfig = FILTER_CONFIGS[activeTab] || { filters: [], sortableFields: [] };

  const handleFilterChange = (fieldName: string, value: any) => {
    onTabFiltersChange?.(fieldName, value);
  };

  // Extract available subjects - prefer the full subjects array from hook
  const getSubjectOptions = () => {
    if (subjects && subjects.length > 0) {
      return subjects
        .filter((s: any) => s?.subject_name)
        .map((s: any) => ({
          label: s.subject_name,
          value: s.subject_code, // Use subject_code as the filter key
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    
    // Fallback: extract from filtered data if subjects array not provided
    const subjectMap = new Map<string, string>();
    allData.forEach((item: any) => {
      if (Array.isArray(item.subjects)) {
        item.subjects.forEach((subject: any) => {
          if (subject?.subject_code && subject?.subject_name) {
            subjectMap.set(subject.subject_code, subject.subject_name);
          } else if (subject?.code && subject?.name) {
            subjectMap.set(subject.code, subject.name);
          }
        });
      }
    });
    return Array.from(subjectMap.entries())
      .map(([code, name]) => ({ label: name, value: code }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  // Extract available classes - prefer the full classes array from hook
  const getClassOptions = () => {
    if (classes && classes.length > 0) {
      return classes
        .filter((c: any) => c?.class_name)
        .map((c: any) => ({
          label: c.class_name,
          value: c.class_name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    
    // Fallback: extract from filtered data if classes array not provided
    const classSet = new Set<string>();
    allData.forEach((item: any) => {
      if (Array.isArray(item.classes)) {
        item.classes.forEach((cls: any) => {
          if (cls?.class_name) {
            classSet.add(cls.class_name);
          } else if (cls?.name) {
            classSet.add(cls.name);
          }
        });
      }
    });
    return Array.from(classSet)
      .sort()
      .map((name) => ({ label: name, value: name }));
  };

  const clearFilters = () => {
    // Clear all filters for current tab
    filterConfig.filters.forEach((filter: FilterConfig) => {
      handleFilterChange(filter.field, null);
    });
  };

  const hasActiveFilters = Object.values(tabFilters).some((v) => v !== null && v !== undefined && v !== '');

  // Helper to convert string values back to proper types for certain fields
  const convertFilterValue = (fieldName: string, value: string | null): any => {
    if (value === null || value === 'none') {
      return null;
    }
    
    // Convert string booleans back to actual booleans for is_mandatory field
    if (fieldName === 'is_mandatory') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    
    return value;
  };

  return (
    <div className="space-y-4">
      {/* Search and Show Deleted Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm kiếm..."
            value={search.searchTerm}
            onChange={(e) => search.setSearchTerm(e.target.value)}
            disabled={loading}
            className="pl-12"
          />
        </div>

        {/* Show Deleted Checkbox */}
        {shouldShowFilters && (
          <div className="flex items-center px-4 py-2 space-x-2 rounded-lg bg-muted">
            <input
              type="checkbox"
              id="showDeleted"
              checked={search.showDeleted}
              onChange={(e) => search.setShowDeleted(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="showDeleted" className="text-sm font-medium cursor-pointer">
              Hiển thị đã xóa
            </label>
          </div>
        )}
      </div>

      {/* Tab-Specific Filters */}
      {filterConfig.filters && filterConfig.filters.length > 0 && (
        <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-card">
          {filterConfig.filters.map((filter: FilterConfig) => {
            if (filter.type === 'select') {
              let options: { label: string; value: any }[] = filter.options || [];
              
              // Dynamically populate options based on filter field
              if (filter.field === 'academic_year') {
                options = ACADEMIC_YEAR_OPTIONS.map((year) => ({
                  label: year,
                  value: year,
                }));
              } else if (filter.field === 'subjects') {
                options = getSubjectOptions();
              } else if (filter.field === 'classes') {
                options = getClassOptions();
              }

              return (
                <div key={filter.field} className="max-w-[240px]">
                  <label className="text-xs font-medium text-muted-foreground">
                    {filter.label}
                  </label>
                  <Select
                    value={tabFilters[filter.field] !== null && tabFilters[filter.field] !== undefined 
                      ? String(tabFilters[filter.field]) 
                      : 'none'}
                    onValueChange={(value) => handleFilterChange(filter.field, convertFilterValue(filter.field, value === 'none' ? null : value))}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{filter.label}</SelectItem>
                      {options.length > 0 ? (
                        options.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Không có dữ liệu
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (filter.type === 'multiselect') {
              let options: { label: string; value: any }[] = filter.options || [];
              
              // Dynamically populate options based on filter field
              if (filter.field === 'subjects') {
                options = getSubjectOptions();
              } else if (filter.field === 'classes') {
                options = getClassOptions();
              }

              return (
                <div key={filter.field} className="max-w-[240px]">
                  <label className="text-xs font-medium text-muted-foreground">
                    {filter.label}
                  </label>
                  <Select
                    value={tabFilters[filter.field] || 'none'}
                    onValueChange={(value) => handleFilterChange(filter.field, convertFilterValue(filter.field, value === 'none' ? null : value))}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{filter.label}</SelectItem>
                      {options.length > 0 ? (
                        options.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Không có dữ liệu
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return null;
          })}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
                disabled={loading}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};