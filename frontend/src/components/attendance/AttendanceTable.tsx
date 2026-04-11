// React already imported by JSX transform
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AttendanceTableRow from './AttendanceTableRow';

interface Student {
  student_id: string;
  full_name: string;
  class_name: string;
}

interface AttendanceRecord {
  id: number | null;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  check_in_time?: string;
  check_out_time?: string;
  confidence_score?: number;
  notes?: string;
  students?: Student;
  leave_request_image?: string;
}

interface AttendanceTableProps {
  records: AttendanceRecord[]; // Pre-paginated records for display
  totalRecords: number; // Total count before pagination (for info display)
  totalPages: number; // Total pages (pre-calculated)
  loading: boolean;
  selectedDate: string;
  selectedClass: string;
  showFullList: boolean;
  page: number;
  pageSize: number;
  editingRecord: AttendanceRecord | null;
  editStatus: string;
  editNotes: string;
  updating: boolean;
  onEditRecord: (record: AttendanceRecord) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isEditingRecord: (record: AttendanceRecord) => boolean;
  onOpenLeaveRequest?: (record: AttendanceRecord) => void;
  isHomeroomTeacher?: () => boolean;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return dateString;
  }
};

const AttendanceTable = ({
  records,
  totalRecords,
  totalPages,
  loading,
  selectedDate,
  selectedClass,
  showFullList,
  page,
  pageSize,
  editStatus,
  editNotes,
  updating,
  onEditRecord,
  onCancelEdit,
  onSaveEdit,
  onStatusChange,
  onNotesChange,
  onPageChange,
  onPageSizeChange,
  isEditingRecord,
  onOpenLeaveRequest,
  isHomeroomTeacher,
}: AttendanceTableProps) => {
  // Note: records are already paginated by the parent component
  // No additional pagination calculation needed here

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>
            Danh sách điểm danh {selectedDate && `- ${formatDate(selectedDate)}`}
          </CardTitle>
          <CardDescription>
            {!selectedClass || selectedClass === 'all' ? (
              'Vui lòng chọn lớp để xem dữ liệu điểm danh'
            ) : showFullList ? (
              `Hiển thị ${records.length} học sinh (bao gồm cả học sinh chưa điểm danh) - Lớp ${selectedClass}`
            ) : (
              `Hiển thị ${records.length} bản ghi điểm danh - Lớp ${selectedClass}`
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Mã HS</TableHead>
                  <TableHead className="w-[150px]">Họ tên</TableHead>
                  <TableHead className="w-[80px]">Lớp</TableHead>
                  <TableHead className="w-[100px]">Giờ vào</TableHead>
                  <TableHead className="w-[100px]">Giờ ra</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Độ chính xác</TableHead>
                  <TableHead className="w-[150px]">Ghi chú</TableHead>
                  <TableHead className="w-[120px] text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && records.length === 0 ? (
                  // Show skeleton rows during loading
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={`skeleton-${idx}`}>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : !selectedClass || selectedClass === 'all' ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="h-12 w-12 text-muted-foreground/60" />
                        <p className="text-muted-foreground font-medium">Vui lòng chọn lớp để xem dữ liệu điểm danh</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      Không có dữ liệu điểm danh
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, idx) => (
                    <AttendanceTableRow
                      key={record.id ?? `record-${record.student_id}-${idx}`}
                      record={record}
                      index={idx}
                      isEditing={isEditingRecord(record)}
                      editStatus={editStatus}
                      editNotes={editNotes}
                      updating={updating}
                      onEdit={onEditRecord}
                      onCancel={onCancelEdit}
                      onSave={onSaveEdit}
                      onStatusChange={onStatusChange}
                      onNotesChange={onNotesChange}
                      onOpenLeaveRequest={onOpenLeaveRequest}
                      isHomeroomTeacher={isHomeroomTeacher?.()}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-muted/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  Hiển thị{' '}
                  <span className="font-semibold">
                    {(page - 1) * pageSize + 1}
                  </span>{' '}
                  đến{' '}
                  <span className="font-semibold">
                    {Math.min(page * pageSize, totalRecords)}
                  </span>{' '}
                  trong tổng số{' '}
                  <span className="font-semibold">{totalRecords}</span> bản ghi
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-muted-foreground">
                    Số lượng/trang:
                  </label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      onPageSizeChange(Number(value));
                      onPageChange(1);
                    }}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  ← Trước
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => {
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= page - 1 && pageNum <= page + 1);

                      if (!showPage) {
                        if (pageNum === page - 2 || pageNum === page + 2) {
                          return (
                            <span
                              key={pageNum}
                              className="px-2 text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Sau →
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card className="mt-6 shadow-md">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Dữ liệu điểm danh hôm nay'
              : `Dữ liệu điểm danh ngày ${formatDate(selectedDate)}`}
            {selectedClass && selectedClass !== 'all' && ` - Lớp ${selectedClass}`}
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default AttendanceTable;
