import {
  Users,
  GraduationCap,
  UserCheck,
  Target,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminOverviewData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface OverviewCardsProps {
  overview: AdminOverviewData | null;
  loading?: boolean;
}

export function OverviewCards({ overview, loading = false }: OverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Skeleton Card 1 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mt-2 mb-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
              <Users className="text-blue-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>

        {/* Skeleton Card 2 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-slate-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mt-2 mb-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-slate-100 w-14 h-14 rounded-xl flex-shrink-0">
              <GraduationCap className="text-slate-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>

        {/* Skeleton Card 3 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-emerald-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mt-2 mb-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-emerald-100 w-14 h-14 rounded-xl flex-shrink-0">
              <UserCheck className="text-emerald-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>

        {/* Skeleton Card 4 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-amber-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mt-2 mb-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-amber-100 w-14 h-14 rounded-xl flex-shrink-0">
              <Target className="text-amber-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1 - Total Users */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-blue-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tổng Người Dùng</p>
            <h3 className="mt-2 text-4xl font-bold text-blue-600">
              {overview?.overview.total_users || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              +{overview?.activity.recent_logins || 0} đăng nhập gần đây
            </p>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Users className="text-blue-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Card 2 - Students */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-slate-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Học Sinh</p>
            <h3 className="mt-2 text-4xl font-bold text-slate-700">
              {overview?.overview.total_students || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.overview.total_classes || 0} lớp học
            </p>
          </div>
          <div className="flex items-center justify-center bg-slate-100 w-14 h-14 rounded-xl flex-shrink-0">
            <GraduationCap className="text-slate-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Card 3 - Teachers */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-emerald-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Giáo Viên</p>
            <h3 className="mt-2 text-4xl font-bold text-emerald-600">
              {overview?.overview.total_teachers || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Đang hoạt động</p>
          </div>
          <div className="flex items-center justify-center bg-emerald-100 w-14 h-14 rounded-xl flex-shrink-0">
            <UserCheck className="text-emerald-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Card 4 - Attendance Rate */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-amber-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tỷ Lệ Điểm Danh</p>
            <h3 className="mt-2 text-4xl font-bold text-amber-600">
              {overview?.attendance_today.rate || 0}%
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.attendance_today.present || 0}/
              {overview?.attendance_today.total || 0} hôm nay
            </p>
          </div>
          <div className="flex items-center justify-center bg-amber-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Target className="text-amber-600 w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}