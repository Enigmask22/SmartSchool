import { Target, BarChart3 } from "lucide-react";
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
import type { AnalyticsData } from "@/hooks/useSubjectDashboard";

interface OverviewTabProps {
  data: AnalyticsData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  if (!data) {
    return null;
  }

  // Prepare data for charts
  const performanceData = Object.entries(data.performance_groups || {}).map(
    ([key, value]) => ({
      name: value.label,
      count: value.count,
      percentage: value.percentage,
      color: value.color,
    })
  );

  const distributionData = Object.entries(data.score_distribution || {}).map(
    ([range, count]) => ({
      range,
      count,
    })
  );

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
              formatter={(value: any, name: any, props: any) => [
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
                {data.overview?.highest_score || 0}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-600">Điểm trung bình</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.overview?.average_score || 0}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-600">Điểm thấp nhất</p>
              <p className="text-2xl font-bold text-red-600">
                {data.overview?.lowest_score || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
