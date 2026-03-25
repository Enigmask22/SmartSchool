import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AttendanceTrend } from "@/hooks/admin-dashboard/useAdminDashboard";

interface AttendanceTrendsTabProps {
  attendanceTrends: AttendanceTrend[];
  selectedPeriod: string;
  loading?: boolean;
}

export function AttendanceTrendsTab({
  attendanceTrends,
  selectedPeriod,
  loading = false,
}: AttendanceTrendsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Xu Hướng Điểm Danh {selectedPeriod} Ngày Qua</span>
        </CardTitle>
        <CardDescription>
          Biểu đồ tỷ lệ điểm danh theo thời gian
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {/* Skeleton stats grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-8 w-16 rounded bg-muted animate-pulse mx-auto mb-2"></div>
                  <div className="h-3 w-full rounded bg-muted animate-pulse"></div>
                </div>
              ))}
            </div>
            {/* Skeleton chart rows */}
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-3 w-16 rounded bg-muted animate-pulse"></div>
                    <div className="flex-1 h-2 rounded bg-muted animate-pulse"></div>
                    <div className="h-3 w-12 rounded bg-muted animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : attendanceTrends.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(
                    attendanceTrends.reduce(
                      (acc, day) => acc + day.present,
                      0
                    ) / attendanceTrends.length
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Trung bình có mặt/ngày
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {Math.round(
                    attendanceTrends.reduce(
                      (acc, day) => acc + day.absent,
                      0
                    ) / attendanceTrends.length
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Trung bình vắng mặt/ngày
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    attendanceTrends.reduce(
                      (acc, day) => acc + day.rate,
                      0
                    ) / attendanceTrends.length
                  )}
                  %
                </div>
                <p className="text-sm text-muted-foreground">
                  Tỷ lệ điểm danh TB
                </p>
              </div>
            </div>

            {/* Simple Chart Representation */}
            <div className="space-y-2">
              <h4 className="font-medium">Tỷ lệ điểm danh theo ngày:</h4>
              <div className="space-y-1">
                {attendanceTrends.slice(-7).map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-20 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("vi-VN")}
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
}
