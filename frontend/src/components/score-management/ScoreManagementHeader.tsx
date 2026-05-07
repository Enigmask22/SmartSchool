// React already imported by JSX transform
import { BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { PageHeaderControls } from '@/components/common/PageHeader/PageHeaderControls';

interface ScoreManagementHeaderProps {
  academicYear: string;
  semester: string;
  ACADEMIC_YEARS: string[];
  SEMESTERS: string[];
  onAcademicYearChange: (year: string) => void;
  onSemesterChange: (sem: string) => void;
  loading?: boolean;
  isFilterLocked?: boolean;
}

const ScoreManagementHeader = ({
  academicYear,
  semester,
  ACADEMIC_YEARS,
  SEMESTERS,
  onAcademicYearChange,
  onSemesterChange,
  loading = false,
  isFilterLocked = false,
}: ScoreManagementHeaderProps) => {
  return (
    <PageHeader
      title="Quản lý điểm số"
      description={
        <div className="space-y-2">
          {!isFilterLocked ? (
            <p className="text-muted-foreground text-base">
              Theo dõi, nhập và cập nhật điểm học sinh theo từng lớp - môn học.
            </p>
          ) : null}
          {isFilterLocked ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                Năm học: {academicYear}
              </Badge>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                Học kỳ: {semester}
              </Badge>
            </div>
          ) : null}
        </div>
      }
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
      }
    >
      {loading ? (
        // Loading state: Labels visible + skeleton Selects  
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Năm học
            </label>
            <Skeleton className="h-10 w-[140px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Học kỳ
            </label>
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      ) : !isFilterLocked ? (
        // Normal state: Actual Selects
        <PageHeaderControls spacing="md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Năm học
            </label>
            <Select
              value={academicYear}
              onValueChange={onAcademicYearChange}
              disabled={isFilterLocked}
            >
              <SelectTrigger className="w-[140px] focus-visible:outline-none disabled:opacity-60">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Học kỳ
            </label>
            <Select
              value={semester}
              onValueChange={onSemesterChange}
              disabled={isFilterLocked}
            >
              <SelectTrigger className="w-[100px] focus-visible:outline-none disabled:opacity-60">
                <SelectValue placeholder="Chọn HK" />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageHeaderControls>
      ) : null}
    </PageHeader>
  );
};

export default ScoreManagementHeader;
