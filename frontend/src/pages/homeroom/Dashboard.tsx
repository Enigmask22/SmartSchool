/**
 * HomeroomDashboard.tsx - Homeroom Dashboard Page
 * 
 * Refactored from HomeroomDashboard.jsx:
 * - Extracted state management to useHomeroomDashboard hook
 * - Added TypeScript types
 * - Organized into sub-components
 * 
 * Features:
 * - Multi-filter interface (academic year, class, month, year)
 * - Student attendance statistics
 * - Top absent/late students
 * - Paginated student grid
 * - All students modal with full list
 */

import React from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  GraduationCap,
} from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useHomeroomDashboard,
  StudentData,
  TopAbsentLateStudent,
} from '@/hooks/useHomeroomDashboard';

/**
 * Header Component
 */
interface HeaderProps {
  selectedClass: string | null;
  academicYears: string[];
  selectedAcademicYear: string;
  onAcademicYearChange: (year: string) => void;
  teacherClasses: any[];
  selectedClassValue: string | null;
  onClassChange: (classname: string) => void;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedClass,
  academicYears,
  selectedAcademicYear,
  onAcademicYearChange,
  teacherClasses,
  selectedClassValue,
  onClassChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
}) => (
  <div className="space-y-3">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Chủ Nhiệm</h1>
        <p className="mt-1 text-gray-600">
          {selectedClass ? `Lớp ${selectedClass}` : 'Đang tải thông tin lớp...'}
        </p>
      </div>

      {academicYears.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Năm học</span>
          <Select
            value={selectedAcademicYear || ''}
            onValueChange={onAcademicYearChange}
          >
            <SelectTrigger className="min-w-[160px]">
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

      {teacherClasses.length > 0 && (
        <div className="flex items-center gap-3">
          <GraduationCap className="flex-shrink-0 w-5 h-5 text-gray-500" />
          <Select value={selectedClassValue || ''} onValueChange={onClassChange}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherClasses.map((classInfo) => (
                <SelectItem
                  key={classInfo.class_name}
                  value={classInfo.class_name}
                >
                  Lớp {classInfo.class_name} - {classInfo.grade} (
                  {classInfo.academic_year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-gray-500">Tháng</span>
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => onMonthChange(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-gray-500">Năm</span>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => onYearChange(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                new Date().getFullYear() - 1,
                new Date().getFullYear(),
                new Date().getFullYear() + 1,
              ].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  </div>
);

/**
 * Statistics Cards Component
 */
interface StatsCardsProps {
  studentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  studentCount,
  lateCount,
  absentCount,
  attendanceRate,
}) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Tổng học sinh</p>
            <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">
              Tổng số lần muộn (tháng)
            </p>
            <p className="text-2xl font-bold text-gray-900">{lateCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <UserX className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">
              Tổng số lần vắng (tháng)
            </p>
            <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">
              Tỷ lệ điểm danh
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {attendanceRate}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Top Absent/Late Students Component
 */
interface TopStudentsProps {
  title: string;
  description: string;
  students: TopAbsentLateStudent[];
  badgeVariant: 'destructive' | 'warning';
  countKey: 'absent_count' | 'late_count';
  selectedMonth: number;
  selectedYear: number;
}

const TopStudentsCard: React.FC<TopStudentsProps> = ({
  title,
  description,
  students,
  badgeVariant,
  countKey,
  selectedMonth,
  selectedYear,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>
        {description} {selectedMonth}/{selectedYear}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {!students || students.length === 0 ? (
        <div className="text-sm text-muted-foreground">Không có dữ liệu</div>
      ) : (
        <div className="space-y-2">
          {students.map((s, idx) => (
            <div
              key={s.student_code}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 text-xs font-bold text-center rounded-full bg-muted">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-medium">{s.student_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.student_code} • Lớp {s.class_name}
                  </div>
                </div>
              </div>
              <Badge variant={badgeVariant}>
                {s[countKey as keyof TopAbsentLateStudent]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Student Card Component
 */
interface StudentCardProps {
  student: StudentData;
  onView?: () => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student }) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
            <span className="text-sm font-medium text-blue-600">
              {student.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{student.full_name}</h4>
            <p className="text-sm text-gray-500">Mã: {student.student_id}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="destructive">
                Vắng {student.absent_count ?? 0}
              </Badge>
              <Badge variant="warning">Muộn {student.late_count ?? 0}</Badge>
            </div>
          </div>
        </div>
        <CheckCircle className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="success">Có mặt</Badge>
      </div>
    </CardContent>
  </Card>
);

/**
 * Students Grid Component
 */
interface StudentsGridProps {
  currentStudents: StudentData[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onViewAll: () => void;
  className: string;
  selectedMonth: number;
  selectedYear: number;
}

const StudentsGrid: React.FC<StudentsGridProps> = ({
  currentStudents,
  totalPages,
  currentPage,
  onPageChange,
  onViewAll,
  className,
  selectedMonth,
  selectedYear,
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Học sinh lớp {className}</CardTitle>
          <CardDescription>
            Danh sách học sinh – thống kê tháng {selectedMonth}/{selectedYear}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={onViewAll}
          className="flex items-center space-x-2"
        >
          <Eye className="w-4 h-4" />
          <span>Xem tất cả</span>
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentStudents.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Trang {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * All Students Modal Component
 */
interface AllStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentData[];
  className: string;
}

const AllStudentsModal: React.FC<AllStudentsModalProps> = ({
  open,
  onOpenChange,
  students,
  className,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-6xl max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>Tất cả học sinh lớp {className}</DialogTitle>
        <DialogDescription>Tổng cộng {students.length} học sinh</DialogDescription>
      </DialogHeader>

      <div className="overflow-y-auto max-h-[60vh]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

/**
 * HomeroomDashboard Component
 */
const HomeroomDashboard: React.FC = () => {
  const {
    loading,
    homeroomInfo,
    academicYears,
    selectedAcademicYear,
    teacherClasses,
    selectedClass,
    selectedClassId,
    students,
    topAbsent,
    topLate,
    attendanceStats,
    selectedYear,
    selectedMonth,
    showAllStudents,
    currentPage,
    studentsPerPage,
    totalPages,
    currentStudents,
    setSelectedAcademicYear,
    setSelectedClass,
    setSelectedClassId,
    setSelectedYear,
    setSelectedMonth,
    setShowAllStudents,
    handlePageChange,
  } = useHomeroomDashboard();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    const found = teacherClasses.find((c) => c.class_name === value);
    setSelectedClassId(found?.id || null);
  };

  return (
    <div className="space-y-6">
      <Header
        selectedClass={selectedClass}
        academicYears={academicYears}
        selectedAcademicYear={selectedAcademicYear}
        onAcademicYearChange={setSelectedAcademicYear}
        teacherClasses={teacherClasses}
        selectedClassValue={selectedClass}
        onClassChange={handleClassChange}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      <StatsCards
        studentCount={students.length}
        lateCount={attendanceStats?.late_count || 0}
        absentCount={attendanceStats?.absent_count || 0}
        attendanceRate={attendanceStats?.attendance_rate || 0}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopStudentsCard
          title="Top vắng nhiều nhất (tháng)"
          description="Top 10 học sinh có số lần vắng cao nhất trong tháng"
          students={topAbsent}
          badgeVariant="destructive"
          countKey="absent_count"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
        <TopStudentsCard
          title="Top đi muộn nhiều nhất (tháng)"
          description="Top 10 học sinh có số lần đi muộn cao nhất trong tháng"
          students={topLate}
          badgeVariant="warning"
          countKey="late_count"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>

      <StudentsGrid
        currentStudents={currentStudents}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onViewAll={() => setShowAllStudents(true)}
        className={selectedClass || ''}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      <AllStudentsModal
        open={showAllStudents}
        onOpenChange={setShowAllStudents}
        students={students}
        className={selectedClass || ''}
      />
    </div>
  );
};

export default HomeroomDashboard;
