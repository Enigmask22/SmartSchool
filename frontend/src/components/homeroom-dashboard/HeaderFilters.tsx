import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderControls } from '@/components/common/PageHeader';
import type { ClassInfo } from '@/hooks/homeroom-dashboard/useHomeroomData';

interface HeaderFiltersProps {
  selectedAcademicYear: string;
  selectedClass: string | null;
  selectedMonth: number;
  selectedYear: number;
  academicYears: string[];
  teacherClasses: ClassInfo[];
  onAcademicYearChange: (year: string) => void;
  onClassChange: (className: string, classId: number) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  loading?: boolean;
  isRefetching?: boolean;
}

/**
 * Header Component
 *
 * Filter controls for homeroom dashboard:
 * - Academic year selection
 * - Class selection
 * - Month selection
 * - Year selection
 *
 * Used within PageHeader component
 */
/**
 * Extract start and end year from academic year string
 * Format: "2024-2025" → [2024, 2025]
 */
const extractYearsFromAcademicYear = (academicYear: string): number[] => {
  if (!academicYear) return [];
  const parts = academicYear.split('-');
  if (parts.length === 2) {
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);
    if (!isNaN(startYear) && !isNaN(endYear)) {
      return [startYear, endYear];
    }
  }
  return [];
};

export function HeaderFilters({
  selectedAcademicYear,
  selectedClass,
  selectedMonth,
  selectedYear,
  academicYears,
  teacherClasses,
  onAcademicYearChange,
  onClassChange,
  onMonthChange,
  onYearChange,
  loading = false,
  isRefetching = false,
}: HeaderFiltersProps) {
  const handleClassChange = useCallback(
    (className: string) => {
      const found = teacherClasses.find((c) => c.class_name === className);
      if (found) {
        onClassChange(className, found.id);
      }
    },
    [teacherClasses, onClassChange]
  );

  // Get available years from selected academic year
  const availableYears = extractYearsFromAcademicYear(selectedAcademicYear);

  // Loading state: show all 4 select skeletons with labels visible
  if (loading) {
    return (
      <PageHeaderControls spacing="lg">
        {/* Academic Year skeleton */}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm học</span>
          <Skeleton className="min-w-[120px] h-10 rounded-md" />
        </div>

        {/* Class skeleton */}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Lớp</span>
          <Skeleton className="min-w-[100px] h-10 rounded-md" />
        </div>

        {/* Month skeleton */}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Tháng</span>
          <Skeleton className="min-w-[60px] h-10 rounded-md" />
        </div>

        {/* Year skeleton */}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm</span>
          <Skeleton className="min-w-[80px] h-10 rounded-md" />
        </div>
      </PageHeaderControls>
    );
  }

  return (
    <PageHeaderControls spacing="lg">
      {/* Academic Year Select */}
      {academicYears.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm học</span>
          <Select value={selectedAcademicYear || ''} onValueChange={onAcademicYearChange} disabled={isRefetching}>
            <SelectTrigger className="min-w-[120px] focus-visible:outline-none">
              <SelectValue placeholder="Chọn năm học" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Class Select - Option A: Just class name */}
      {teacherClasses.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Lớp</span>
          <Select value={selectedClass || ''} onValueChange={handleClassChange} disabled={isRefetching}>
            <SelectTrigger className="min-w-[100px] focus-visible:outline-none">
              <SelectValue placeholder="Chọn lớp" />
            </SelectTrigger>
            <SelectContent>
              {teacherClasses.map((classInfo) => (
                <SelectItem key={classInfo.class_name} value={classInfo.class_name}>
                  {classInfo.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Month Select */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Tháng</span>
        <Select value={String(selectedMonth)} onValueChange={(v) => onMonthChange(parseInt(v, 10))} disabled={isRefetching}>
          <SelectTrigger className="min-w-[60px] focus-visible:outline-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Select */}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm</span>
        <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(parseInt(v, 10))} disabled={isRefetching || availableYears.length === 0}>
          <SelectTrigger className="min-w-[80px] focus-visible:outline-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </PageHeaderControls>
  );
}
