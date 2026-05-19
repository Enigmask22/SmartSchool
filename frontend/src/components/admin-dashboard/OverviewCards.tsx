import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminOverviewData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface OverviewCardsProps {
  overview: AdminOverviewData | null;
  selectedAcademicYear?: string;
  loading?: boolean;
}

export function OverviewCards({ overview, selectedAcademicYear, loading = false }: OverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { border: "border-l-blue-500", bg: "bg-blue-100", Icon: GraduationCap, color: "text-blue-600" },
          { border: "border-l-slate-500", bg: "bg-slate-100", Icon: Users, color: "text-slate-600" },
          { border: "border-l-emerald-500", bg: "bg-emerald-100", Icon: BookOpen, color: "text-emerald-600" },
          { border: "border-l-amber-500", bg: "bg-amber-100", Icon: CalendarCheck, color: "text-amber-600" },
        ].map(({ border, bg, Icon, color }, i) => (
          <div key={i} className={`p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl ${border}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-9 w-16 mt-2 mb-2" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
              <div className={`flex items-center justify-center ${bg} w-14 h-14 rounded-xl flex-shrink-0`}>
                <Icon className={`${color} w-7 h-7`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Học sinh */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-blue-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Học Sinh</p>
            <h3 className="mt-2 text-4xl font-bold text-blue-600">
              {overview?.total_students ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Đang học tại trường</p>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
            <GraduationCap className="text-blue-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Giáo viên */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-slate-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Giáo Viên</p>
            <h3 className="mt-2 text-4xl font-bold text-slate-700">
              {overview?.total_teachers ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Đang hoạt động</p>
          </div>
          <div className="flex items-center justify-center bg-slate-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Users className="text-slate-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Lớp học */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-emerald-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Lớp Học</p>
            <h3 className="mt-2 text-4xl font-bold text-emerald-600">
              {overview?.total_classes ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Năm học hiện tại</p>
          </div>
          <div className="flex items-center justify-center bg-emerald-100 w-14 h-14 rounded-xl flex-shrink-0">
            <BookOpen className="text-emerald-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Tỷ lệ điểm danh */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-amber-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tỷ Lệ Điểm Danh</p>
            <h3 className="mt-2 text-4xl font-bold text-amber-600">
              {overview?.attendance_rate ?? 0}%
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Năm học {selectedAcademicYear || overview?.academic_year || "hiện tại"}
            </p>
          </div>
          <div className="flex items-center justify-center bg-amber-100 w-14 h-14 rounded-xl flex-shrink-0">
            <CalendarCheck className="text-amber-600 w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}