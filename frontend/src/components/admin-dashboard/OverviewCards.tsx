import {
  Users,
  GraduationCap,
  UserCheck,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminOverviewData } from "@/hooks/useAdminDashboard";

interface OverviewCardsProps {
  overview: AdminOverviewData | null;
}

export function OverviewCards({ overview }: OverviewCardsProps) {
  if (!overview) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tổng Người Dùng
          </CardTitle>
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
          <CardTitle className="text-sm font-medium">
            Tỷ Lệ Điểm Danh
          </CardTitle>
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
}
