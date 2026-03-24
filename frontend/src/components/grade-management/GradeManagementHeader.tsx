// React already imported by JSX transform
import { GraduationCap, Calendar, BookOpen } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface GradeManagementHeaderProps {
  teacherName: string;
  academicYear: string;
  semester: string;
  ACADEMIC_YEARS: string[];
  SEMESTERS: string[];
  onAcademicYearChange: (year: string) => void;
  onSemesterChange: (sem: string) => void;
}

const GradeManagementHeader = ({
  teacherName,
  academicYear,
  semester,
  ACADEMIC_YEARS,
  SEMESTERS,
  onAcademicYearChange,
  onSemesterChange,
}: GradeManagementHeaderProps) => {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center rounded-lg w-14 h-14 bg-primary/10">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="ml-3">
            <CardTitle className="text-2xl font-bold">
              Quản lý điểm số
            </CardTitle>
            <CardDescription className="text-lg">
              Chào mừng {teacherName}
            </CardDescription>
            <div className="flex items-center mt-2 space-x-3">
              <Badge variant="secondary" className="text-sm">
                <Calendar className="w-3 h-3 mr-1" />
                {academicYear}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                <BookOpen className="w-3 h-3 mr-1" />
                {semester}
              </Badge>
            </div>
          </div>

          {/* Period Filters */}
          <div className="flex gap-3 ml-auto">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Năm học
              </label>
              <Select value={academicYear} onValueChange={onAcademicYearChange}>
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[100px]">
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
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default GradeManagementHeader;
