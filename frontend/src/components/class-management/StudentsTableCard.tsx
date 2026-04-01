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
} from 'lucide-react';

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
import { StudentData } from '@/hooks/class-management/useClassManagement';

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
  showInactiveStudents: boolean;
  setShowInactiveStudents: (value: boolean) => void;
  initialLoading?: boolean;
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
  showInactiveStudents,
  setShowInactiveStudents,
  initialLoading = false,
}: StudentsTableCardProps) => {
  // Show loading skeleton during initial data load or when no class selected but data loading
  if (initialLoading || (loadingClassData && !selectedClassForManagement && !error && paginatedStudents.length === 0)) {
    return (
      <div className="p-6 transition-shadow duration-200 bg-white border-2 shadow-md rounded-2xl border-gray-100 hover:shadow-lg">
        {/* Header */}
        <div className="flex items-start gap-3 pb-4 mb-4 border-b border-gray-200">
          <div className="flex items-center justify-center bg-blue-100 w-12 h-12 rounded-xl flex-shrink-0">
            <Users className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">Danh sách học sinh</h3>
            <p className="text-xs text-gray-500 mt-1">Đang tải dữ liệu...</p>
          </div>
        </div>

        {/* Skeleton Table */}
        <div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-gray-600 uppercase">MÃ HS</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase">HỌ TÊN</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase">LỚP HIỆN TẠI</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase">TRẠNG THÁI KHUÔN MẶT</TableHead>
                <TableHead className="text-xs font-semibold text-gray-600 uppercase">HÀNH ĐỘNG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <TableCell>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Show empty state if no class selected
  if (!selectedClassForManagement) {
    return (
      <div className="p-6 transition-shadow duration-200 bg-white border-2 shadow-md rounded-2xl border-gray-50 hover:shadow-lg">
        {/* Header */}
        <div className="flex items-start gap-3 pb-6 mb-6 border-b border-gray-200">
          <div className="flex items-center justify-center bg-blue-100 w-12 h-12 rounded-xl flex-shrink-0">
            <Users className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">Danh sách học sinh</h3>
            <p className="text-xs text-gray-500 mt-1">Chọn lớp học để xem danh sách học sinh</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="py-16 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl bg-blue-100">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <p className="font-medium text-gray-500 mb-1">
            Chưa chọn lớp học
          </p>
          <p className="text-sm text-gray-400">
            Vui lòng chọn một lớp học từ phần bộ lọc trên để xem danh sách học sinh
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 transition-shadow duration-200 bg-white border-2 shadow-md rounded-2xl border-gray-100 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-gray-200">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center justify-center bg-blue-100 w-12 h-12 rounded-xl flex-shrink-0">
            <Users className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">Danh sách học sinh</h3>
            <p className="text-xs text-gray-500 mt-1">{totalStudents} học sinh {searchTerm && `(tìm kiếm: "${searchTerm}")`}</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadStudentTemplate}
            size="sm"
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            <span>Tải template</span>
          </Button>
          <Button
            variant="outline"
            asChild
            size="sm"
            className="flex items-center gap-1"
          >
            <label className="cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Nhập</span>
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
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </Button>
          <Button
            variant="outline"
            onClick={onMoveClass}
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Chuyển</span>
          </Button>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="py-2 pl-10 pr-4 text-sm"
          />
        </div>

        {/* Show Inactive Students Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-inactive"
            checked={showInactiveStudents}
            onChange={(e) => setShowInactiveStudents(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 bg-background border-gray-300 focus:ring-2 focus:ring-blue-300 focus:ring-offset-0 cursor-pointer"
          />
          <label
            htmlFor="show-inactive"
            className="text-sm font-medium text-gray-700 cursor-pointer whitespace-nowrap"
          >
            Hiển thị học sinh đã xóa
          </label>
        </div>
      </div>
      {loadingClassData ? (
        <div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead>MÃ HS</TableHead>
                <TableHead>HỌ TÊN</TableHead>
                  <TableHead>LỚP HIỆN TẠI</TableHead>
                  <TableHead>TRẠNG THÁI KHUÔN MẶT</TableHead>
                <TableHead>HÀNH ĐỘNG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <TableCell>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl bg-red-100">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="mb-4 font-semibold text-red-600">{error}</p>
          <Button onClick={loadClassStudents} variant="outline">Thử lại</Button>
        </div>
      ) : paginatedStudents.length === 0 ? (
        <div className="py-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-100">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-500">
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
    </div>
  );
};

export default StudentsTableCard;
