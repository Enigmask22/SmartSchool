import React, { useState, useEffect, useContext, useMemo, ReactNode } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useSubjectDashboard } from "@/hooks/useSubjectDashboard";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logger from "@/utils/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// ===== Types =====
interface PerformanceGroup {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface ScoreDistribution {
  range: string;
  count: number;
}

interface StudentData {
  student_id: string;
  student_name: string;
  class_name: string;
  final_score: number | string;
  category: string;
}

interface ClassComparisonData {
  class_name: string;
  student_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
}

interface AnalyticsData {
  total_classes: number;
  total_students: number;
  students_with_grades: number;
  is_letter_grade_subject: boolean;
  overview: {
    pass_count?: number;
    fail_count?: number;
    average_score: number;
    highest_score: number;
    lowest_score?: number;
    pass_rate: number;
  };
  performance_groups?: Record<string, PerformanceGroup>;
  score_distribution?: Record<string, number>;
  students_need_attention?: StudentData[];
  top_students?: StudentData[];
  class_comparison?: ClassComparisonData[];
  subjects?: string[];
}

// ===== Sub-Components =====

interface HeaderProps {
  user: { full_name?: string };
  academicYear: string;
  semester: string;
  subjects: string[];
  onAcademicYearChange: (year: string) => void;
  onSemesterChange: (semester: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  academicYear,
  semester,
  subjects,
  onAcademicYearChange,
  onSemesterChange,
}: HeaderProps) => {
  const academicYears = useMemo(() => {
    const years = [];
    for (let year = 2024; year <= 2035; year++) {
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }, []);

  const semesters = ["HK1", "HK2", "HK3"];

  return (
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
              {subjects && subjects.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-blue-700 bg-blue-100"
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  {subjects.join(", ")}
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
            {/* @ts-ignore */}
            <Select value={academicYear} onValueChange={onAcademicYearChange}>
              {/* @ts-ignore */}
              <SelectTrigger className="w-[140px]">
                {/* @ts-ignore */}
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent>
                {academicYears.map((year) => (
                  /* @ts-ignore */
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
            {/* @ts-ignore */}
            <Select value={semester} onValueChange={onSemesterChange}>
              {/* @ts-ignore */}
              <SelectTrigger className="w-[100px]">
                {/* @ts-ignore */}
                <SelectValue placeholder="Chọn HK" />
              </SelectTrigger>
              {/* @ts-ignore */}
              <SelectContent>
                {semesters.map((sem) => (
                  /* @ts-ignore */
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
  );
};

interface ClassFilterProps {
  selectedClass: number | null;
  classList: Array<{
    class_id: number;
    class_name: string;
    grade: number;
    subjects: Array<{ subject_code: string }>;
  }>;
  loadingClasses: boolean;
  totalClasses: number;
  onClassSelect: (classId: number | null) => void;
}

const ClassFilter: React.FC<ClassFilterProps> = ({
  selectedClass,
  classList,
  loadingClasses,
  totalClasses,
  onClassSelect,
}) => {
  return (
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
            onClick={() => onClassSelect(null)}
            className="transition-all"
          >
            <GraduationCap className="w-4 h-4 mr-1" />
            Tất cả lớp ({totalClasses})
          </Button>
          {loadingClasses ? (
            <div className="flex items-center px-4 py-2 text-sm text-gray-500">
              <div className="w-4 h-4 mr-2 border-2 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
              Đang tải danh sách lớp...
            </div>
          ) : classList && classList.length > 0 ? (
            <>
              {classList.map((classItem) => (
                <Button
                  key={classItem.class_id}
                  variant={
                    selectedClass === classItem.class_id
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => onClassSelect(classItem.class_id)}
                  className="transition-all"
                >
                  {classItem.class_name}
                  {classItem.subjects && classItem.subjects.length > 0 && (
                    <span className="ml-1 text-xs opacity-70">
                      (
                      {classItem.subjects
                        .map((s) => s.subject_code)
                        .join(", ")}
                      )
                    </span>
                  )}
                </Button>
              ))}
            </>
          ) : null}
        </div>
        {selectedClass && (
          <Badge variant="secondary" className="text-blue-700 bg-blue-100">
            Đang xem:{" "}
            {classList.find((c) => c.class_id === selectedClass)?.class_name ||
              ""}
          </Badge>
        )}
      </div>
    </div>
  );
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  borderColor:
    | "border-blue-500"
    | "border-slate-500"
    | "border-emerald-500"
    | "border-amber-500";
  bgColor:
    | "bg-blue-100"
    | "bg-slate-100"
    | "bg-emerald-100"
    | "bg-amber-100";
  textColor:
    | "text-blue-600"
    | "text-slate-700"
    | "text-emerald-600"
    | "text-amber-600";
  icon: ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  borderColor,
  bgColor,
  textColor,
  icon,
}) => (
  <div
    className={`p-6 transition-shadow duration-200 bg-white border-l-4 ${borderColor} shadow-lg rounded-2xl hover:shadow-xl`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <h3 className={`mt-2 text-4xl font-bold ${textColor}`}>{value}</h3>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${bgColor}`}>
        {icon}
      </div>
    </div>
  </div>
);

interface OverviewTabProps {
  analytics: AnalyticsData;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ analytics }) => {
  const performanceData = useMemo(() => {
    if (!analytics.performance_groups) return [];
    return Object.entries(analytics.performance_groups).map(([key, value]) => ({
      name: value.label,
      count: value.count,
      percentage: value.percentage,
      color: value.color,
    }));
  }, [analytics.performance_groups]);

  const distributionData = useMemo(() => {
    if (!analytics.score_distribution) return [];
    return Object.entries(analytics.score_distribution).map(([range, count]) => ({
      range,
      count,
    }));
  }, [analytics.score_distribution]);

  return (
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
              formatter={(value: number) => [
                `${value} học sinh`,
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
                <span className="font-medium text-gray-700">{group.name}</span>
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
              <p className="mb-1 text-xs text-gray-600">Điểm trung bình</p>
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
  );
};

interface AttentionTabProps {
  students: StudentData[];
}

const AttentionTab: React.FC<AttentionTabProps> = ({ students }) => (
  <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
    <div className="px-6 py-4 bg-destructive">
      <h3 className="flex items-center text-xl font-bold text-white">
        <AlertTriangle className="w-5 h-5 mr-2" />
        Học sinh cần quan tâm ({students?.length || 0} học sinh)
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
          {students && students.length > 0 ? (
            students.map((student, index) => (
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
                        const numericGrade =
                          typeof grade === "string" ? parseFloat(grade) : grade;
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
              <td colSpan={6} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center w-16 h-16 mb-4 bg-green-100 rounded-full">
                    <span className="text-3xl">🎉</span>
                  </div>
                  <p className="font-medium text-gray-600">
                    Tuyệt vời! Không có học sinh nào cần quan tâm đặc biệt
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

interface TopTabProps {
  students: StudentData[];
}

const TopTab: React.FC<TopTabProps> = ({ students }) => (
  <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
    <div className="px-6 py-4 bg-primary">
      <h3 className="flex items-center text-xl font-bold text-white">
        <Trophy className="w-5 h-5 mr-2" />
        Top học sinh xuất sắc ({students?.length || 0} học sinh)
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
          {students && students.length > 0 ? (
            students.map((student, index) => (
              <tr key={index} className="transition-colors hover:bg-green-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {index === 0 && <span className="mr-2 text-2xl">🥇</span>}
                    {index === 1 && <span className="mr-2 text-2xl">🥈</span>}
                    {index === 2 && <span className="mr-2 text-2xl">🥉</span>}
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
              <td colSpan={5} className="px-6 py-12 text-center">
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
);

interface ComparisonTabProps {
  classComparison: ClassComparisonData[];
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ classComparison }) => (
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
          {classComparison && classComparison.length > 0 ? (
            classComparison.map((classData, index) => (
              <tr key={index} className="transition-colors hover:bg-blue-50">
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
              <td colSpan={7} className="px-6 py-12 text-center">
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
);

// ===== Main Component =====

const SubjectDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const {
    loading,
    analytics,
    classList,
    selectedClass,
    academicYear,
    semester,
    selectedTab,
    setSelectedClass,
    setAcademicYear,
    setSemester,
    setSelectedTab,
  } = useSubjectDashboard();

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

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header */}
        <Header
          user={user || {}}
          academicYear={academicYear}
          semester={semester}
          subjects={analytics.subjects || []}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
        />

        {/* Class Filter */}
        <ClassFilter
          selectedClass={selectedClass}
          classList={classList}
          loadingClasses={false}
          totalClasses={analytics.total_classes}
          onClassSelect={setSelectedClass}
        />

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Tổng số lớp dạy"
            value={analytics.total_classes}
            borderColor="border-blue-500"
            bgColor="bg-blue-100"
            textColor="text-blue-600"
            icon={<GraduationCap className="text-blue-600 w-7 h-7" />}
          />
          <StatsCard
            title="Tổng số học sinh"
            value={analytics.total_students}
            subtitle={`${analytics.students_with_grades} đã có điểm`}
            borderColor="border-slate-500"
            bgColor="bg-slate-100"
            textColor="text-slate-700"
            icon={<Users className="w-7 h-7 text-slate-600" />}
          />
          <StatsCard
            title={
              analytics.is_letter_grade_subject ? "Số HS đạt" : "Điểm trung bình"
            }
            value={
              analytics.is_letter_grade_subject
                ? `${analytics.overview?.pass_count || 0}/${analytics.students_with_grades}`
                : analytics.overview?.average_score || 0
            }
            subtitle={
              analytics.is_letter_grade_subject
                ? `${analytics.overview?.fail_count || 0} không đạt`
                : `Cao nhất: ${analytics.overview?.highest_score || 0}`
            }
            borderColor="border-emerald-500"
            bgColor="bg-emerald-100"
            textColor="text-emerald-600"
            icon={<TrendingUp className="w-7 h-7 text-emerald-600" />}
          />
          <StatsCard
            title="Tỷ lệ đạt"
            value={`${analytics.overview?.pass_rate || 0}%`}
            subtitle={`${analytics.overview?.pass_count || 0}/${analytics.students_with_grades} học sinh`}
            borderColor="border-amber-500"
            bgColor="bg-amber-100"
            textColor="text-amber-600"
            icon={<Award className="w-7 h-7 text-amber-600" />}
          />
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
        {selectedTab === "overview" && <OverviewTab analytics={analytics} />}
        {selectedTab === "attention" && (
          <AttentionTab students={analytics.students_need_attention || []} />
        )}
        {selectedTab === "top" && <TopTab students={analytics.top_students || []} />}
        {selectedTab === "comparison" && (
          <ComparisonTab classComparison={analytics.class_comparison || []} />
        )}
      </div>
    </div>
  );
};

export default SubjectDashboard;
