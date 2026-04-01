import {
  Database,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { SystemHealthData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface SystemHealthProps {
  systemHealth: SystemHealthData | null;
  loading?: boolean;
}

export function SystemHealth({ systemHealth, loading = false }: SystemHealthProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Skeleton Card 1 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-6 w-24 mt-2 mb-2" />
            </div>
            <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
              <Database className="text-blue-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>

        {/* Skeleton Card 2 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-red-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12 mt-2 mb-2" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-red-100 w-14 h-14 rounded-xl flex-shrink-0">
              <AlertTriangle className="text-red-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>

        {/* Skeleton Card 3 */}
        <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-emerald-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-20 mt-2 mb-2" />
              <Skeleton className="h-3 w-32 mt-1" />
            </div>
            <div className="flex items-center justify-center bg-emerald-100 w-14 h-14 rounded-xl flex-shrink-0">
              <Clock className="text-emerald-600 w-7 h-7 opacity-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Database Status Card */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-blue-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Trạng Thái Database
            </p>
            <div className="mt-2">
              <Badge
                variant={
                  systemHealth?.database_status === "healthy"
                    ? "default"
                    : "destructive"
                }
              >
                {systemHealth?.database_status === "healthy"
                  ? "Hoạt động tốt"
                  : "Lỗi"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Database className="text-blue-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Error Count Card */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-red-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Lỗi 24h</p>
            <h3 className="mt-2 text-4xl font-bold text-red-600">
              {systemHealth?.error_count_24h || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">Lỗi hệ thống</p>
          </div>
          <div className="flex items-center justify-center bg-red-100 w-14 h-14 rounded-xl flex-shrink-0">
            <AlertTriangle className="text-red-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Uptime Card */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-emerald-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Uptime</p>
            <h3 className="mt-2 text-4xl font-bold text-emerald-600">
              {systemHealth?.uptime || "N/A"}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Thời gian hoạt động
            </p>
          </div>
          <div className="flex items-center justify-center bg-emerald-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Clock className="text-emerald-600 w-7 h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}
