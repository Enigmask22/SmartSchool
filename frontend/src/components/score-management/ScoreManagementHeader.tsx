// React already imported by JSX transform
import { BookOpen, Calendar} from 'lucide-react';
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
}

const ScoreManagementHeader = ({
  academicYear,
  semester,
  ACADEMIC_YEARS,
  SEMESTERS,
  onAcademicYearChange,
  onSemesterChange,
  loading = false,
}: ScoreManagementHeaderProps) => {
  const description = (
    <div className="space-y-2">
      <div className="flex items-center space-x-3 text-sm flex-wrap gap-2">
        <Badge variant="secondary" className="text-blue-700 bg-blue-100">
          <Calendar className="w-3 h-3 mr-1" />
          {academicYear}
        </Badge>
        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
          <BookOpen className="w-3 h-3 mr-1" />
          {semester}
        </Badge>
        {/* {subjects && subjects.length > 0 && (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            <BookOpen className="w-3 h-3 mr-1" />
            {subjects.join(', ')}
          </Badge>
        )} */}
      </div>
    </div>
  );

  return (
    <PageHeader
      title="Quản lý điểm số"
      description={description}
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
      ) : (
        // Normal state: Actual Selects
        <PageHeaderControls spacing="md">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Năm học
            </label>
            <Select value={academicYear} onValueChange={onAcademicYearChange}>
              <SelectTrigger className="w-[140px] focus-visible:outline-none">
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
            <Select value={semester} onValueChange={onSemesterChange}>
              <SelectTrigger className="w-[100px] focus-visible:outline-none">
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
      )}
    </PageHeader>
  );
};

export default ScoreManagementHeader;
