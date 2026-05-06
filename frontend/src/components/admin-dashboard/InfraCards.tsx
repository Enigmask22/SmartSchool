import { BookMarked, Camera, ScanFace } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfraStatsData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface InfraCardsProps {
  infraStats: InfraStatsData | null;
  loading?: boolean;
}

export function InfraCards({ infraStats, loading = false }: InfraCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { border: "border-l-violet-500", bg: "bg-violet-100", Icon: BookMarked, color: "text-violet-600" },
          { border: "border-l-cyan-500", bg: "bg-cyan-100", Icon: Camera, color: "text-cyan-600" },
          { border: "border-l-rose-500", bg: "bg-rose-100", Icon: ScanFace, color: "text-rose-600" },
        ].map(({ border, bg, Icon, color }, i) => (
          <div key={i} className={`p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl ${border}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Môn học */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-violet-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Môn Học</p>
            <h3 className="mt-2 text-4xl font-bold text-violet-600">
              {infraStats?.total_subjects ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Đang hoạt động</p>
          </div>
          <div className="flex items-center justify-center bg-violet-100 w-14 h-14 rounded-xl flex-shrink-0">
            <BookMarked className="text-violet-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Camera */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-cyan-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Camera</p>
            <h3 className="mt-2 text-4xl font-bold text-cyan-600">
              {infraStats?.total_cameras ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Đang kích hoạt</p>
          </div>
          <div className="flex items-center justify-center bg-cyan-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Camera className="text-cyan-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Đã đăng ký khuôn mặt */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-rose-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Đã Đăng Ký Khuôn Mặt</p>
            <h3 className="mt-2 text-4xl font-bold text-rose-600">
              {infraStats?.students_with_face ?? 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Học sinh có dữ liệu nhận diện</p>
          </div>
          <div className="flex items-center justify-center bg-rose-100 w-14 h-14 rounded-xl flex-shrink-0">
            <ScanFace className="text-rose-600 w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}
