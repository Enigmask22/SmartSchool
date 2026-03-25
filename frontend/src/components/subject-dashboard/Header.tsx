import { BarChart3, Calendar, BookOpen } from 'lucide-react';
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
  userName: string;
  academicYear: string;
  semester: string;
  onAcademicYearChange: (year: string) => void;
  onSemesterChange: (sem: string) => void;
  subjects: string[];
  academicYears: string[];
  semesters: string[];
  classDropdown?: React.ReactNode;
  loading?: boolean;
}

export function Header({
  userName,
  academicYear,
  semester,
  onAcademicYearChange,
  onSemesterChange,
  subjects,
  academicYears,
  semesters,
  classDropdown,
  loading = false,
}: HeaderProps) {
  return (
    <div className="p-6 bg-white border-l-4 border-blue-600 shadow-lg rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 w-2/3">
          <div className="flex items-center justify-center w-16 h-16 shadow-lg rounded-xl bg-primary flex-shrink-0">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div className="w-full">
            <h1 className="text-3xl font-bold text-gray-800">
              Dashboard phân tích điểm số
            </h1>
            {loading ? (
              <>
                <Skeleton className="h-4 w-48 mt-2 mb-3" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-gray-600">
                  Chào mừng <span className="font-semibold text-blue-600">{userName}</span>
                </p>
                <div className="flex items-center mt-2 space-x-3 text-sm">
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
              </>
            )}
          </div>
        </div>

        {/* Period Filters */}
        <div className="flex gap-3">
          {loading ? (
            <>
              <Skeleton className="w-32 h-10" />
              <Skeleton className="w-24 h-10" />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Năm học</label>
                <Select value={academicYear} onValueChange={onAcademicYearChange}>
                  <SelectTrigger className="w-[140px]">
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
                  <SelectTrigger className="w-[100px]">
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

              {classDropdown}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
