import { BarChart3, Calendar, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HeaderProps {
  academicYear: string;
  semester: string;
  onAcademicYearChange: (year: string) => void;
  onSemesterChange: (sem: string) => void;
  subjects: string[];
  academicYears: string[];
  semesters: string[];
  loading?: boolean;
}

export function Header({
  academicYear,
  semester,
  onAcademicYearChange,
  onSemesterChange,
  subjects,
  academicYears,
  semesters,
  
  loading = false,
}: HeaderProps) {
  // Build description with badges
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
        {subjects && subjects.length > 0 && (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            <BookOpen className="w-3 h-3 mr-1" />
            {subjects.join(', ')}
          </Badge>
        )}
      </div>
    </div>
  );

  // Build controls section
  const controls = loading ? (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Năm học</span>
        <Skeleton className="w-[140px] h-10 rounded-md" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Học kỳ</span>
        <Skeleton className="w-[100px] h-10 rounded-md" />
      </div>
    </div>
  ) : (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Năm học</label>
        <Select value={academicYear} onValueChange={onAcademicYearChange}>
          <SelectTrigger className="w-[140px] focus-visible:outline-none">
            <SelectValue placeholder="Chọn năm học" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Học kỳ</label>
        <Select value={semester} onValueChange={onSemesterChange}>
          <SelectTrigger className="w-[100px] focus-visible:outline-none">
            <SelectValue placeholder="Chọn HK" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((sem) => (
              <SelectItem key={sem} value={sem}>
                {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageHeader
      title="Dashboard phân tích điểm số"
      description={description}
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
      }
    >
      {controls}
    </PageHeader>
  );
}
