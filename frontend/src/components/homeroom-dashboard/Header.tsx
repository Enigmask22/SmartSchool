import { GraduationCap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClassInfo } from '@/hooks/homeroom-dashboard/useHomeroomData';

interface HeaderProps {
  selectedClass: string | null;
  selectedClassId: number | null;
  selectedAcademicYear: string;
  selectedMonth: number;
  selectedYear: number;
  academicYears: string[];
  teacherClasses: ClassInfo[];
  onClassChange: (className: string, classId: number) => void;
  onAcademicYearChange: (year: string) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  loading?: boolean;
}

export function Header({
  selectedClass,
  selectedAcademicYear,
  selectedMonth,
  selectedYear,
  academicYears,
  teacherClasses,
  onClassChange,
  onAcademicYearChange,
  onMonthChange,
  onYearChange,
  loading = false,
}: HeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard chủ nhiệm
          </h1>
          <p className="mt-1 text-gray-600">
            {selectedClass ? `Lớp ${selectedClass}` : 'Đang tải thông tin lớp...'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-40 h-10" />
            <Skeleton className="w-48 h-10" />
            <Skeleton className="w-24 h-10" />
            <Skeleton className="w-32 h-10" />
          </div>
        ) : (
          <>
            {/* Dropdown chọn năm học */}
            {academicYears.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Năm học</span>
                <Select value={selectedAcademicYear || ''} onValueChange={onAcademicYearChange}>
                  <SelectTrigger className="min-w-[160px]">
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

            {/* Dropdown chọn lớp */}
            {teacherClasses.length > 0 && (
              <div className="flex items-center gap-3">
                <GraduationCap className="flex-shrink-0 w-5 h-5 text-gray-500" />
                <Select value={selectedClass || ''} onValueChange={(value) => {
                  const found = teacherClasses.find((c) => c.class_name === value);
                  if (found) {
                    onClassChange(value, found.id);
                  }
                }}>
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses.map((classInfo) => (
                      <SelectItem key={classInfo.class_name} value={classInfo.class_name}>
                        Lớp {classInfo.class_name} - {classInfo.grade} ({classInfo.academic_year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Chọn tháng */}
                <span className="text-sm text-gray-500">Tháng</span>
                <Select value={String(selectedMonth)} onValueChange={(v) => onMonthChange(parseInt(v, 10))}>
                  <SelectTrigger className="w-[100px]">
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

                {/* Chọn năm */}
                <span className="text-sm text-gray-500">Năm</span>
                <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      new Date().getFullYear() - 1,
                      new Date().getFullYear(),
                      new Date().getFullYear() + 1,
                    ].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
