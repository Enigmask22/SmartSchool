import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderControls } from '@/components/common/PageHeader';

interface HeaderFiltersProps {
  selectedAcademicYear: string;
  selectedMonth: number;
  selectedYear: number;
  academicYears: string[];
  onAcademicYearChange: (year: string) => void;
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
  selectedMonth,
  selectedYear,
  academicYears,
  onAcademicYearChange,
  onMonthChange,
  onYearChange,
  loading = false,
  isRefetching = false,
}: HeaderFiltersProps) {
  // Get available years from selected academic year
  const availableYears = extractYearsFromAcademicYear(selectedAcademicYear);

  // Loading state: show academic year, month, year selects with labels visible
  if (loading) {
    return (
      <PageHeaderControls spacing="lg">
        {/* Academic Year skeleton */}
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm học</span>
          <Skeleton className="min-w-[120px] h-10 rounded-md" />
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
            <SelectContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {academicYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
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
