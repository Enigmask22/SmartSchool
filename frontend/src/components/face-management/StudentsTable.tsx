import { Users, UserX, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserCheck, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip } from '@/components/ui/tooltip';
import { Student } from '@/hooks/face-management/useFaceManagement';

interface StudentsTableProps {
  students: Student[];
  currentPage: number;
  pageSize: number;
  selectedClass: string;
  isHomeroomTeacher: boolean;
  totalPages: number;
  totalStudents: number;
  onDeleteFace: (studentId: string, studentName: string) => Promise<boolean>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Helper to render truncated text with tooltip
function renderTruncatedCell(content: string, maxWidth: string = 'max-w-[150px]'): React.ReactNode {
  if (!content) return '-';
  return (
    <Tooltip content={content} side="top" >
      <span className={`block ${maxWidth} truncate cursor-help`}>
        {content}
      </span>
    </Tooltip>
  );
}

export default function StudentsTable({
  students,
  currentPage,
  pageSize,
  selectedClass,
  isHomeroomTeacher,
  totalPages,
  totalStudents,
  onDeleteFace,
  onPageChange,
  onPageSizeChange,
}: StudentsTableProps) {

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Users className="w-5 h-5 text-primary" />
              <span>Học sinh đã đăng ký khuôn mặt</span>
            </CardTitle>
            <CardDescription className="mt-2 text-xs">
              Danh sách học sinh có thể được nhận diện bằng AI
              {selectedClass &&
                selectedClass !== 'all' &&
                ` - Lớp ${selectedClass}`}
            </CardDescription>
          </div>
          {totalStudents > pageSize && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Số lượng/trang:
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value));
                }}
              >
                <SelectTrigger className="w-[70px] h-9 text-xs">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto border">
          <Table>
            <TableHeader className="bg-gray-50 border-b border-gray-200">
              <TableRow>
                <TableHead className="text-center relative py-3 font-semibold text-xs text-gray-700">
                  Mã HS
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
                <TableHead className="text-center relative py-3 font-semibold text-xs text-gray-700">
                  Họ tên
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
                <TableHead className="text-center relative py-3 font-semibold text-xs text-gray-700">
                  Lớp
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
                <TableHead className="text-center relative py-3 font-semibold text-xs text-gray-700">
                  Trạng thái khuôn mặt
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
                <TableHead className="text-center py-3 font-semibold text-xs text-gray-700">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {isHomeroomTeacher && !selectedClass ? (
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-12 h-12 text-gray-300" />
                        <div>
                          <h3 className="mb-1 text-sm font-medium text-gray-900">
                            Chọn lớp chủ nhiệm để xem dữ liệu
                          </h3>
                          <p className="text-xs text-gray-500">
                            Vui lòng chọn lớp từ bộ lọc phía trên
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <UserX className="w-12 h-12 text-gray-300" />
                        <div>
                          <h3 className="mb-1 text-sm font-medium text-gray-900">
                            Chưa có học sinh nào đăng ký khuôn mặt
                          </h3>
                          <p className="text-xs text-gray-500">
                            Hãy vào tab "Học sinh" để đăng ký khuôn mặt cho học sinh
                          </p>
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => (
                  <TableRow key={student.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                    <TableCell className="text-sm font-medium text-gray-900 relative">
                      {renderTruncatedCell(student.student_id, 'max-w-[80px]')}
                      <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 relative">
                      <div className="font-medium">{renderTruncatedCell(student.full_name, 'max-w-[150px]')}</div>
                      <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 relative">
                      <Badge variant="secondary" className="text-xs text-blue-700 bg-blue-50 border-blue-200 border whitespace-nowrap min-w-[60px] h-7 flex items-center justify-center">
                        {student.class_name}
                      </Badge>
                      <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 relative">
                      {student.face_samples_count &&
                      student.face_samples_count > 0 ? (
                        <Badge
                          variant="default"
                          className="text-xs text-green-800 bg-green-100 border-green-200 border whitespace-nowrap min-w-[120px] h-7 flex items-center justify-center"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
                          Đã đăng ký ({student.face_samples_count})
                        </Badge>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-xs text-red-800 bg-red-100 border-red-200 border whitespace-nowrap min-w-[100px] h-7 flex items-center justify-center"
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Chưa đăng ký
                        </Badge>
                      )}
                      <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-center">
                      {student.face_samples_count &&
                      student.face_samples_count > 0 ? (
                        <Button
                          onClick={() =>
                            onDeleteFace(student.id, student.full_name)
                          }
                          variant="destructive"
                          size="sm"
                          className="text-xs h-7 px-2"
                          title="Xóa khuôn mặt đã đăng ký"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Xóa
                        </Button>
                      ) : (
                        <span className="px-3 py-1 text-xs rounded text-gray-600 bg-gray-100 border border-gray-200 whitespace-nowrap inline-block">
                          Không có
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-gray-600">
                Hiển thị{' '}
                <span className="font-semibold text-gray-900">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                đến{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(currentPage * pageSize, totalStudents)}
                </span>{' '}
                trong tổng số{' '}
                <span className="font-semibold text-gray-900">
                  {totalStudents}
                </span>{' '}
                học sinh
              </div>

              <div className="flex items-center space-x-1.5">
                <Button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  <ChevronLeft className="w-3 h-3 mr-1" /> Trước
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => {
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 &&
                          pageNum <= currentPage + 1);

                      if (!showPage) {
                        if (
                          pageNum === currentPage - 2 ||
                          pageNum === currentPage + 2
                        ) {
                          return (
                            <span
                              key={pageNum}
                              className="px-2 text-xs text-muted-foreground"
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
                          onClick={() => onPageChange(pageNum)}
                          variant={
                            currentPage === pageNum ? 'default' : 'outline'
                          }
                          size="sm"
                          className="text-xs h-7 min-w-[28px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  Sau <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
