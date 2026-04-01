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
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useAdminFilters } from '@/hooks/admin-management/useAdminFilters';


interface SearchAndFiltersProps {
  activeTab: string;
  loading?: boolean;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  activeTab,
  loading = false,
}) => {
  const search = useAdminSearch();
  const filters = useAdminFilters();
  const shouldShowFilters =
    activeTab === 'users' ||
    activeTab === 'teachers' ||
    activeTab === 'subjects' ||
    activeTab === 'classes' ||
    activeTab === 'subject_teachers' ||
    activeTab === 'class_subjects' ||
    activeTab === 'score_settings';

  const isClassSelectDisabled = !filters.selectedAcademicYear && !filters.selectedGrade;

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
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

      {/* Filters for class_subjects tab */}
      {activeTab === 'class_subjects' && (
        <div className="flex items-center gap-3">
          <Select
            value={filters.selectedAcademicYear || 'none'}
            onValueChange={(value) =>
              filters.setSelectedAcademicYear(value === 'none' ? '' : value)
            }
            disabled={loading}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Năm học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Năm học</SelectItem>
              {filters.academicYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.selectedGrade || 'none'}
            onValueChange={(value) => filters.setSelectedGrade(value === 'none' ? '' : value)}
            disabled={loading}
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
            value={filters.selectedClassId || 'none'}
            onValueChange={(value) =>
              filters.setSelectedClassId(value === 'none' ? '' : value)
            }
            disabled={isClassSelectDisabled || loading}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lớp học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Lớp học</SelectItem>
              {filters.filteredClasses.map((cls) => (
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
            checked={search.showDeleted}
            onChange={(e) => search.setShowDeleted(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="showDeleted" className="text-sm font-medium cursor-pointer">
            Hiển thị đã xóa tạm thời
          </label>
        </div>
      )}
    </div>
  );
};
