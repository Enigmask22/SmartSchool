import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ClassFilterCardProps {
  selectedAcademicYear: string | null;
  setSelectedAcademicYear: (value: string) => void;
  selectedGrade: string | null;
  setSelectedGrade: (value: string) => void;
  selectedClassForManagement: string | null;
  setSelectedClassForManagement: (value: string) => void;
  showInactiveStudents: boolean;
  setShowInactiveStudents: (value: boolean) => void;
  academicYears: string[];
  classes: Array<{ id: number; class_name: string; academic_year?: string }>;
}

const ClassFilterCard = ({
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedGrade,
  setSelectedGrade,
  selectedClassForManagement,
  setSelectedClassForManagement,
  showInactiveStudents,
  setShowInactiveStudents,
  academicYears,
  classes,
}: ClassFilterCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bộ lọc lớp học</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          {/* Academic Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="year-select" className="text-sm font-medium">
              Chọn năm học
            </Label>
            <Select
              value={selectedAcademicYear || 'none'}
              onValueChange={(value) =>
                setSelectedAcademicYear(value === 'none' ? '' : value)
              }
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn năm học</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade Selection */}
          <div className="space-y-2">
            <Label htmlFor="grade-select" className="text-sm font-medium">
              Chọn khối
            </Label>
            <Select
              value={selectedGrade || 'none'}
              onValueChange={(value) =>
                setSelectedGrade(value === 'none' ? '' : value)
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Chọn khối" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn khối</SelectItem>
                <SelectItem value="10">Khối 10</SelectItem>
                <SelectItem value="11">Khối 11</SelectItem>
                <SelectItem value="12">Khối 12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Selection */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="class-select" className="text-sm font-medium">
              Chọn lớp học
            </Label>
            <Select
              value={selectedClassForManagement || 'none'}
              onValueChange={(value) =>
                setSelectedClassForManagement(value === 'none' ? '' : value)
              }
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Chọn lớp học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn lớp học</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.class_name} ({cls.academic_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Inactive Students */}
          <div className="flex items-center mt-2 space-x-2 sm:mt-0">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactiveStudents}
              onChange={(e) => setShowInactiveStudents(e.target.checked)}
              className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-2 focus:ring-ring"
            />
            <Label
              htmlFor="show-inactive"
              className="text-sm font-medium cursor-pointer"
            >
              Hiển thị học sinh đã xóa
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassFilterCard;
