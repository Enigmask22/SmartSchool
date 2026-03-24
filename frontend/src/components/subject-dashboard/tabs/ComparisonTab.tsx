import { TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "@/hooks/subject-dashboard/useSubjectDashboard";

interface ComparisonTabProps {
  data: AnalyticsData;
  loading?: boolean;
}

export function ComparisonTab({ data, loading = false }: ComparisonTabProps) {
  const classes = data?.class_comparison || [];

  if (loading) {
    return (
      <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
        <div className="px-6 py-4 bg-teal-600">
          <Skeleton className="h-6 w-64 bg-teal-200" />
          <Skeleton className="h-4 w-96 mt-2 bg-teal-200" />
        </div>
        <div className="px-6 py-4 space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="flex items-center justify-between py-2">
              <Skeleton className="h-4 w-96" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center bg-white border-2 border-teal-200 shadow-lg rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50">
            <TrendingDown className="w-8 h-8 text-teal-500" />
          </div>
          <p className="font-medium text-teal-600">
            Chưa có dữ liệu để so sánh
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
      <div className="px-6 py-4 bg-teal-600">
        <h3 className="flex items-center text-xl font-bold text-white">
          <TrendingDown className="w-5 h-5 mr-2" />
          So sánh thành tích các lớp
        </h3>
        <p className="mt-1 text-sm text-teal-100">
          Bảng so sánh điểm trung bình và tỷ lệ đạt của các lớp
        </p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-6 py-4 space-y-2 bg-white">
            {[...Array(5)].map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                  Lớp
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                  Điểm trung bình
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                  Tỷ lệ đạt
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                  Xếp hạng
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classComp, index) => (
                <tr key={index} className="transition-colors hover:bg-teal-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {classComp.class_name}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full text-white bg-blue-600">
                    {typeof classComp.average_score === "number"
                      ? classComp.average_score.toFixed(2)
                      : classComp.average_score}
                  </span>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full text-white bg-green-600">
                    {classComp.pass_rate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="secondary">#{index + 1}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
