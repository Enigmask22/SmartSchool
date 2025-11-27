/**
 * AdminDashboard.tsx - Admin Dashboard Page
 * 
 * Refactored from AdminDashboard.jsx:
 * - Extracted state management to useAdminDashboard hook
 * - Added TypeScript types
 * - Organized into sub-components
 * 
 * Features:
 * - System overview metrics
 * - Attendance trends visualization
 * - Class performance rankings
 * - Teacher performance metrics
 * - System health monitoring
 */

import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  AlertTriangle,
  Database,
  UserCheck,
  Award,
  Target,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

/**
 * Header Component
 */
interface HeaderProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

const Header: React.FC<HeaderProps> = ({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  refreshing,
}) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Dashboard Quản Trị</h1>
      <p className="text-gray-600">Tổng quan hệ thống và thống kê chi tiết</p>
    </div>
    <div className="flex items-center space-x-4">
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 ngày</SelectItem>
          <SelectItem value="30">30 ngày</SelectItem>
          <SelectItem value="90">90 ngày</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onRefresh} disabled={refreshing} variant="outline">
        <Activity
          className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
        />
        Làm mới
      </Button>
    </div>
  </div>
);

/**
 * Overview Cards Component
 */
interface OverviewCardsProps {
  overview: any;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ overview }) => {
  if (!overview) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.overview.total_users}
          </div>
          <p className="text-xs text-muted-foreground">
            +{overview.activity.recent_logins} đăng nhập gần đây
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Học Sinh</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.overview.total_students}
          </div>
          <p className="text-xs text-muted-foreground">
            {overview.overview.total_classes} lớp học
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Giáo Viên</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.overview.total_teachers}
          </div>
          <p className="text-xs text-muted-foreground">Đang hoạt động</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tỷ Lệ Điểm Danh</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.attendance_today.rate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {overview.attendance_today.present}/
            {overview.attendance_today.total} hôm nay
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * System Health Component
 */
interface SystemHealthProps {
  systemHealth: any;
}

const SystemHealth: React.FC<SystemHealthProps> = ({ systemHealth }) => {
  if (!systemHealth) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trạng Thái Database</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge
              variant={
                systemHealth.database_status === 'healthy'
                  ? 'default'
                  : 'destructive'
              }
            >
              {systemHealth.database_status === 'healthy'
                ? 'Hoạt động tốt'
                : 'Lỗi'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lỗi 24h</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {systemHealth.error_count_24h}
          </div>
          <p className="text-xs text-muted-foreground">Lỗi hệ thống</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{systemHealth.uptime}</div>
          <p className="text-xs text-muted-foreground">Thời gian hoạt động</p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Attendance Trends Tab Component
 */
interface AttendanceTrendsProps {
  attendanceTrends: any[];
  selectedPeriod: string;
}

const AttendanceTrendsTab: React.FC<AttendanceTrendsProps> = ({
  attendanceTrends,
  selectedPeriod,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <BarChart3 className="w-5 h-5" />
        <span>Xu Hướng Điểm Danh {selectedPeriod} Ngày Qua</span>
      </CardTitle>
      <CardDescription>Biểu đồ tỷ lệ điểm danh theo thời gian</CardDescription>
    </CardHeader>
    <CardContent>
      {attendanceTrends.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  attendanceTrends.reduce((acc, day) => acc + day.present, 0) /
                    attendanceTrends.length
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Trung bình có mặt/ngày
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Math.round(
                  attendanceTrends.reduce((acc, day) => acc + day.absent, 0) /
                    attendanceTrends.length
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Trung bình vắng mặt/ngày
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  attendanceTrends.reduce((acc, day) => acc + day.rate, 0) /
                    attendanceTrends.length
                )}
                %
              </div>
              <p className="text-sm text-muted-foreground">
                Tỷ lệ điểm danh TB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Tỷ lệ điểm danh theo ngày:</h4>
            <div className="space-y-1">
              {attendanceTrends.slice(-7).map((day, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('vi-VN')}
                  </div>
                  <div className="flex-1">
                    <Progress value={day.rate} className="h-2" />
                  </div>
                  <div className="w-16 text-sm font-medium text-right">
                    {day.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Không có dữ liệu điểm danh
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Class Performance Tab Component
 */
interface ClassPerformanceProps {
  classPerformance: any[];
}

const ClassPerformanceTab: React.FC<ClassPerformanceProps> = ({
  classPerformance,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Award className="w-5 h-5" />
        <span>Hiệu Suất Học Tập Theo Lớp</span>
      </CardTitle>
      <CardDescription>Xếp hạng lớp học theo điểm trung bình</CardDescription>
    </CardHeader>
    <CardContent>
      {classPerformance.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lớp</TableHead>
              <TableHead>Số Học Sinh</TableHead>
              <TableHead>Điểm TB</TableHead>
              <TableHead>Xuất Sắc</TableHead>
              <TableHead>Khá</TableHead>
              <TableHead>Trung Bình</TableHead>
              <TableHead>Yếu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classPerformance.map((classData, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {classData.class_name}
                </TableCell>
                <TableCell>{classData.total_students}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      classData.average_grade >= 8
                        ? 'default'
                        : classData.average_grade >= 6.5
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {classData.average_grade}
                  </Badge>
                </TableCell>
                <TableCell className="text-green-600">
                  {classData.excellent_count}
                </TableCell>
                <TableCell className="text-blue-600">
                  {classData.good_count}
                </TableCell>
                <TableCell className="text-yellow-600">
                  {classData.average_count}
                </TableCell>
                <TableCell className="text-red-600">
                  {classData.poor_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Không có dữ liệu điểm số
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Teacher Performance Tab Component
 */
interface TeacherPerformanceProps {
  teacherPerformance: any[];
}

const TeacherPerformanceTab: React.FC<TeacherPerformanceProps> = ({
  teacherPerformance,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <UserCheck className="w-5 h-5" />
        <span>Hiệu Suất Giáo Viên</span>
      </CardTitle>
      <CardDescription>
        Thống kê hiệu suất quản lý lớp của giáo viên
      </CardDescription>
    </CardHeader>
    <CardContent>
      {teacherPerformance.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Giáo Viên</TableHead>
              <TableHead>Mã GV</TableHead>
              <TableHead>Số Lớp</TableHead>
              <TableHead>Tổng Học Sinh</TableHead>
              <TableHead>Tỷ Lệ Điểm Danh</TableHead>
              <TableHead>Ghi Chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teacherPerformance.map((teacher, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {teacher.teacher_name}
                </TableCell>
                <TableCell>{teacher.teacher_code}</TableCell>
                <TableCell>{teacher.classes_count}</TableCell>
                <TableCell>{teacher.total_students}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress
                      value={teacher.attendance_rate}
                      className="w-20 h-2"
                    />
                    <span className="text-sm font-medium">
                      {teacher.attendance_rate}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      teacher.attendance_rate >= 90
                        ? 'default'
                        : teacher.attendance_rate >= 70
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {teacher.attendance_rate >= 90
                      ? 'Xuất sắc'
                      : teacher.attendance_rate >= 70
                        ? 'Tốt'
                        : 'Cần cải thiện'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Không có dữ liệu giáo viên
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * AdminDashboard Component
 */
const AdminDashboard: React.FC = () => {
  const {
    loading,
    refreshing,
    selectedPeriod,
    overview,
    attendanceTrends,
    classPerformance,
    teacherPerformance,
    systemHealth,
    handlePeriodChange,
    handleRefresh,
  } = useAdminDashboard();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gray-50">
      <Header
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <OverviewCards overview={overview} />
      <SystemHealth systemHealth={systemHealth} />

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Điểm Danh</TabsTrigger>
          <TabsTrigger value="performance">Hiệu Suất Lớp</TabsTrigger>
          <TabsTrigger value="teachers">Giáo Viên</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceTrendsTab
            attendanceTrends={attendanceTrends}
            selectedPeriod={selectedPeriod}
          />
        </TabsContent>

        <TabsContent value="performance">
          <ClassPerformanceTab classPerformance={classPerformance} />
        </TabsContent>

        <TabsContent value="teachers">
          <TeacherPerformanceTab teacherPerformance={teacherPerformance} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
