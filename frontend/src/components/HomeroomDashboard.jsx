import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { SimpleDatePicker } from "./ui/simple-date-picker";
import logger from "../utils/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // State cho modal xem tất cả học sinh
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(12); // Hiển thị 12 học sinh mỗi trang

  const fetchAttendanceStats = useCallback(async () => {
    if (!selectedClass) return;

    try {
      const response = await api.request(
        `/homeroom/attendance/stats?target_date=${selectedDate}&class_name=${selectedClass}&academic_year=${selectedAcademicYear}`
      );
      if (response.success) {
        setAttendanceStats(response.data.stats);
      }
    } catch (error) {
      logger.error("Error fetching attendance stats:", error);
    }
  }, [selectedDate, selectedClass, selectedAcademicYear]);

  const fetchAttendanceRecords = useCallback(async () => {
    if (!selectedClass) return;

    try {
      // Sử dụng API getFullAttendanceList giống như AttendanceView
      const response = await api.getFullAttendanceList(
        selectedDate,
        selectedClass
      );
      if (response.success) {
        setAttendanceRecords(response.data || []);
      }
    } catch (error) {
      logger.error("Error fetching attendance records:", error);
    }
  }, [selectedDate, selectedClass]);

  const fetchHomeroomData = useCallback(async () => {
    try {
      setLoading(true);

      // Load năm học: danh sách + mặc định
      const [yearsResp, defaultYearResp] = await Promise.all([
        api.request("/homeroom/academic-years"),
        api.request("/homeroom/default-academic-year"),
      ]);
      if (yearsResp.success) setAcademicYears(yearsResp.data || []);
      const defaultYear = defaultYearResp.success ? defaultYearResp.data : "";
      const year =
        selectedAcademicYear || defaultYear || yearsResp.data?.[0] || "";
      if (!selectedAcademicYear) setSelectedAcademicYear(year);

      // Fetch danh sách lớp chủ nhiệm theo năm học
      const classesResponse = await api.request(
        `/homeroom/classes${
          year ? `?academic_year=${encodeURIComponent(year)}` : ""
        }`
      );
      if (classesResponse.success) {
        // Deduplicate classes by class_name
        const uniqueClasses = Array.from(
          new Map(
            (classesResponse.data || []).map((cls) => [cls.class_name, cls])
          ).values()
        );
        setTeacherClasses(uniqueClasses);

        // Nếu lớp hiện tại không thuộc năm học đang chọn, chọn lớp đầu tiên của danh sách mới
        const currentInList = uniqueClasses.find(
          (c) => c.class_name === selectedClass
        );
        if (!selectedClass || !currentInList) {
          const first = uniqueClasses[0] || null;
          setSelectedClass(first ? first.class_name : null);
          setSelectedClassId(first ? first.id : null);
        } else {
          // Đồng bộ lại id phòng trường hợp dữ liệu thay đổi
          setSelectedClassId(currentInList.id);
        }
      }

      // Không tải dashboard data ở đây để tránh lặp; effect riêng sẽ gọi khi có lớp/ngày
    } catch (error) {
      logger.error("Error fetching homeroom data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    selectedClass,
    selectedAcademicYear,
    fetchAttendanceStats,
    fetchAttendanceRecords,
  ]);

  useEffect(() => {
    fetchHomeroomData();
  }, [fetchHomeroomData]);

  // Chỉ gọi API tổng hợp nhanh khi thay đổi lớp/ngày
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (!selectedClass) return;
        setLoading(true);
        const infoResponse = await api.request("/homeroom/info");
        if (infoResponse.success) setHomeroomInfo(infoResponse.data);

        const found = teacherClasses.find(
          (c) => c.class_name === selectedClass
        );
        const classId = found?.id;
        const dashResp = await api.request(
          `/homeroom/dashboard/data?target_date=${selectedDate}` +
            (classId
              ? `&class_id=${classId}`
              : `&class_name=${encodeURIComponent(
                  selectedClass
                )}&academic_year=${encodeURIComponent(selectedAcademicYear)}`)
        );
        if (dashResp.success) {
          const rows = dashResp.data?.students || [];
          const mappedStudents = rows.map((r) => ({
            id: r.student_id,
            student_id: r.student_code,
            full_name: r.student_name,
            class_name: r.class_name,
          }));
          setStudents(mappedStudents);
          const mappedRecords = rows.map((r) => ({
            student_id: r.student_id,
            status: r.status,
            check_in_time: r.check_in_time,
            check_out_time: r.check_out_time,
            method: r.method,
            confidence_score: r.confidence_score,
            notes: r.notes,
          }));
          setAttendanceRecords(mappedRecords);
          setAttendanceStats(dashResp.data?.stats || null);
        }
      } catch (err) {
        logger.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (selectedClass) loadDashboardData();
  }, [selectedClass, selectedDate, selectedAcademicYear, teacherClasses]);

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
                  Có mặt hôm nay
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {attendanceStats?.present_count || 0}
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
                <p className="text-sm font-medium text-gray-600">Vắng mặt</p>
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

      {/* Students Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Học sinh lớp {homeroomInfo?.class_name}</CardTitle>
              <CardDescription>
                Danh sách học sinh và trạng thái điểm danh ngày {selectedDate}
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
