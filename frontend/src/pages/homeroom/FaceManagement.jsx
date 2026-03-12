import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
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
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
import ApiService from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";
import logger from "@/utils/logger";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

const FaceManagement = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [aiStatus, setAiStatus] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false });

  const openConfirm = useCallback((config) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);

  // Filter states
  const [selectedClass, setSelectedClass] = useState("all");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [homeroomClasses, setHomeroomClasses] = useState([]); // objects with id
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [classesLoading, setClassesLoading] = useState(false);
  const classesReqIdRef = useRef(0);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const hasBootstrappedRef = useRef(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (!hasBootstrappedRef.current) {
      hasBootstrappedRef.current = true;
      faceBootstrap({});
    }
  }, []);

  // Reload classes when academic year changes
  useEffect(() => {
    if (isHomeroomTeacher()) {
      faceBootstrap({ year: selectedAcademicYear });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear]);

  // Không tự động gọi bootstrap theo selectedClass để tránh vòng lặp;
  // chỉ gọi khi người dùng chọn lớp (handler onValueChange phía dưới)
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass]);

  // Khi đổi user, chỉ bootstrap 1 lần nếu cần
  useEffect(() => {
    if (!bootstrapLoading) {
      faceBootstrap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const faceBootstrap = async ({ year, className } = {}) => {
    try {
      setBootstrapLoading(true);
      setClassesLoading(true);
      setLoading(true);
      const params = new URLSearchParams();
      if (year) params.set("academic_year", year);
      if (className) params.set("class_name", className);
      const url = `/homeroom/face/bootstrap${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const resp = await ApiService.request(url);
      if (resp.success && resp.data) {
        const {
          academic_years,
          year: resolvedYear,
          classes,
          selected_class,
          students: stu,
        } = resp.data;
        if (Array.isArray(academic_years)) setAcademicYears(academic_years);
        if (!selectedAcademicYear && resolvedYear)
          setSelectedAcademicYear(resolvedYear);
        setHomeroomClasses(Array.isArray(classes) ? classes : []);
        const classNames = (classes || [])
          .map((c) => c.class_name)
          .filter(Boolean)
          .sort();
        setAvailableClasses(classNames);
        const exists =
          selected_class?.class_name &&
          classNames.includes(selected_class.class_name);
        setSelectedClass(
          exists ? selected_class.class_name : classNames[0] || "all"
        );
        setStudents(Array.isArray(stu) ? stu : []);
      }
    } catch (e) {
      logger.error("face bootstrap error", e);
    } finally {
      setClassesLoading(false);
      setBootstrapLoading(false);
      setLoading(false);
    }
  };

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // If homeroom teacher but no class selected, don't fetch
      if (isHomeroomTeacher() && (!selectedClass || selectedClass === "all")) {
        logger.debug(
          "🚫 No class selected for homeroom teacher, skipping face management students fetch"
        );
        setStudents([]);
        setLoading(false);
        return;
      }

      let studentsResponse;

      if (isHomeroomTeacher()) {
        // If homeroom teacher, get only their homeroom students by class/year
        const found = homeroomClasses.find(
          (c) => c.class_name === selectedClass
        );
        const classId = found?.id;
        studentsResponse = await ApiService.request(
          classId
            ? `/homeroom/students?class_id=${classId}`
            : `/homeroom/students?class_name=${encodeURIComponent(
                selectedClass
              )}&academic_year=${encodeURIComponent(selectedAcademicYear)}`
        );
      } else {
        // If admin or other roles, get all students
        studentsResponse = await ApiService.getStudents({});
      }

      // Handle students response properly
      if (studentsResponse.success && studentsResponse.data) {
        let studentsData = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : [];

        // Apply class filter for non-homeroom users
        if (!isHomeroomTeacher() && selectedClass && selectedClass !== "all") {
          studentsData = studentsData.filter(
            (student) => student.class_name === selectedClass
          );
        }

        // Filter chỉ hiển thị học sinh đang hoạt động (is_active !== false)
        studentsData = studentsData.filter(
          (student) => student.is_active !== false
        );

        // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
        studentsData = studentsData.sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        setStudents(studentsData);
      } else {
        setStudents([]);
      }

      // Log để debug
      logger.debug("Face Management Students data:", studentsResponse);
    } catch (error) {
      logger.error("Error fetching students data:", error);
      setError("Không thể tải thông tin học sinh");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const statusResponse = await fetch(`${API_BASE_URL}/ai/status`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAiStatus(statusData.data);
      }
    } catch (error) {
      logger.error("Error fetching AI status:", error);
    }
  };

  const fetchData = async () => {
    await Promise.all([
      fetchAIStatus(),
      faceBootstrap({ year: selectedAcademicYear, className: selectedClass }),
    ]);
  };

  const deleteFaceEncoding = (studentId, studentName) => {
    openConfirm({
      title: "Xóa khuôn mặt đã đăng ký",
      description: `Bạn có chắc muốn xóa khuôn mặt đã đăng ký của ${studentName}?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        closeConfirm();
        await doDeleteFaceEncoding(studentId);
      },
    });
  };

  const doDeleteFaceEncoding = async (studentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/ai/student/${studentId}/encoding`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        alert("Xóa khuôn mặt thành công!");
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error("Error deleting face encoding:", error);
      alert("Có lỗi xảy ra khi xóa khuôn mặt");
    }
  };

  const reloadModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/reload-models`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        alert("Reload models thành công!");
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error("Error reloading models:", error);
      alert("Có lỗi xảy ra khi reload models");
    }
  };

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
                      {aiStatus.service_status === "active"
                        ? "Hoạt động"
                        : "Không hoạt động"}
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
                    Database: {aiStatus.database_encodings}, Local:{" "}
                    {aiStatus.local_ai_encodings}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Camera className="w-5 h-5 text-purple-600" />
                    <div className="text-2xl font-bold text-purple-600">
                      {aiStatus.accuracy || "N/A"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Độ chính xác
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {aiStatus.similarity_threshold
                      ? `Threshold: ${aiStatus.similarity_threshold}`
                      : "Advanced AI"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2 space-x-2">
                    {aiStatus.sync_status === "synced" ? (
                      <UserCheck className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    )}
                    <div className="text-2xl font-bold text-orange-600">
                      {aiStatus.sync_status === "synced"
                        ? "Đồng bộ"
                        : "Chưa đồng bộ"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trạng thái đồng bộ
                  </div>
                  <div className="mt-1 text-xs capitalize text-muted-foreground">
                    {aiStatus.sync_status?.replace("_", " ")}
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
            <Button onClick={reloadModels} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Models
            </Button>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Bộ lọc</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {isHomeroomTeacher() && (
              <div className="space-y-2">
                <Label>Năm học</Label>
                <Select
                  value={selectedAcademicYear || ""}
                  onValueChange={(v) => {
                    setSelectedAcademicYear(v);
                    faceBootstrap({ year: v });
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
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Lớp
              </label>
              <Select
                value={selectedClass}
                onValueChange={(value) => {
                  setSelectedClass(value);
                  faceBootstrap({
                    year: selectedAcademicYear,
                    className: value,
                  });
                }}
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
              <Button
                onClick={() => {
                  fetchAIStatus();
                  faceBootstrap({
                    year: selectedAcademicYear,
                    className: selectedClass,
                  });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới dữ liệu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students with Face Registration */}
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
                  selectedClass !== "all" &&
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
                    setPageSize(Number(value));
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
                    {isHomeroomTeacher() && !selectedClass ? (
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
                (() => {
                  // Apply pagination
                  const startIndex = (currentPage - 1) * pageSize;
                  const endIndex = startIndex + pageSize;
                  const paginatedStudents = students.slice(
                    startIndex,
                    endIndex
                  );

                  return paginatedStudents.map((student) => (
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
                              deleteFaceEncoding(student.id, student.full_name)
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
                  ));
                })()
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {(() => {
            const totalStudents = students.length;
            const totalPages = Math.ceil(totalStudents / pageSize);

            if (totalPages <= 1) return null;

            return (
              <div className="px-6 py-4 border-t bg-muted/50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị{" "}
                    <span className="font-semibold text-foreground">
                      {(currentPage - 1) * pageSize + 1}
                    </span>{" "}
                    đến{" "}
                    <span className="font-semibold text-foreground">
                      {Math.min(currentPage * pageSize, totalStudents)}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-semibold text-foreground">
                      {totalStudents}
                    </span>{" "}
                    học sinh
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
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
                              onClick={() => setCurrentPage(pageNum)}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
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
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
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
            );
          })()}
        </CardContent>
      </Card>

      {/* Instructions */}
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

      <ConfirmDialog {...confirmState} onCancel={closeConfirm} />
    </div>
  );
};

export default FaceManagement;
