import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchAndFiltersProps {
  activeTab: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
  // For class_subjects tab filters
  selectedAcademicYear?: string;
  onAcademicYearChange?: (value: string) => void;
  academicYears?: string[];
  selectedGrade?: string;
  onGradeChange?: (value: string) => void;
  selectedClassId?: string;
  onClassIdChange?: (value: string) => void;
  filteredClasses?: Array<{ id: number; class_name: string }>;
  isClassSelectDisabled?: boolean;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  activeTab,
  searchTerm,
  onSearchChange,
  showDeleted,
  onShowDeletedChange,
  selectedAcademicYear = '',
  onAcademicYearChange,
  academicYears = [],
  selectedGrade = '',
  onGradeChange,
  selectedClassId = '',
  onClassIdChange,
  filteredClasses = [],
  isClassSelectDisabled = false,
}) => {
  const shouldShowFilters =
    activeTab === 'users' ||
    activeTab === 'teachers' ||
    activeTab === 'subjects' ||
    activeTab === 'classes' ||
    activeTab === 'subject_teachers' ||
    activeTab === 'class_subjects' ||
    activeTab === 'score_settings';

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12"
        />
      </div>

      {/* Filters for class_subjects tab */}
      {activeTab === 'class_subjects' && (
        <div className="flex items-center gap-3">
          <Select
            value={selectedAcademicYear || 'none'}
            onValueChange={(value) =>
              onAcademicYearChange?.(value === 'none' ? '' : value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Năm học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Năm học</SelectItem>
              {academicYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGrade || 'none'}
            onValueChange={(value) => onGradeChange?.(value === 'none' ? '' : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Khối" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Khối</SelectItem>
              <SelectItem value="10">Khối 10</SelectItem>
              <SelectItem value="11">Khối 11</SelectItem>
              <SelectItem value="12">Khối 12</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedClassId || 'none'}
            onValueChange={(value) =>
              onClassIdChange?.(value === 'none' ? '' : value)
            }
            disabled={isClassSelectDisabled}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lớp học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Lớp học</SelectItem>
              {filteredClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show Deleted Checkbox */}
      {shouldShowFilters && (
        <div className="flex items-center px-4 py-2 space-x-2 rounded-lg bg-muted">
          <input
            type="checkbox"
            id="showDeleted"
            checked={showDeleted}
            onChange={(e) => onShowDeletedChange(e.target.checked)}
            className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
          />
          <label htmlFor="showDeleted" className="text-sm font-medium cursor-pointer">
            Hiển thị đã xóa tạm thời
          </label>
        </div>
      )}
    </div>
  );
};
