import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import api from "../services/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import logger from "../utils/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Trophy,
  TrendingDown,
  Target,
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  Award,
} from "lucide-react";

// Tạo danh sách năm học từ 2024-2025 đến 2035-2036
const generateAcademicYears = () => {
  const years = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

// Danh sách học kỳ cố định
const SEMESTERS = ["HK1", "HK2", "HK3"];
const ACADEMIC_YEARS = generateAcademicYears();

const SubjectTeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const {
    academicYear: defaultAcademicYear,
    semester: defaultSemester,
    loading: settingsLoading,
  } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTab, setSelectedTab] = useState("overview"); // overview, attention, top, comparison
  const [classList, setClassList] = useState([]); // Danh sách lớp
  const [selectedClass, setSelectedClass] = useState(null); // Lớp được chọn (null = tất cả)
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Filter states - sử dụng trực tiếp giá trị từ system settings với fallback
  const [academicYear, setAcademicYear] = useState(
    defaultAcademicYear || "2024-2025"
  );
  const [semester, setSemester] = useState(defaultSemester || "HK1");

  // Sync với system settings khi có thay đổi
  useEffect(() => {
    if (defaultAcademicYear) {
      setAcademicYear(defaultAcademicYear);
    }
  }, [defaultAcademicYear]);

  useEffect(() => {
    if (defaultSemester) {
      setSemester(defaultSemester);
    }
  }, [defaultSemester]);

  useEffect(() => {
    if (academicYear && semester) {
      fetchClassList();
    }
  }, [academicYear, semester]);

  useEffect(() => {
    if (academicYear && semester) {
      fetchAnalytics();
    }
  }, [academicYear, semester, selectedClass]);

  const fetchClassList = async () => {
    try {
      setLoadingClasses(true);
      const response = await api.getTeacherClasses(academicYear, semester);
      logger.debug("Class list response:", response); // Debug log
      if (response.success && response.data) {
        // Extract unique classes from class_subjects data
        const classesMap = {};
        response.data.forEach((cs) => {
          if (cs.classes) {
            const classId = cs.classes.id;
            if (!classesMap[classId]) {
              classesMap[classId] = {
                class_id: classId,
                class_name: cs.classes.class_name,
                grade: cs.classes.grade,
                subjects: [],
              };
            }
            // Add subject if exists
            if (cs.subjects) {
              classesMap[classId].subjects.push({
                subject_id: cs.subjects.id,
                subject_name: cs.subjects.subject_name,
                subject_code: cs.subjects.subject_code,
              });
            }
          }
        });

        const classList = Object.values(classesMap).sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          return a.class_name.localeCompare(b.class_name);
        });

        setClassList(classList);
        logger.debug("Class list set to:", classList); // Debug log
      }
    } catch (error) {
      logger.error("Error fetching class list:", error);
      setClassList([]); // Set to empty array on error
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherDashboardAnalytics(
        academicYear,
        semester,
        selectedClass
      );
      logger.debug("Analytics response:", response); // Debug log
      if (response.success) {
        setAnalytics(response.data);
      } else {
        logger.error("Failed to fetch analytics:", response.message);
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
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

  if (!analytics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center bg-white border-2 border-red-200 shadow-lg rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-50">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="font-medium text-red-600">
            Không thể tải dữ liệu phân tích. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const performanceData = Object.entries(
    analytics.performance_groups || {}
  ).map(([key, value]) => ({
    name: value.label,
    count: value.count,
    percentage: value.percentage,
    color: value.color,
  }));

  const distributionData = Object.entries(
    analytics.score_distribution || {}
  ).map(([range, count]) => ({
    range,
    count,
  }));

  const COLORS = ["#059669", "#2563EB", "#D97706", "#EA580C", "#DC2626"];

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card */}
        <div className="p-6 bg-white border-l-4 border-blue-600 shadow-lg rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-16 h-16 shadow-lg rounded-xl bg-primary">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Dashboard Phân Tích Điểm Số
                </h1>
                <p className="mt-1 text-gray-600">
                  Chào mừng{" "}
                  <span className="font-semibold text-blue-600">
                    {user?.full_name}
                  </span>
                </p>
                <div className="flex items-center mt-2 space-x-3 text-sm">
                  <Badge
                    variant="secondary"
                    className="text-blue-700 bg-blue-100"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {academicYear}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-700"
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    {semester}
                  </Badge>
                  {analytics.subjects && analytics.subjects.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-blue-700 bg-blue-100"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      {analytics.subjects.join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Period Filters */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Năm học
                </label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Chọn năm học" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Học kỳ
                </label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Chọn HK" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Class Filter Dropdown */}
        <div className="p-4 bg-white border shadow-md rounded-xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Lọc theo lớp:
              </label>
            </div>
            <div className="flex flex-wrap flex-1 gap-2">
              <Button
                variant={selectedClass === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedClass(null)}
                className="transition-all"
              >
                <GraduationCap className="w-4 h-4 mr-1" />
                Tất cả lớp ({analytics?.total_classes || 0})
              </Button>
              {loadingClasses ? (
                <div className="flex items-center px-4 py-2 text-sm text-gray-500">
                  <div className="w-4 h-4 mr-2 border-2 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                  Đang tải danh sách lớp...
                </div>
              ) : classList && classList.length > 0 ? (
                <>
                  {logger.debug("Rendering classList:", classList)}
                  {classList.map((classItem, index) => {
                    logger.debug(`ClassItem ${index}:`, classItem);
                    if (
                      !classItem ||
                      !classItem.class_id ||
                      !classItem.class_name
                    ) {
                      logger.warn(`Invalid classItem at ${index}:`, classItem);
                      return null;
                    }
                    return (
                      <Button
                        key={classItem.class_id}
                        variant={
                          selectedClass === classItem.class_id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedClass(classItem.class_id)}
                        className="transition-all"
                      >
                        {classItem.class_name}
                        {classItem.subjects &&
                          classItem.subjects.length > 0 && (
                            <span className="ml-1 text-xs opacity-70">
                              (
                              {classItem.subjects
                                .map((s) => s.subject_code)
                                .join(", ")}
                              )
                            </span>
                          )}
                      </Button>
                    );
                  })}
                </>
              ) : null}
            </div>
            {selectedClass && (
              <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                Đang xem:{" "}
                {classList.find((c) => c.class_id === selectedClass)
                  ?.class_name || ""}
              </Badge>
            )}
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 transition-shadow duration-200 bg-white border-l-4 border-blue-500 shadow-lg rounded-2xl hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng số lớp dạy
                </p>
                <h3 className="mt-2 text-4xl font-bold text-blue-600">
                  {analytics.total_classes}
                </h3>
                <p className="mt-1 text-xs text-gray-500 opacity-0">_</p>
              </div>
              <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl">
                <GraduationCap className="text-blue-600 w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-slate-500 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tổng số học sinh
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-700">
                  {analytics.total_students}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {analytics.students_with_grades} đã có điểm
                </p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-slate-100">
                <Users className="w-7 h-7 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-emerald-500 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {analytics.is_letter_grade_subject
                    ? "Số HS đạt"
                    : "Điểm trung bình"}
                </p>
                <h3 className="mt-2 text-4xl font-bold text-emerald-600">
                  {analytics.is_letter_grade_subject
                    ? `${analytics.overview?.pass_count || 0}/${
                        analytics.students_with_grades
                      }`
                    : analytics.overview?.average_score || 0}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {analytics.is_letter_grade_subject
                    ? `${analytics.overview?.fail_count || 0} không đạt`
                    : `Cao nhất: ${analytics.overview?.highest_score || 0}`}
                </p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-7 h-7 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-amber-500 hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tỷ lệ đạt</p>
                <h3 className="mt-2 text-4xl font-bold text-amber-600">
                  {analytics.overview?.pass_rate || 0}%
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {analytics.overview?.pass_count || 0}/
                  {analytics.students_with_grades} học sinh
                </p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl">
                <Award className="w-7 h-7 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Card>
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setSelectedTab("overview")}
                variant={selectedTab === "overview" ? "default" : "outline"}
                className="flex-1 min-w-fit"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Tổng quan
              </Button>
              <Button
                onClick={() => setSelectedTab("attention")}
                variant={selectedTab === "attention" ? "default" : "outline"}
                className="flex-1 min-w-fit"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Học sinh cần quan tâm
              </Button>
              <Button
                onClick={() => setSelectedTab("top")}
                variant={selectedTab === "top" ? "default" : "outline"}
                className="flex-1 min-w-fit"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Học sinh xuất sắc
              </Button>
              <Button
                onClick={() => setSelectedTab("comparison")}
                variant={selectedTab === "comparison" ? "default" : "outline"}
                className="flex-1 min-w-fit"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                So sánh lớp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {selectedTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Performance Groups - Pie Chart */}
            <div className="p-6 bg-white shadow-lg rounded-2xl">
              <h3 className="flex items-center mb-4 text-xl font-bold text-gray-800">
                <Target className="w-5 h-5 mr-2" />
                Phân nhóm học lực
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} học sinh (${props.payload.percentage}%)`,
                      "Số lượng",
                    ]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {performanceData.map((group, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.color }}
                      ></div>
                      <span className="font-medium text-gray-700">
                        {group.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">{group.count} HS</span>
                      <span className="font-bold text-gray-800">
                        {group.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Distribution - Bar Chart */}
            <div className="p-6 bg-white shadow-lg rounded-2xl">
              <h3 className="flex items-center mb-4 text-xl font-bold text-gray-800">
                <BarChart3 className="w-5 h-5 mr-2" />
                Phân bố điểm số
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: "#6B7280" }}
                    axisLine={{ stroke: "#9CA3AF" }}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280" }}
                    axisLine={{ stroke: "#9CA3AF" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill="#2563EB"
                    name="Số học sinh"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>

              <div className="p-4 mt-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="mb-1 text-xs text-gray-600">Điểm cao nhất</p>
                    <p className="text-2xl font-bold text-green-600">
                      {analytics.overview?.highest_score || 0}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-600">
                      Điểm trung bình
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.overview?.average_score || 0}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-600">Điểm thấp nhất</p>
                    <p className="text-2xl font-bold text-red-600">
                      {analytics.overview?.lowest_score || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "attention" && (
          <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
            <div className="px-6 py-4 bg-destructive">
              <h3 className="flex items-center text-xl font-bold text-white">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Học sinh cần quan tâm (
                {analytics.students_need_attention?.length || 0} học sinh)
              </h3>
              <p className="mt-1 text-sm text-red-100">
                Danh sách học sinh có điểm yếu và kém cần được hỗ trợ thêm
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      STT
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Mã HS
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Họ và tên
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Lớp
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Điểm TB
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Phân loại
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.students_need_attention &&
                  analytics.students_need_attention.length > 0 ? (
                    analytics.students_need_attention.map((student, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-red-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {student.student_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${
                              (() => {
                                const grade = student.final_score;
                                // Convert to number if string
                                const numericGrade =
                                  typeof grade === "string"
                                    ? parseFloat(grade)
                                    : grade;
                                return (
                                  numericGrade !== null &&
                                  !isNaN(numericGrade) &&
                                  numericGrade < 3.5
                                );
                              })()
                                ? "bg-red-100 text-red-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {student.final_score || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              student.category === "Kém"
                                ? "bg-red-200 text-red-900"
                                : "bg-orange-200 text-orange-900"
                            }`}
                          >
                            {student.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center w-16 h-16 mb-4 bg-green-100 rounded-full">
                            <span className="text-3xl">🎉</span>
                          </div>
                          <p className="font-medium text-gray-600">
                            Tuyệt vời! Không có học sinh nào cần quan tâm đặc
                            biệt
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === "top" && (
          <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
            <div className="px-6 py-4 bg-primary">
              <h3 className="flex items-center text-xl font-bold text-white">
                <Trophy className="w-5 h-5 mr-2" />
                Top học sinh xuất sắc ({analytics.top_students?.length || 0} học
                sinh)
              </h3>
              <p className="mt-1 text-sm text-green-100">
                Danh sách học sinh có thành tích học tập xuất sắc
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Hạng
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Mã HS
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Họ và tên
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Lớp
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Điểm TB
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.top_students &&
                  analytics.top_students.length > 0 ? (
                    analytics.top_students.map((student, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-green-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && (
                              <span className="mr-2 text-2xl">🥇</span>
                            )}
                            {index === 1 && (
                              <span className="mr-2 text-2xl">🥈</span>
                            )}
                            {index === 2 && (
                              <span className="mr-2 text-2xl">🥉</span>
                            )}
                            <span className="text-sm font-bold text-gray-900">
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {student.student_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold leading-5 text-blue-800 bg-blue-100 rounded-full">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-4 py-2 text-lg font-bold leading-5 rounded-full shadow-md bg-primary text-primary-foreground">
                            {student.final_score || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
                            <span className="text-3xl">📚</span>
                          </div>
                          <p className="font-medium text-gray-600">
                            Chưa có học sinh xuất sắc
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === "comparison" && (
          <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
            <div className="px-6 py-4 bg-primary">
              <h3 className="flex items-center text-xl font-bold text-white">
                <TrendingDown className="w-5 h-5 mr-2" />
                So sánh kết quả giữa các lớp
              </h3>
              <p className="mt-1 text-sm text-blue-100">
                Phân tích và so sánh thành tích học tập của các lớp
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Hạng
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                      Lớp
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Sĩ số
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      ĐTB
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Cao nhất
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Thấp nhất
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                      Tỷ lệ đạt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.class_comparison &&
                  analytics.class_comparison.length > 0 ? (
                    analytics.class_comparison.map((classData, index) => (
                      <tr
                        key={index}
                        className="transition-colors hover:bg-blue-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-sm font-bold leading-5 text-blue-800 bg-blue-100 rounded-full">
                            {classData.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {classData.student_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-sm font-bold leading-5 text-purple-800 bg-purple-100 rounded-full">
                            {classData.average_score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-sm font-semibold text-green-600">
                            {classData.highest_score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">
                            {classData.lowest_score}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${classData.pass_rate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {classData.pass_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-full">
                            <BarChart3 className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="font-medium text-gray-600">
                            Chưa có dữ liệu để so sánh
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectTeacherDashboard;
