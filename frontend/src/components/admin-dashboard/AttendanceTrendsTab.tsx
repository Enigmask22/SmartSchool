import { BarChart3, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AttendanceTrend } from "@/hooks/admin-dashboard/useAdminDashboard";

const PERIOD_OPTIONS = [
  { value: "7", label: "7 ngày" },
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "0", label: "Toàn bộ" },
];

interface AttendanceTrendsTabProps {
  attendanceTrends: AttendanceTrend[];
  attendancePeriod: string;
  isCurrentYear: boolean;
  onPeriodChange: (period: string) => void;
  loading?: boolean;
}

export function AttendanceTrendsTab({
  attendanceTrends,
  attendancePeriod,
  isCurrentYear,
  onPeriodChange,
  loading = false,
}: AttendanceTrendsTabProps) {
  const avgPresent = attendanceTrends.length
    ? Math.round(attendanceTrends.reduce((s, d) => s + d.present, 0) / attendanceTrends.length)
    : 0;
  const avgAbsent = attendanceTrends.length
    ? Math.round(attendanceTrends.reduce((s, d) => s + d.absent, 0) / attendanceTrends.length)
    : 0;
  const avgRate = attendanceTrends.length
    ? Math.round(attendanceTrends.reduce((s, d) => s + d.rate, 0) / attendanceTrends.length)
    : 0;

  const chartData = attendanceTrends.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }),
  }));

  const periodLabel =
    attendancePeriod === "0"
      ? "toàn bộ năm học"
      : `${attendancePeriod} ngày gần nhất`;

  return (
    <div className="p-6 bg-white border-2 shadow-md rounded-2xl">
      {/* Header row with inline period selector */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="flex items-center text-xl font-bold text-gray-800">
          <BarChart3 className="w-5 h-5 mr-2" />
          Xu hướng điểm danh — {periodLabel}
        </h3>
        <div className="flex items-center gap-2">
          {!isCurrentYear && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              Năm đã qua — hiển thị toàn bộ
            </span>
          )}
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => {
              const isLocked = !isCurrentYear && opt.value !== "0";
              const isActive = attendancePeriod === opt.value;
              return (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  disabled={isLocked}
                  onClick={() => onPeriodChange(opt.value)}
                  className="text-xs h-8 px-3"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-600">{avgPresent}</p>
          <p className="text-xs text-gray-500 mt-1">Trung bình có mặt/ngày</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <p className="text-2xl font-bold text-red-500">{avgAbsent}</p>
          <p className="text-xs text-gray-500 mt-1">Trung bình vắng/ngày</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">{avgRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Tỷ lệ điểm danh TB</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="w-full h-72" />
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fill: "#6B7280", fontSize: 11 }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#6B7280", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "rate") return [`${value}%`, "Tỷ lệ"];
                if (name === "present") return [value, "Có mặt"];
                return [value, "Vắng"];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "present" ? "Có mặt" : value === "absent" ? "Vắng mặt" : "Tỷ lệ (%)"
              }
            />
            <Bar yAxisId="left" dataKey="present" fill="#22c55e" name="present" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="absent" fill="#f87171" name="absent" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rate"
              name="rate"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-72 text-gray-400">
          Không có dữ liệu điểm danh trong khoảng thời gian này
        </div>
      )}
    </div>
  );
}
