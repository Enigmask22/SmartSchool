import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AttendanceFiltersProps {
  loading?: boolean;
  selectedDate: string;
  selectedClass: string;
  selectedStatus: string;
  selectedAcademicYear: string;
  showFullList: boolean;
  classes: string[];
  academicYears: string[];
  classesLoading: boolean;
  onDateChange: (date: string) => void;
  onClassChange: (className: string) => void;
  onStatusChange: (status: string) => void;
  onAcademicYearChange: (year: string) => void;
  onViewModeChange: (showFull: boolean) => void;
  onSearchClick: () => void;
  onResetClick: () => void;
}

const AttendanceFilters = ({
  loading,
  selectedDate,
  selectedClass,
  selectedStatus,
  selectedAcademicYear,
  showFullList,
  classes,
  academicYears,
  classesLoading,
  onDateChange,
  onClassChange,
  onStatusChange,
  onAcademicYearChange,
  onViewModeChange,
  onSearchClick,
  onResetClick,
}: AttendanceFiltersProps) => {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bộ lọc</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Chế độ xem:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFullList}
                onChange={(e) => onViewModeChange(e.target.checked)}
                className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-primary"
              />
              <span className="text-sm font-medium">Hiển thị tất cả học sinh</span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          {isHomeroomTeacher?.() && (
            <div className="flex-1 max-w-[200px]">
              <label className="block mb-2 text-sm font-medium">Năm học</label>
              {loading ? (
                <Skeleton className="w-full h-10 rounded-md" />
              ) : (
                <Select
                  value={selectedAcademicYear || ''}
                  onValueChange={onAcademicYearChange}
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
              )}
            </div>
          )}

          <div className="flex-1 max-w-[160px]">
            <label className="block mb-2 text-sm font-medium">Ngày</label>
            {loading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <SimpleDatePicker
                value={selectedDate}
                onChange={onDateChange}
                placeholder="Chọn ngày"
                className="w-full"
              />
            )}
          </div>

          <div className="flex-1 max-w-[200px]">
            <label className="block mb-2 text-sm font-medium">Lớp</label>
            {loading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <Select value={selectedClass} onValueChange={onClassChange} disabled={classesLoading}>
                <SelectTrigger className="w-full flex items-center justify-between focus-visible:outline-none">
                  <SelectValue
                    placeholder={
                      classesLoading
                        ? 'Đang tải lớp…'
                        : isHomeroomTeacher?.()
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
                    {isHomeroomTeacher?.() ? 'Chọn lớp chủ nhiệm' : 'Tất cả lớp'}
                  </SelectItem>
                  {classes.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex-1 max-w-[200px]">
            <label className="block mb-2 text-sm font-medium">Trạng thái</label>
            {loading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full focus-visible:outline-none">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="present">Có mặt</SelectItem>
                  <SelectItem value="absent">Vắng mặt</SelectItem>
                  <SelectItem value="late">Muộn</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2">
            {loading ? (
              <>
                <Skeleton className="w-20 h-10 rounded-md" />
                <Skeleton className="w-24 h-10 rounded-md" />
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onResetClick}>
                  Đặt lại
                </Button>
                <Button onClick={onSearchClick}>Tìm kiếm</Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceFilters;
