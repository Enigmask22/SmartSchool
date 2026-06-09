import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsData } from "@/hooks/subject-dashboard/useSubjectDashboard";

interface AttentionTabProps {
  data: AnalyticsData;
  loading?: boolean;
  hidden?: boolean;
}

export function AttentionTab({ data, loading = false, hidden = false }: AttentionTabProps) {
  if (hidden) return null;
  
  const students = data?.students_need_attention || [];
  const isChar = data?.is_letter_grade_subject;

  if (loading) {
    return (
      <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
        <div className="px-6 py-4 bg-destructive">
          <Skeleton className="h-6 w-64 bg-red-200" />
          <Skeleton className="h-4 w-96 mt-2 bg-red-200" />
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
                  Điểm TB
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                  Phân loại
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, idx) => (
                <tr key={idx} className="hover:bg-red-50">
                  <td className="px-6 py-4"><Skeleton className="h-4 w-6" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center bg-white border-2 border-green-200 shadow-lg rounded-2xl">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-50">
            <AlertTriangle className="w-8 h-8 text-green-500" />
          </div>
          <p className="font-medium text-green-600">
            {isChar ? "Tất cả học sinh đều Đạt" : "Không có học sinh cần quan tâm"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-lg rounded-2xl">
      <div className="px-6 py-4 bg-destructive">
        <h3 className="flex items-center text-xl font-bold text-white">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Học sinh cần quan tâm ({students.length} học sinh)
        </h3>
        <p className="mt-1 text-sm text-red-100">
          {isChar ? "Danh sách học sinh Không Đạt" : "Danh sách học sinh có điểm yếu và kém cần được hỗ trợ thêm"}
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
                  Điểm TB
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase">
                  Phân loại
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student, index) => (
                <tr key={index} className="transition-colors hover:bg-red-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600">
                    {student.student_id}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {student.student_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-3 py-1 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full">
                    {student.class_name}
                  </span>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {isChar ? (
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full text-white bg-red-600">
                      KĐ
                    </span>
                  ) : (
                    <span
                      className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${
                        (() => {
                          const grade = student.final_score;
                          const numericGrade =
                            typeof grade === "string" ? parseFloat(grade) : grade;
                          if (numericGrade < 5)
                            return "text-white bg-red-600";
                          if (numericGrade < 7)
                            return "text-white bg-orange-600";
                          return "text-white bg-yellow-600";
                        })()
                      }`}
                    >
                      {student.final_score}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isChar
                        ? "text-red-800 bg-red-100"
                        : (() => {
                            const grade = student.final_score;
                            const numericGrade =
                              typeof grade === "string" ? parseFloat(grade) : grade;
                            if (numericGrade < 5)
                              return "text-red-800 bg-red-100";
                            if (numericGrade < 7)
                              return "text-orange-800 bg-orange-100";
                            return "text-yellow-800 bg-yellow-100";
                          })()
                    }`}
                  >
                    {isChar
                      ? "KĐ"
                      : (() => {
                          const grade = student.final_score;
                          const numericGrade =
                            typeof grade === "string" ? parseFloat(grade) : grade;
                          if (numericGrade < 5) return "Kém";
                          if (numericGrade < 7) return "Yếu";
                          return "TB";
                        })()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
