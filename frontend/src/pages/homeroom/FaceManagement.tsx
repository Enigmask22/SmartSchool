import React from 'react';
import {
  Users,
  Camera,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Upload,
  Download,
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
import { Label } from '@/components/ui/label';
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
import { useFaceManagement, AIStatus, Student } from '@/hooks/useFaceManagement';

/**
 * AI Status Card Component
 */
interface AIStatusCardProps {
  aiStatus: AIStatus | null;
  onReloadModels: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

const AIStatusCard: React.FC<AIStatusCardProps> = ({
  aiStatus,
  onReloadModels,
  onRefresh,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        <span>Trạng thái hệ thống AI</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {aiStatus ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center mb-2 space-x-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                <div className="text-2xl font-bold text-green-600">
                  {aiStatus.service_status === 'active'
                    ? 'Hoạt động'
                    : 'Không hoạt động'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Trạng thái service
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {aiStatus.service_name}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center mb-2 space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">
                  {aiStatus.database_encodings || 0}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Khuôn mặt đã đăng ký
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Database: {aiStatus.database_encodings}, Local:{' '}
                {aiStatus.local_ai_encodings}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center mb-2 space-x-2">
                <Camera className="w-5 h-5 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">
                  {aiStatus.accuracy || 'N/A'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Độ chính xác</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {aiStatus.similarity_threshold
                  ? `Threshold: ${aiStatus.similarity_threshold}`
                  : 'Advanced AI'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center mb-2 space-x-2">
                {aiStatus.sync_status === 'synced' ? (
                  <UserCheck className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                )}
                <div className="text-2xl font-bold text-orange-600">
                  {aiStatus.sync_status === 'synced'
                    ? 'Đồng bộ'
                    : 'Chưa đồng bộ'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Trạng thái đồng bộ
              </div>
              <div className="mt-1 text-xs capitalize text-muted-foreground">
                {aiStatus.sync_status?.replace('_', ' ')}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-muted-foreground">
          Không thể tải thông tin AI status
        </div>
      )}

      <div className="flex mt-4 space-x-3">
        <Button onClick={onReloadModels} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Models
        </Button>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>
    </CardContent>
  </Card>
);

/**
 * Filter Section Component
 */
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

const FilterSection: React.FC<FilterSectionProps> = ({
  selectedClass,
  availableClasses,
  classesLoading,
  selectedAcademicYear,
  academicYears,
  isHomeroomTeacher,
  onClassChange,
  onYearChange,
  onRefresh,
}) => (
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
            <Select value={selectedAcademicYear || ''} onValueChange={onYearChange}>
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

/**
 * Students Table Component
 */
interface StudentsTableProps {
  students: Student[];
  currentPage: number;
  pageSize: number;
  selectedClass: string;
  isHomeroomTeacher: boolean;
  totalPages: number;
  onDeleteFace: (studentId: string, studentName: string) => Promise<boolean>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  currentPage,
  pageSize,
  selectedClass,
  isHomeroomTeacher,
  totalPages,
  onDeleteFace,
  onPageChange,
  onPageSizeChange,
}) => {
  // Get paginated students
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = students.slice(startIndex, endIndex);

  return (
    <Card>
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
          {students.length > pageSize && (
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
              paginatedStudents.map((student) => (
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
                    {student.face_samples_count && student.face_samples_count > 0 ? (
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
                    {student.face_samples_count && student.face_samples_count > 0 ? (
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
                  {Math.min(currentPage * pageSize, students.length)}
                </span>{' '}
                trong tổng số{' '}
                <span className="font-semibold text-foreground">
                  {students.length}
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
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
};

/**
 * Instructions Component
 */
const Instructions: React.FC = () => (
  <Card className="mt-6">
    <CardContent className="p-6">
      <h4 className="mb-2 text-lg font-semibold text-primary">
        Hướng dẫn sử dụng
      </h4>
      <div className="space-y-1 text-muted-foreground">
        <p>
          • Để đăng ký khuôn mặt cho học sinh, vào tab "Học sinh" và bấm nút
          "Đăng ký mặt"
        </p>
        <p>
          • Hệ thống sẽ mở camera để chụp ảnh khuôn mặt và lưu vào database
        </p>
        <p>
          • Sau khi đăng ký, học sinh có thể được nhận diện tự động trong
          chức năng điểm danh
        </p>
        <p>
          • Sử dụng nút "Reload Models" để cập nhật lại mô hình AI sau khi
          có thay đổi
        </p>
      </div>
    </CardContent>
  </Card>
);

/**
 * Main FaceManagement Component
 */
interface FaceManagementProps {
  isHomeroom?: boolean;
}

const FaceManagement: React.FC<FaceManagementProps> = ({ isHomeroom = false }) => {
  const {
    aiStatus,
    students,
    loading,
    error,
    selectedClass,
    availableClasses,
    academicYears,
    selectedAcademicYear,
    classesLoading,
    currentPage,
    pageSize,
    updateState,
    faceBootstrap,
    deleteFaceEncoding,
    reloadModels,
    fetchData,
    getTotalPages,
    isHomeroomTeacher,
  } = useFaceManagement();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="space-y-2">
        <h2 className="flex items-center space-x-2 text-3xl font-bold text-gray-900">
          <Camera className="w-8 h-8 text-primary" />
          <span>Quản lý khuôn mặt AI</span>
        </h2>
        <p className="text-gray-600">
          Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký
        </p>
        {error && (
          <div className="flex items-center p-3 mt-2 space-x-2 text-red-700 bg-red-100 border border-red-400 rounded">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* AI Status Card */}
      <AIStatusCard
        aiStatus={aiStatus}
        onReloadModels={reloadModels}
        onRefresh={fetchData}
      />

      {/* Filter Section */}
      <FilterSection
        selectedClass={selectedClass}
        availableClasses={availableClasses}
        classesLoading={classesLoading}
        selectedAcademicYear={selectedAcademicYear}
        academicYears={academicYears}
        isHomeroomTeacher={isHomeroomTeacher()}
        onClassChange={(value) => {
          updateState({ selectedClass: value });
          faceBootstrap({
            year: selectedAcademicYear,
            className: value,
          });
        }}
        onYearChange={(v) => {
          updateState({ selectedAcademicYear: v });
          faceBootstrap({ year: v });
        }}
        onRefresh={() => {
          fetchData();
        }}
      />

      {/* Students Table */}
      <StudentsTable
        students={students}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedClass={selectedClass}
        isHomeroomTeacher={isHomeroomTeacher()}
        totalPages={getTotalPages()}
        onDeleteFace={deleteFaceEncoding}
        onPageChange={(page) => updateState({ currentPage: page })}
        onPageSizeChange={(size) => {
          updateState({ pageSize: size, currentPage: 1 });
        }}
      />

      {/* Instructions */}
      <Instructions />
    </div>
  );
};

export default FaceManagement;
