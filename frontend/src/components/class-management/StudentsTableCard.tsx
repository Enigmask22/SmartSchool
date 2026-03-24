import {
  Download,
  Upload,
  Plus,
  RefreshCw,
  Users,
  AlertCircle,
  Loader2,
  Trash2,
  Edit,
  Search,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

interface StudentData {
  id: number;
  full_name: string;
  student_id: string;
  email: string;
  phone: string;
  received_email?: string;
  class_name: string;
  grade: string | number;
  date_of_birth: string;
  address: string;
  parent_contacts: unknown[];
  gender: string;
  is_active: boolean;
  face_samples_count?: number;
}

interface StudentsTableCardProps {
  selectedClassForManagement: string | null;
  loadingClassData: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  paginatedStudents: StudentData[];
  totalStudents: number;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  classManagementPageSize: number;
  setClassManagementPageSize: (value: number) => void;
  totalPages: number;
  selectedStudentIds: number[];
  setSelectedStudentIds: (value: number[]) => void;
  restoreLoading: boolean;
  downloadStudentTemplate: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddStudent: () => void;
  onMoveClass: () => void;
  loadClassStudents: () => void;
  handleEditStudent: (student: StudentData) => void;
  handleDeleteStudent: (id: number) => void;
  handleRestore: (student: StudentData) => void;
  handlePermanentDeleteStudent: (id: number, name: string) => void;
}

const StudentsTableCard = ({
  selectedClassForManagement,
  loadingClassData,
  error,
  searchTerm,
  setSearchTerm,
  paginatedStudents,
  totalStudents,
  currentPage,
  setCurrentPage,
  classManagementPageSize,
  setClassManagementPageSize,
  totalPages,
  selectedStudentIds,
  setSelectedStudentIds,
  restoreLoading,
  downloadStudentTemplate,
  handleFileUpload,
  onAddStudent,
  onMoveClass,
  loadClassStudents,
  handleEditStudent,
  handleDeleteStudent,
  handleRestore,
  handlePermanentDeleteStudent,
}: StudentsTableCardProps) => {
  if (!selectedClassForManagement) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5" />
              <span>Danh sách học sinh</span>
            </CardTitle>
            <CardDescription>
              {totalStudents} học sinh {searchTerm && `(tìm kiếm: "${searchTerm}")`}
            </CardDescription>

            {/* Search Bar */}
            <div className="max-w-md mt-4">
              <div className="relative">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm theo tên, mã học sinh hoặc lớp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-2 pl-10 pr-4"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={downloadStudentTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Tải template</span>
            </Button>

            <Button
              variant="outline"
              asChild
              className="flex items-center space-x-2"
            >
              <label className="cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Nhập từ file</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </Button>

            <Button
              onClick={onAddStudent}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm học sinh</span>
            </Button>
            <Button
              variant="outline"
              onClick={onMoveClass}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Chuyển lớp</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loadingClassData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 font-medium text-muted-foreground">
              Đang tải dữ liệu...
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="mb-4 font-medium text-destructive">{error}</p>
            <Button onClick={loadClassStudents}>Thử lại</Button>
          </div>
        ) : paginatedStudents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">
              Chưa có học sinh nào trong lớp này
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MÃ HS</TableHead>
                  <TableHead>HỌ TÊN</TableHead>
                  <TableHead>LỚP HIỆN TẠI</TableHead>
                  <TableHead>TRẠNG THÁI KHUÔN MẶT</TableHead>
                  <TableHead>HÀNH ĐỘNG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          setSelectedStudentIds(
                            e.target.checked
                              ? [...selectedStudentIds, student.id]
                              : selectedStudentIds.filter(
                                  (id) => id !== student.id,
                                ),
                          );
                        }}
                      />
                      {student.student_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary">
                          <span className="text-sm font-bold text-primary-foreground">
                            {student.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span>{student.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>
                      {student.face_samples_count &&
                      student.face_samples_count > 0 ? (
                        <Badge
                          variant="default"
                          className="text-green-800 bg-green-100"
                        >
                          ✓ Đã đăng ký
                        </Badge>
                      ) : (
                        <Badge variant="destructive">✗ Chưa đăng ký</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {student.is_active === false ? (
                          <>
                            <Button
                              onClick={() => handleRestore(student)}
                              disabled={restoreLoading}
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1 text-green-600 hover:text-green-600 hover:bg-green-50 hover:border-green-200"
                              title="Khôi phục"
                            >
                              {restoreLoading ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Khôi phục...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Khôi phục</span>
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() =>
                                handlePermanentDeleteStudent(
                                  student.id,
                                  student.full_name,
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1 text-red-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa vĩnh viễn</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleEditStudent(student)}
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Sửa</span>
                            </Button>
                            <Button
                              onClick={() => handleDeleteStudent(student.id)}
                              variant="outline"
                              size="sm"
                              className="flex items-center space-x-1 text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                              title="Xóa tạm thời"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t bg-muted/50 mt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị{' '}
                      <span className="font-semibold">
                        {(currentPage - 1) * classManagementPageSize + 1}
                      </span>{' '}
                      đến{' '}
                      <span className="font-semibold">
                        {Math.min(
                          currentPage * classManagementPageSize,
                          totalStudents,
                        )}
                      </span>{' '}
                      trong tổng số{' '}
                      <span className="font-semibold">{totalStudents}</span>{' '}
                      học sinh
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm">Số lượng/trang:</Label>
                      <Select
                        value={String(classManagementPageSize)}
                        onValueChange={(value) => {
                          setClassManagementPageSize(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[70px]">
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
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      ← Trước
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: totalPages },
                        (_, i) => i + 1,
                      ).map((pageNum) => {
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
                            variant={
                              currentPage === pageNum ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Sau →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentsTableCard;
