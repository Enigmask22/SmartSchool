// React already imported by JSX transform
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  records: AttendanceRecord[];
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
  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = records.slice(startIndex, endIndex);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách điểm danh {selectedDate && `- ${formatDate(selectedDate)}`}
          </CardTitle>
          <CardDescription>
            {showFullList
              ? `Hiển thị ${records.length} học sinh (bao gồm cả học sinh chưa điểm danh)`
              : `Hiển thị ${records.length} bản ghi điểm danh`}
            {selectedClass && ` - Lớp ${selectedClass}`}
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
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      {loading ? (
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary"></div>
                        </div>
                      ) : (
                        'Không có dữ liệu điểm danh'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record, idx) => (
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
      <Card className="mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Dữ liệu điểm danh hôm nay'
              : `Dữ liệu điểm danh ngày ${formatDate(selectedDate)}`}
            {selectedClass && ` - Lớp ${selectedClass}`}
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default AttendanceTable;
