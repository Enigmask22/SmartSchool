import { Users, UserX, Trash2 } from 'lucide-react';
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
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Học sinh đã đăng ký khuôn mặt</span>
            </CardTitle>
            <CardDescription>
              Danh sách học sinh có thể được nhận diện bằng AI
              {selectedClass &&
                selectedClass !== 'all' &&
                ` - Lớp ${selectedClass}`}
            </CardDescription>
          </div>
          {totalStudents > pageSize && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted-foreground">
                Số lượng/trang:
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value));
                }}
              >
                <SelectTrigger className="w-[70px]">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Mã HS</TableHead>
              <TableHead className="w-48">Họ tên</TableHead>
              <TableHead className="w-24">Lớp</TableHead>
              <TableHead className="w-48">Trạng thái khuôn mặt</TableHead>
              <TableHead className="w-32 text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  {isHomeroomTeacher && !selectedClass ? (
                    <div>
                      <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="mb-2 text-lg font-medium text-gray-900">
                        Chọn lớp chủ nhiệm để xem dữ liệu
                      </h3>
                      <p className="text-gray-500">
                        Vui lòng chọn lớp từ dropdown phía trên
                      </p>
                    </div>
                  ) : (
                    <div>
                      <UserX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="mb-2 text-lg font-medium text-gray-900">
                        Chưa có học sinh nào đăng ký khuôn mặt
                      </h3>
                      <p className="text-gray-500">
                        Hãy vào tab "Học sinh" để đăng ký khuôn mặt cho học
                        sinh
                      </p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="text-sm font-medium text-gray-900 truncate">
                    {student.student_id}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900 truncate">
                    <div className="font-medium">{student.full_name}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    <Badge variant="secondary" className="text-xs">
                      {student.class_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {student.face_samples_count &&
                    student.face_samples_count > 0 ? (
                      <Badge
                        variant="default"
                        className="text-green-800 bg-green-100"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Đã đăng ký ({student.face_samples_count} mẫu)
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="text-red-800 bg-red-100"
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Chưa đăng ký
                      </Badge>
                    )}
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
                        className="text-xs"
                        title="Xóa khuôn mặt đã đăng ký"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Xóa
                      </Button>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded text-muted-foreground bg-muted">
                        Không có dữ liệu
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-muted/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Hiển thị{' '}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                đến{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, totalStudents)}
                </span>{' '}
                trong tổng số{' '}
                <span className="font-semibold text-foreground">
                  {totalStudents}
                </span>{' '}
                học sinh
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  ← Trước
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
                          onClick={() => onPageChange(pageNum)}
                          variant={
                            currentPage === pageNum ? 'default' : 'outline'
                          }
                          size="sm"
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
                >
                  Sau →
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
