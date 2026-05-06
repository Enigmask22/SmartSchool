import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ClassPerformanceData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface ClassPerformanceTabProps {
  classPerformance: ClassPerformanceData[];
  loading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 8.0) return "#22c55e";
  if (score >= 6.5) return "#2563eb";
  return "#f87171";
}

export function ClassPerformanceTab({
  classPerformance,
  loading = false,
}: ClassPerformanceTabProps) {
  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="p-6 bg-white border-2 shadow-md rounded-2xl">
        <h3 className="flex items-center mb-4 text-xl font-bold text-gray-800">
          <Award className="w-5 h-5 mr-2" />
          Điểm trung bình theo lớp
        </h3>

        {loading ? (
          <Skeleton className="w-full h-72" />
        ) : classPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={classPerformance}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 40, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 10]}
                tick={{ fill: "#6B7280", fontSize: 11 }}
                tickCount={6}
              />
              <YAxis
                type="category"
                dataKey="class_name"
                tick={{ fill: "#6B7280", fontSize: 11 }}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                formatter={(value: number) => [`${value}`, "Điểm TB"]}
              />
              <Bar dataKey="average_score" name="Điểm TB" radius={[0, 6, 6, 0]}>
                {classPerformance.map((entry, index) => (
                  <Cell key={index} fill={scoreColor(entry.average_score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-72 text-gray-400">
            Không có dữ liệu điểm số
          </div>
        )}
      </div>

      {/* Detail table */}
      {!loading && classPerformance.length > 0 && (
        <div className="p-6 bg-white border-2 shadow-md rounded-2xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Chi tiết phân loại học lực</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lớp</TableHead>
                <TableHead className="text-center">Học Sinh</TableHead>
                <TableHead className="text-center">Điểm TB</TableHead>
                <TableHead className="text-center">Xuất Sắc</TableHead>
                <TableHead className="text-center">Khá</TableHead>
                <TableHead className="text-center">Trung Bình</TableHead>
                <TableHead className="text-center">Yếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classPerformance.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.class_name}</TableCell>
                  <TableCell className="text-center">{row.total_students}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        row.average_score >= 8 ? "default" : row.average_score >= 6.5 ? "secondary" : "destructive"
                      }
                    >
                      {row.average_score}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-green-600">{row.excellent_count}</TableCell>
                  <TableCell className="text-center text-blue-600">{row.good_count}</TableCell>
                  <TableCell className="text-center text-yellow-600">{row.average_count}</TableCell>
                  <TableCell className="text-center text-red-600">{row.poor_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
