import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsData } from "@/hooks/useSubjectDashboard";

interface TopStudentsTabProps {
  data: AnalyticsData;
}

export function TopStudentsTab({ data }: TopStudentsTabProps) {
  const students = data?.top_students || [];

  if (!students || students.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center bg-white border-2 border-amber-200 shadow-lg rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <p className="font-medium text-amber-600">
            Chưa có học sinh xuất sắc
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
      <div className="px-6 py-4 bg-amber-600">
        <h3 className="flex items-center text-xl font-bold text-white">
          <Trophy className="w-5 h-5 mr-2" />
          Học sinh xuất sắc ({students.length} học sinh)
        </h3>
        <p className="mt-1 text-sm text-amber-100">
          Danh sách học sinh có thành tích học tập xuất sắc
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                STT
              </th>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                Mã HS
              </th>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                Họ và tên
              </th>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                Lớp
              </th>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                Điểm
              </th>
              <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                Hạng
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student, index) => (
              <tr key={index} className="transition-colors hover:bg-amber-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600">
                    {student.student_id}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {index < 3 && (
                      <Trophy
                        className={`w-5 h-5 ${
                          index === 0
                            ? "text-amber-500"
                            : index === 1
                              ? "text-gray-400"
                              : "text-orange-600"
                        }`}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {student.student_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-3 py-1 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full">
                    {student.class_name}
                  </span>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full text-white bg-green-600">
                    {student.final_score}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="outline" className="text-amber-700">
                    {index === 0 && "🥇 Vàng"}
                    {index === 1 && "🥈 Bạc"}
                    {index === 2 && "🥉 Đồng"}
                    {index > 2 && `Thứ ${index + 1}`}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
