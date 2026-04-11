import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import api from "@/services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import logger from "@/utils/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";

const HomeroomDashboard = () => {
  const { user } = useContext(AuthContext);
  const [homeroomInfo, setHomeroomInfo] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [teacherClasses, setTeacherClasses] = useState([]); // Danh sách các lớp GV chủ nhiệm
  const [selectedClass, setSelectedClass] = useState(null); // class_name
  const [selectedClassId, setSelectedClassId] = useState(null); // id lớp
  const [students, setStudents] = useState([]);
  const [topAbsent, setTopAbsent] = useState([]);
  const [topLate, setTopLate] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // State cho modal xem tất cả học sinh
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(12); // Hiển thị 12 học sinh mỗi trang

  // Bootstrap tổng hợp cho Dashboard – thay thế chuỗi nhiều API
  const dashboardBootstrap = useCallback(
    async ({ ay, y, m, clsName, clsId } = {}) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (ay) params.set("academic_year", ay);
        if (y) params.set("year", String(y));
        if (m) params.set("month", String(m));
        if (clsName) params.set("class_name", clsName);
        if (clsId) params.set("class_id", String(clsId));
        const resp = await api.request(
          `/homeroom/dashboard/bootstrap${
            params.toString() ? `?${params.toString()}` : ""
          }`
        );
        if (resp.success && resp.data) {
          const {
            academic_years,
            classes,
            selected_class,
            students: studentRows,
            top_absent,
            top_late,
            homeroom_info,
          } = resp.data;
          if (Array.isArray(academic_years)) setAcademicYears(academic_years);
          if (!selectedAcademicYear && resp.data.year)
            setSelectedAcademicYear(
              resp.data.default_year || selectedAcademicYear
            );
          const uniqueClasses = Array.from(
            new Map((classes || []).map((c) => [c.class_name, c])).values()
          );
          setTeacherClasses(uniqueClasses);
          const sName =
            selected_class?.class_name || uniqueClasses[0]?.class_name || null;
          const sId = selected_class?.id || uniqueClasses[0]?.id || null;
          setSelectedClass(sName);
          setSelectedClassId(sId);
          setHomeroomInfo(homeroom_info || null);
          const mapped = (studentRows || []).map((r) => ({
            id: r.student_id,
            student_id: r.student_code,
            full_name: r.student_name,
            class_name: r.class_name,
            absent_count: r.absent_count,
            late_count: r.late_count,
            early_count: r.early_count,
          }));
          setStudents(mapped);
          const sortByCodeAsc = (arr) =>
            (arr || []).slice().sort((a, b) => {
              const aId = parseInt(a.student_code) || 0;
              const bId = parseInt(b.student_code) || 0;
              return aId - bId;
            });
          setTopAbsent(sortByCodeAsc(top_absent));
          setTopLate(sortByCodeAsc(top_late));
          // Stats tổng hợp từ rows
          setAttendanceStats({
            absent_count: mapped.reduce((s, x) => s + (x.absent_count || 0), 0),
            late_count: mapped.reduce((s, x) => s + (x.late_count || 0), 0),
            attendance_rate: 0,
          });
          setAttendanceRecords([]);
        }
      } catch (e) {
        logger.error("dashboard bootstrap error", e);
      } finally {
        setLoading(false);
      }
    },
    [selectedAcademicYear]
  );

  const fetchHomeroomData = useCallback(async () => {
    await dashboardBootstrap({
      ay: selectedAcademicYear,
      y: selectedYear,
      m: selectedMonth,
      clsName: selectedClass,
      clsId: selectedClassId,
    });
  }, [
    dashboardBootstrap,
    selectedAcademicYear,
    selectedYear,
    selectedMonth,
    selectedClass,
    selectedClassId,
  ]);

  useEffect(() => {
    fetchHomeroomData();
  }, [fetchHomeroomData]);

  // Tải lại khi thay đổi tham số chính
  useEffect(() => {
    if (selectedClass || selectedClassId) {
      dashboardBootstrap({
        ay: selectedAcademicYear,
        y: selectedYear,
        m: selectedMonth,
        clsName: selectedClass,
        clsId: selectedClassId,
      });
    }
  }, [
    dashboardBootstrap,
    selectedAcademicYear,
    selectedYear,
    selectedMonth,
    selectedClass,
    selectedClassId,
  ]);

  const handleViewAllStudents = () => {
    setShowAllStudents(true);
    setCurrentPage(1);
  };

  const handleCloseAllStudents = () => {
    setShowAllStudents(false);
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(students.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getAttendanceStatus = (student) => {
    if (!attendanceRecords || attendanceRecords.length === 0) return null;

    const record = attendanceRecords.find(
      (record) => record.student_id === student.id
    );

    return record ? record.status : null;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "absent":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "late":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Badge variant="success">Có mặt</Badge>;
      case "absent":
        return <Badge variant="destructive">Vắng mặt</Badge>;
      case "late":
        return <Badge variant="warning">Muộn</Badge>;
      default:
        return <Badge variant="outline">Chưa điểm danh</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Chủ Nhiệm
            </h1>
            <p className="mt-1 text-gray-600">
              {selectedClass
                ? `Lớp ${selectedClass}`
                : "Đang tải thông tin lớp..."}
            </p>
          </div>

          {/* Dropdown chọn lớp (chỉ hiển thị nếu giáo viên chủ nhiệm > 1 lớp) */}
          {academicYears.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Năm học</span>
              <Select
                value={selectedAcademicYear || ""}
                onValueChange={(v) => setSelectedAcademicYear(v)}
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
              <Select
                value={selectedClass || ""}
                onValueChange={(value) => {
                  setSelectedClass(value);
                  const found = teacherClasses.find(
                    (c) => c.class_name === value
                  );
                  setSelectedClassId(found?.id || null);
                }}
              >
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
              {/* Chọn tháng/năm thống kê */}
              <span className="text-sm text-gray-500">Tháng</span>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}
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
                onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng học sinh
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {students.length}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.late_count || 0}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.absent_count || 0}
                </p>
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
                  {attendanceStats?.attendance_rate
                    ? `${attendanceStats.attendance_rate}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Chọn ngày điểm danh</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Chọn ngày điểm danh"
            className="w-[160px]"
          />
        </CardContent>
      </Card>

      {/* Top vắng / Top muộn trong tháng */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top vắng nhiều nhất (tháng)</CardTitle>
            <CardDescription>
              Top 10 học sinh có số lần vắng cao nhất trong tháng{" "}
              {selectedMonth}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!topAbsent || topAbsent.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-2">
                {topAbsent.map((s, idx) => (
                  <div
                    key={s.student_id}
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
                    <Badge variant="destructive">{s.absent_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top đi muộn nhiều nhất (tháng)</CardTitle>
            <CardDescription>
              Top 10 học sinh có số lần đi muộn cao nhất trong tháng{" "}
              {selectedMonth}/{selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!topLate || topLate.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <div className="space-y-2">
                {topLate.map((s, idx) => (
                  <div
                    key={s.student_id}
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
                    <Badge variant="warning">{s.late_count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Học sinh lớp {homeroomInfo?.class_name}</CardTitle>
              <CardDescription>
                Danh sách học sinh – thống kê tháng {selectedMonth}/
                {selectedYear}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleViewAllStudents}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Xem tất cả</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentStudents.map((student) => {
              const status = getAttendanceStatus(student);
              return (
                <Card
                  key={student.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <span className="text-sm font-medium text-blue-600">
                            {student.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {student.full_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Mã: {student.student_id}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="destructive">
                              Vắng {student.absent_count ?? 0}
                            </Badge>
                            <Badge variant="warning">
                              Muộn {student.late_count ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(status)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-6 space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
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
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Students Modal */}
      <Dialog
        open={showAllStudents}
        onOpenChange={(open) => !open && handleCloseAllStudents()}
      >
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Tất cả học sinh lớp {homeroomInfo?.class_name}
            </DialogTitle>
            <DialogDescription>
              Tổng cộng {students.length} học sinh
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const status = getAttendanceStatus(student);
                return (
                  <Card
                    key={student.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                            <span className="text-sm font-medium text-blue-600">
                              {student.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {student.full_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Mã: {student.student_id}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="destructive">
                                Vắng {student.absent_count ?? 0}
                              </Badge>
                              <Badge variant="warning">
                                Muộn {student.late_count ?? 0}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {getStatusIcon(status)}
                      </div>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(status)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeroomDashboard;
