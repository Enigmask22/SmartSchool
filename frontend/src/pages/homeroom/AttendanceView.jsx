import React, { useState, useEffect, useContext } from "react";
import ApiService from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import logger from "@/utils/logger";

const AttendanceView = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [homeroomClasses, setHomeroomClasses] = useState([]); // objects when homeroom teacher
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // total computed from attendanceRecords.length

  // Edit states
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // View mode toggle
  const [showFullList, setShowFullList] = useState(true);

  useEffect(() => {
    if (bootstrapLoading) return;
    loadAttendanceData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDate,
    selectedClass,
    selectedStatus,
    page,
    showFullList,
    bootstrapLoading,
  ]);

  // Load bootstrap when user changes (role-based)
  useEffect(() => {
    if (isHomeroomTeacher()) {
      attendanceBootstrap({ date: selectedDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Đổi năm học: đã gọi attendanceBootstrap trực tiếp trong onValueChange

  // Initial load with attendance bootstrap
  useEffect(() => {
    const run = async () => {
      if (!isHomeroomTeacher()) return;
      await attendanceBootstrap({ date: selectedDate });
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attendanceBootstrap = async ({ year, date, className } = {}) => {
    try {
      setBootstrapLoading(true);
      setClassesLoading(true);
      const params = new URLSearchParams();
      if (year) params.set("academic_year", year);
      if (date) params.set("target_date", date);
      if (className) params.set("class_name", className);
      const url = `/homeroom/attendance/bootstrap${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const resp = await ApiService.request(url);
      if (resp.success && resp.data) {
        const {
          academic_years,
          year: resolvedYear,
          classes: cls,
          selected_class,
          records,
          stats,
        } = resp.data;
        if (Array.isArray(academic_years)) setAcademicYears(academic_years);
        if (!selectedAcademicYear && resolvedYear)
          setSelectedAcademicYear(resolvedYear);
        setHomeroomClasses(Array.isArray(cls) ? cls : []);
        const classNames = (cls || [])
          .map((c) => c.class_name)
          .filter(Boolean)
          .sort();
        setClasses(classNames);
        const exists =
          selected_class?.class_name &&
          classNames.includes(selected_class.class_name);
        setSelectedClass(
          exists ? selected_class.class_name : classNames[0] || "all"
        );
        // Attendance data + stats
        setAttendanceRecords(records || []);
        setStats(stats || null);
      }
    } catch (e) {
      logger.error("attendance bootstrap error", e);
    } finally {
      setClassesLoading(false);
      setBootstrapLoading(false);
    }
  };

  // loadClasses: đã thay thế hoàn toàn bằng attendanceBootstrap

  const loadAttendanceData = async () => {
    setLoading(true);
    // Clear previous data và error state để tránh duplicate
    setAttendanceRecords([]);
    setError(null);
    setSuccessMessage(null);

    logger.debug("🔍 Loading attendance data...", {
      selectedDate,
      selectedClass,
      selectedStatus,
      page,
      showFullList,
    });
    try {
      // If homeroom teacher but no class selected, don't fetch
      if (isHomeroomTeacher() && (!selectedClass || selectedClass === "all")) {
        logger.debug(
          "🚫 No class selected for homeroom teacher, skipping attendance fetch"
        );
        setAttendanceRecords([]);
        setStats({
          total_students: 0,
          present_count: 0,
          absent_count: 0,
          late_count: 0,
        });
        setLoading(false);
        return;
      }

      if (showFullList) {
        // Use full list API - shows all students with their attendance status
        let response;
        if (isHomeroomTeacher() && selectedClass && selectedClass !== "all") {
          const found = homeroomClasses.find(
            (c) => c.class_name === selectedClass
          );
          const classId = found?.id;
          response = await ApiService.request(
            `/homeroom/attendance/records?target_date=${selectedDate}${
              classId ? `&class_id=${classId}` : ""
            }`
          );
          if (response.success) {
            // Chuyển dữ liệu thành cấu trúc giống API full list: { students: {...}, ... }
            const records = (response.data?.records || []).map((r) => ({
              id: r.id ?? null,
              ...r,
              students: {
                student_id: r.student_code || r.student_id,
                full_name: r.student_name,
                class_name: r.class_name,
              },
            }));
            response = { success: true, data: records };
          }
        } else {
          response = await ApiService.getFullAttendanceList(
            selectedDate,
            selectedClass === "all" ? "" : selectedClass
          );
        }
        if (response.success) {
          let filteredData = response.data || [];

          // Apply status filter if specified
          if (selectedStatus && selectedStatus !== "all") {
            filteredData = filteredData.filter(
              (record) => record.status === selectedStatus
            );
          }

          setAttendanceRecords(filteredData);

          // Calculate stats from full list data - but use full data not filtered data
          const fullData = response.data || [];
          logger.debug("📊 Calculating stats from full data:", fullData);
          const calculatedStats = calculateStatsFromData(fullData);
          logger.debug("📊 Calculated stats:", calculatedStats);
          setStats(calculatedStats);
        }
      } else {
        // Use existing logic for showing only students who have attendance records
        const params = {
          page: page,
          page_size: pageSize,
          date_from: selectedDate,
          date_to: selectedDate,
        };

        if (selectedClass && selectedClass !== "all") {
          // For class filter, we need to use today's attendance endpoint
          // because the main endpoint doesn't have direct class filtering
          if (selectedDate === new Date().toISOString().split("T")[0]) {
            const response = await ApiService.getTodayAttendance(selectedClass);
            if (response.success) {
              let filteredData = response.data || [];

              if (selectedStatus && selectedStatus !== "all") {
                filteredData = filteredData.filter(
                  (record) => record.status === selectedStatus
                );
              }

              setAttendanceRecords(filteredData);
            }
          } else {
            // For other dates, get all records and filter by class on frontend
            const response = await ApiService.getAttendanceRecords(params);
            if (response.success) {
              let filteredData = response.data || [];

              if (selectedClass && selectedClass !== "all") {
                filteredData = filteredData.filter(
                  (record) =>
                    record.students &&
                    record.students.class_name === selectedClass
                );
              }

              if (selectedStatus && selectedStatus !== "all") {
                filteredData = filteredData.filter(
                  (record) => record.status === selectedStatus
                );
              }

              setAttendanceRecords(filteredData);
            }
          }
        } else {
          if (selectedStatus && selectedStatus !== "all") {
            params.status = selectedStatus;
          }

          const response = await ApiService.getAttendanceRecords(params);
          logger.debug("📡 API Response:", response);
          if (response.success) {
            setAttendanceRecords(response.data || []);
          }
        }
      }
    } catch (error) {
      logger.error("Error loading attendance:", error);
      setError("Không thể tải dữ liệu điểm danh");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Only load API stats when not in full list mode
      if (!showFullList) {
        const response = await ApiService.getAttendanceStats(selectedDate);
        if (response.success) {
          setStats(response.data);
        }
      }
    } catch (error) {
      logger.error("Error loading stats:", error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      present: {
        variant: "default",
        className: "bg-green-100 text-green-800",
        label: "Có mặt",
      },
      absent: { variant: "destructive", className: "", label: "Vắng mặt" },
      late: {
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800",
        label: "Muộn",
      },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      className: "",
      label: status,
    };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh", // Đảm bảo hiển thị theo giờ Việt Nam
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh", // Đảm bảo hiển thị theo giờ Việt Nam
      });
    } catch {
      return dateString;
    }
  };

  const resetFilters = () => {
    // Clear tất cả filters và data để tránh duplicate
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedClass("all");
    setSelectedStatus("all");
    setPage(1);

    // Clear data states
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);

    // Clear editing states
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");
  };

  const calculateStatsFromData = (data) => {
    const totalStudents = data.length;
    const presentCount = data.filter(
      (record) => record.status === "present"
    ).length;
    const lateCount = data.filter((record) => record.status === "late").length;
    const absentCount = totalStudents - presentCount - lateCount; // Đơn giản hơn!

    return {
      total_students: totalStudents,
      present_count: presentCount,
      late_count: lateCount,
      absent_count: absentCount,
      attendance_rate:
        totalStudents > 0
          ? Math.round((presentCount / totalStudents) * 100 * 10) / 10
          : 0,
    };
  };

  // Handler cho việc thay đổi ngày để tránh duplicate data
  const handleDateChange = (newDate) => {
    // Clear data ngay lập tức để tránh hiển thị data cũ
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);

    // Reset về trang đầu tiên
    setPage(1);

    // Clear editing states
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");

    // Set ngày mới
    setSelectedDate(newDate);
  };

  // Handler cho việc thay đổi lớp
  const handleClassChange = (newClass) => {
    // Clear data và reset page
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);

    // Clear editing states
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");

    // Set lớp mới
    setSelectedClass(newClass);
  };

  // Handler cho việc thay đổi trạng thái
  const handleStatusChange = (newStatus) => {
    // Clear data và reset page
    setAttendanceRecords([]);
    setPage(1);

    // Clear editing states
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");

    // Set trạng thái mới
    setSelectedStatus(newStatus);
  };

  // Handler cho việc thay đổi chế độ xem
  const handleViewModeChange = (showFullListMode) => {
    // Clear data khi thay đổi chế độ xem
    setAttendanceRecords([]);
    setStats(null);
    setError(null);
    setSuccessMessage(null);
    setPage(1);

    // Clear editing states
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");

    // Set chế độ xem mới
    setShowFullList(showFullListMode);
  };

  // Helper function to get stable identifier for a record
  const getRecordKey = (record) => {
    if (!record) return null;
    // Use student_id (ID in students table) as the unique key
    return record.student_id ?? record.students?.student_id ?? null;
  };

  // Helper function to check if a record is being edited
  const isEditingRecord = (record) => {
    if (!editingRecord || !record) return false;
    const editingKey = getRecordKey(editingRecord);
    const recordKey = getRecordKey(record);
    // Compare as strings to handle type mismatches
    return String(editingKey) === String(recordKey) && editingKey !== null;
  };

  const handleEditRecord = (record) => {
    // Store the entire record including student_id for unique identification
    setEditingRecord(record);
    setEditStatus(record.status || "absent");
    setEditNotes(record.notes || "");
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditStatus("");
    setEditNotes("");
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    setUpdating(true);
    try {
      let response;

      if (editingRecord.id === null) {
        // Create new attendance record for student who hasn't been marked
        response = await ApiService.createManualAttendance({
          student_id: editingRecord.student_id,
          date: selectedDate,
          status: editStatus,
          notes: editNotes,
          method: "manual",
        });
      } else {
        // Update existing attendance record
        response = await ApiService.updateAttendanceStatus(
          editingRecord.id,
          editStatus,
          editNotes
        );
      }

      if (response.success) {
        // Close edit mode first
        handleCancelEdit();

        // Show success message
        setError(null);
        setSuccessMessage(
          editingRecord.id === null
            ? "Tạo mới điểm danh thành công!"
            : "Cập nhật trạng thái điểm danh thành công!"
        );
        setTimeout(() => setSuccessMessage(null), 3000);

        // Reload data from server to ensure consistency
        await loadAttendanceData();
        await loadStats();
      } else {
        setError(response.message || "Lỗi cập nhật trạng thái");
      }
    } catch (error) {
      logger.error("Error updating attendance:", error);
      setError("Không thể cập nhật trạng thái điểm danh");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && attendanceRecords.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-view">
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Điểm danh</CardTitle>
            <CardDescription>Quản lý điểm danh học sinh</CardDescription>
            {error && (
              <div className="p-3 mt-2 border rounded text-destructive bg-destructive/10 border-destructive/20">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 mt-2 text-green-700 bg-green-100 border border-green-400 rounded">
                {successMessage}
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full text-primary bg-primary/10">
                  <Users className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Tổng học sinh
                  </p>
                  <p className="text-2xl font-bold">{stats.total_students}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 text-green-600 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Có mặt
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.present_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full text-destructive bg-destructive/10">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Vắng mặt
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {stats.absent_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 text-yellow-600 bg-yellow-100 rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Muộn
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.late_count}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bộ lọc</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Chế độ xem:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFullList}
                  onChange={(e) => handleViewModeChange(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-primary"
                />
                <span className="text-sm font-medium">
                  Hiển thị tất cả học sinh
                </span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {isHomeroomTeacher() && (
              <div className="flex-1 max-w-[200px]">
                <label className="block mb-2 text-sm font-medium">
                  Năm học
                </label>
                <Select
                  value={selectedAcademicYear || ""}
                  onValueChange={(value) => {
                    setSelectedAcademicYear(value);
                    attendanceBootstrap({ year: value, date: selectedDate });
                  }}
                >
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
            <div className="flex-1 max-w-[160px]">
              <label className="block mb-2 text-sm font-medium">Ngày</label>
              <SimpleDatePicker
                value={selectedDate}
                onChange={(value) => handleDateChange(value)}
                placeholder="Chọn ngày"
                className="w-full"
              />
            </div>

            <div className="flex-1 max-w-[200px]">
              <label className="block mb-2 text-sm font-medium">Lớp</label>
              <Select
                value={selectedClass}
                onValueChange={(value) => handleClassChange(value)}
                disabled={classesLoading}
              >
                <SelectTrigger className="w-full flex items-center justify-between">
                  <SelectValue
                    placeholder={
                      classesLoading
                        ? "Đang tải lớp…"
                        : isHomeroomTeacher()
                        ? "Chọn lớp chủ nhiệm"
                        : "Tất cả lớp"
                    }
                  />
                  {classesLoading && (
                    <span className="ml-2 inline-block w-3 h-3 border-2 border-transparent border-b-muted-foreground rounded-full animate-spin" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isHomeroomTeacher() ? "Chọn lớp chủ nhiệm" : "Tất cả lớp"}
                  </SelectItem>
                  {classes.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 max-w-[200px]">
              <label className="block mb-2 text-sm font-medium">
                Trạng thái
              </label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => handleStatusChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="present">Có mặt</SelectItem>
                  <SelectItem value="absent">Vắng mặt</SelectItem>
                  <SelectItem value="late">Muộn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetFilters}>
                Đặt lại
              </Button>
              <Button
                onClick={() =>
                  attendanceBootstrap({
                    year: selectedAcademicYear,
                    date: selectedDate,
                    className:
                      selectedClass && selectedClass !== "all"
                        ? selectedClass
                        : undefined,
                  })
                }
              >
                Tìm kiếm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách điểm danh{" "}
            {selectedDate && `- ${formatDate(selectedDate)}`}
          </CardTitle>
          <CardDescription>
            {showFullList
              ? `Hiển thị ${attendanceRecords.length} học sinh (bao gồm cả học sinh chưa điểm danh)`
              : `Hiển thị ${attendanceRecords.length} bản ghi điểm danh`}
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
                  <TableHead className="w-[120px] text-center">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      {loading ? (
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary"></div>
                        </div>
                      ) : (
                        "Không có dữ liệu điểm danh"
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    // Apply frontend pagination
                    const startIndex = (page - 1) * pageSize;
                    const endIndex = startIndex + pageSize;
                    const paginatedRecords = attendanceRecords.slice(
                      startIndex,
                      endIndex
                    );

                    return paginatedRecords.map((record, idx) => (
                      <TableRow
                        key={record.id ?? `record-${record.student_id}-${idx}`}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {record.students?.student_id || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {record.students?.full_name || "Không xác định"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-blue-800 bg-blue-100"
                          >
                            {record.students?.class_name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_in_time)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_out_time)}
                        </TableCell>
                        <TableCell>
                          {isEditingRecord(record) ? (
                            <Select
                              value={editStatus}
                              onValueChange={(value) => setEditStatus(value)}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Có mặt</SelectItem>
                                <SelectItem value="absent">Vắng</SelectItem>
                                <SelectItem value="late">Muộn</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(record.status)
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.confidence_score
                            ? `${(record.confidence_score * 100 * 2).toFixed(
                                1
                              )}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {isEditingRecord(record) ? (
                            <Input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Nhập ghi chú..."
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span
                              className="truncate"
                              title={record.notes || ""}
                            >
                              {record.notes || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditingRecord(record) ? (
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={updating}
                                className="h-8 text-xs"
                              >
                                {updating ? "..." : "Lưu"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={updating}
                                className="h-8 text-xs"
                              >
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                logger.debug("🖱️ Click Sửa button", { record });
                                handleEditRecord(record);
                              }}
                              className="h-8 text-xs"
                            >
                              Sửa
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {(() => {
          const totalRecords = attendanceRecords.length;
          const totalPages = Math.ceil(totalRecords / pageSize);

          if (totalPages <= 1) return null;

          return (
            <div className="px-6 py-4 border-t bg-muted/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị{" "}
                    <span className="font-semibold">
                      {(page - 1) * pageSize + 1}
                    </span>{" "}
                    đến{" "}
                    <span className="font-semibold">
                      {Math.min(page * pageSize, totalRecords)}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-semibold">{totalRecords}</span> bản
                    ghi
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-muted-foreground">
                      Số lượng/trang:
                    </label>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
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
                    onClick={() => setPage(Math.max(1, page - 1))}
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
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
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
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Sau →
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Summary */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            {selectedDate === new Date().toISOString().split("T")[0]
              ? "Dữ liệu điểm danh hôm nay"
              : `Dữ liệu điểm danh ngày ${formatDate(selectedDate)}`}
            {selectedClass && ` - Lớp ${selectedClass}`}
            {selectedStatus && ` - Trạng thái: ${selectedStatus}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceView;
