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
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-primary" />
          <span>Bộ lọc</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isHomeroomTeacher ? (
          // For homeroom teachers: simplified view with only refresh button
          <div className="flex gap-2">
            <Button onClick={onRefresh} className="flex-shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới dữ liệu
            </Button>
            <p className="text-sm text-muted-foreground flex items-center">
              Dữ liệu sẽ tự động cập nhật theo lớp chủ nhiệm của bạn
            </p>
          </div>
        ) : (
          // For other users: full filter controls
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Năm học</Label>
              <Select
                value={selectedAcademicYear || ''}
                onValueChange={onYearChange}
              >
                <SelectTrigger className="w-full focus-visible:outline-none">
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
            <div className="space-y-2">
              <Label>Lớp</Label>
              <Select
                value={selectedClass}
                onValueChange={onClassChange}
                disabled={classesLoading}
              >
                <SelectTrigger className="w-full flex items-center justify-between focus-visible:outline-none">
                  <SelectValue
                    placeholder={
                      classesLoading ? 'Đang tải lớp…' : 'Tất cả lớp'
                    }
                  />
                  {classesLoading && (
                    <span className="ml-2 inline-block w-3 h-3 border-2 border-transparent border-b-muted-foreground rounded-full animate-spin" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Tất cả lớp
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

            <div className="space-y-2">
              <Label className="invisible">TÙY CHỌN</Label>
              <Button onClick={onRefresh} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới dữ liệu
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
