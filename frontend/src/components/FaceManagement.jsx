import React, { useState, useEffect, useContext } from "react";
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
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import ApiService from "../services/api";
import { AuthContext } from "../contexts/AuthContext";

// API Configuration
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const FaceManagement = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [aiStatus, setAiStatus] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedClass, setSelectedClass] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchAvailableClasses();
  }, []);

  useEffect(() => {
    fetchStudentsData();
    setCurrentPage(1); // Reset to page 1 when class changes
  }, [selectedClass]);

  useEffect(() => {
    fetchAvailableClasses();
  }, [user]);

  // Auto-select first class for homeroom teachers
  useEffect(() => {
    if (isHomeroomTeacher() && availableClasses.length > 0 && !selectedClass) {
      console.log(
        "🎯 Auto-selecting first homeroom class for face management:",
        availableClasses[0]
      );
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, isHomeroomTeacher, selectedClass]);

  // Fetch available classes based on user role
  const fetchAvailableClasses = async () => {
    try {
      console.log("👤 Face Management - User role check:", {
        user,
        isHomeroomTeacher: isHomeroomTeacher(),
        userRole: user?.role,
      });

      let classesResponse;

      if (isHomeroomTeacher()) {
        console.log("📚 Fetching homeroom classes for face management...");
        // If homeroom teacher, only get their homeroom classes
        classesResponse = await ApiService.getHomeroomClasses();

        if (classesResponse.success && classesResponse.data) {
          // Deduplicate class names using Set
          const classNames = [
            ...new Set(
              classesResponse.data
                .map((cls) => cls.class_name)
                .filter((name) => name) // Remove null/undefined
            ),
          ].sort();
          console.log("📚 Setting homeroom classes:", classNames);
          setAvailableClasses(classNames);
        } else {
          console.warn(
            "📚 Invalid homeroom classes response:",
            classesResponse
          );
          setAvailableClasses([]);
        }
      } else {
        console.log("📚 Fetching all students to extract classes for admin...");
        // If admin, get all students and extract unique class names
        const studentsResponse = await ApiService.getStudents({});

        if (studentsResponse.success && studentsResponse.data) {
          // Extract unique class names from students
          const uniqueClasses = [
            ...new Set(
              studentsResponse.data
                .map((student) => student.class_name)
                .filter((className) => className) // Remove null/undefined
            ),
          ].sort();

          console.log(
            "📚 Extracted unique classes from students:",
            uniqueClasses
          );
          setAvailableClasses(uniqueClasses);
        } else {
          console.warn(
            "📚 Invalid students response for classes:",
            studentsResponse
          );
          setAvailableClasses([]);
        }
      }
    } catch (error) {
      console.error("Error fetching available classes:", error);
      setAvailableClasses([]);
    }
  };

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // If homeroom teacher but no class selected, don't fetch
      if (isHomeroomTeacher() && !selectedClass) {
        console.log(
          "🚫 No class selected for homeroom teacher, skipping face management students fetch"
        );
        setStudents([]);
        setLoading(false);
        return;
      }

      let studentsResponse;

      if (isHomeroomTeacher()) {
        // If homeroom teacher, get only their homeroom students
        studentsResponse = await ApiService.getHomeroomStudents(selectedClass);
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
        if (!isHomeroomTeacher() && selectedClass) {
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
      console.log("Face Management Students data:", studentsResponse);
    } catch (error) {
      console.error("Error fetching students data:", error);
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
      console.error("Error fetching AI status:", error);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchAIStatus(), fetchStudentsData()]);
  };

  const deleteFaceEncoding = async (studentId, studentName) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa khuôn mặt đã đăng ký của ${studentName}?`
      )
    ) {
      return;
    }

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
      console.error("Error deleting face encoding:", error);
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
      console.error("Error reloading models:", error);
      alert("Có lỗi xảy ra khi reload models");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gray-50">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Camera className="w-8 h-8 text-primary" />
          <span>Quản lý khuôn mặt AI</span>
        </h2>
        <p className="text-gray-600">
          Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký
        </p>
        {error && (
          <div className="flex items-center space-x-2 p-3 mt-2 text-red-700 bg-red-100 rounded border border-red-400">
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
                  <div className="flex items-center space-x-2 mb-2">
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
                  <div className="flex items-center space-x-2 mb-2">
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
                  <div className="flex items-center space-x-2 mb-2">
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
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <div className="text-2xl font-bold text-orange-600">
                      {aiStatus.sync_status === "synced" ? "✅" : "⚠️"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Trạng thái đồng bộ
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground capitalize">
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

          <div className="mt-4 flex space-x-3">
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
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Lớp
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 w-full rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              >
                {/* Show placeholder for homeroom teachers, "Tất cả lớp" for others */}
                {isHomeroomTeacher() ? (
                  <option value="">Chọn lớp chủ nhiệm</option>
                ) : (
                  <option value="">Tất cả lớp</option>
                )}
                {availableClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  fetchAIStatus();
                  fetchStudentsData();
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
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Học sinh đã đăng ký khuôn mặt</span>
              </CardTitle>
              <CardDescription>
                Danh sách học sinh có thể được nhận diện bằng AI
                {selectedClass && ` - Lớp ${selectedClass}`}
              </CardDescription>
            </div>
            {students.length > pageSize && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-muted-foreground">
                  Số lượng/trang:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="pl-3 pr-8 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
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
                    className="text-center py-8 text-muted-foreground"
                  >
                    {isHomeroomTeacher() && !selectedClass ? (
                      <div>
                        <div className="mb-4 text-6xl text-gray-400">🎯</div>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                          Chọn lớp chủ nhiệm để xem dữ liệu
                        </h3>
                        <p className="text-gray-500">
                          Vui lòng chọn lớp từ dropdown phía trên
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4 text-6xl text-gray-400">👤</div>
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
                        {student.insightface_encoding ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800"
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Đã đăng ký (InsightFace)
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="bg-red-100 text-red-800"
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Chưa đăng ký
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {student.insightface_encoding ? (
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
                          <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded">
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
              <div className="px-6 py-4 bg-muted/50 border-t">
                <div className="flex flex-wrap gap-3 justify-between items-center">
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
    </div>
  );
};

export default FaceManagement;
