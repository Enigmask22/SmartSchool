import { Users, BookOpen, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface StudentListPageHeaderProps {
  selectedClass: string;
  academicYears: string[];
  selectedAcademicYear: string;
  onAcademicYearChange: (year: string) => void;
  selectedSemester: string;
  onSemesterChange: (sem: string) => void;
  availableSemesters: string[];
  loading?: boolean;
}

export function StudentListPageHeader({
  selectedClass,
  academicYears,
  selectedAcademicYear,
  onAcademicYearChange,
  selectedSemester,
  onSemesterChange,
  availableSemesters,
  loading = false,
}: StudentListPageHeaderProps) {
  // Build description with class badge
  const description = (
    <div className="space-y-2">
      <div className="flex items-center space-x-3 text-sm flex-wrap gap-2">
        {selectedClass && selectedClass !== 'all' && (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            <BookOpen className="w-3 h-3 mr-1" />
            Lớp {selectedClass}
          </Badge>
        )}
        <Badge variant="secondary" className="text-slate-700 bg-slate-100">
          <Calendar className="w-3 h-3 mr-1" />
          {selectedAcademicYear} - {selectedSemester}
        </Badge>
      </div>
    </div>
  );

  // Build controls section
  const controls = (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-medium text-gray-500">Năm học</Label>
        <Select value={selectedAcademicYear} onValueChange={onAcademicYearChange} disabled={loading}>
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
        <Label className="text-xs font-medium text-gray-500">Học kỳ</Label>
        <Select value={selectedSemester} onValueChange={onSemesterChange} disabled={loading}>
          <SelectTrigger className="w-[120px] focus-visible:outline-none">
            <SelectValue placeholder="Chọn HK" />
          </SelectTrigger>
          <SelectContent>
            {availableSemesters.map((sem) => (
              <SelectItem key={sem} value={sem}>
                {sem === "HK1"
                  ? "Học kỳ 1"
                  : sem === "HK2"
                    ? "Học kỳ 2"
                    : "Cả năm"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageHeader
      title="Danh sách học sinh"
      description={description}
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
          <Users className="w-8 h-8 text-white" />
        </div>
      }
    >
      {controls}
    </PageHeader>
  );
}
