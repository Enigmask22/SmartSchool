import { Search, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterSectionProps {
  selectedClass: string;
  availableClasses: string[];
  classesLoading: boolean;
  selectedAcademicYear: string;
  academicYears: string[];
  isHomeroomTeacher: boolean;
  onClassChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onRefresh: () => void;
}

export default function FilterSection({
  selectedClass,
  availableClasses,
  classesLoading,
  selectedAcademicYear,
  academicYears,
  isHomeroomTeacher,
  onClassChange,
  onYearChange,
  onRefresh,
}: FilterSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-primary" />
          <span>Bộ lọc</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isHomeroomTeacher && (
            <div className="space-y-2">
              <Label>Năm học</Label>
              <Select
                value={selectedAcademicYear || ''}
                onValueChange={onYearChange}
              >
                <SelectTrigger className="w-full">
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
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Lớp
            </label>
            <Select
              value={selectedClass}
              onValueChange={onClassChange}
              disabled={classesLoading}
            >
              <SelectTrigger className="w-full flex items-center justify-between">
                <SelectValue
                  placeholder={
                    classesLoading
                      ? 'Đang tải lớp…'
                      : isHomeroomTeacher
                      ? 'Chọn lớp chủ nhiệm'
                      : 'Tất cả lớp'
                  }
                />
                {classesLoading && (
                  <span className="ml-2 inline-block w-3 h-3 border-2 border-transparent border-b-muted-foreground rounded-full animate-spin" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isHomeroomTeacher ? 'Chọn lớp chủ nhiệm' : 'Tất cả lớp'}
                </SelectItem>
                {availableClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classesLoading && (
              <p className="mt-1 text-xs text-muted-foreground">
                Đang tải lớp…
              </p>
            )}
          </div>

          <div className="flex items-end">
            <Button onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới dữ liệu
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
