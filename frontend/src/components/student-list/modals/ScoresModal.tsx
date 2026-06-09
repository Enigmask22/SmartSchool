import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  class_name?: string;
  grade?: string;
}

interface ScoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: Student;
  scores: any[];
  loading: boolean;
  hasData: boolean;
  onClose: () => void;
  academicYear?: string;
  semester?: string;
}

export function ScoresModal({
  open,
  onOpenChange,
  selectedStudent,
  scores,
  loading,
  onClose,
  academicYear = "2024-2025",
  semester = "I",
}: ScoresModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Bảng điểm
          </DialogTitle>
          <DialogDescription>
            {selectedStudent?.full_name} - {selectedStudent?.student_id} | Lớp{" "}
            {selectedStudent?.class_name} - Khối {selectedStudent?.grade}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-16 h-16 border-b-2 border-purple-600 rounded-full animate-spin"></div>
              <span className="ml-4 text-lg text-gray-600">
                Đang tải điểm số...
              </span>
            </div>
          ) : scores.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl text-gray-400">📝</div>
              <h4 className="mb-2 text-lg font-medium text-gray-900">
                Chưa có điểm số
              </h4>
              <p className="text-gray-500">
                Học sinh này chưa có điểm số nào được nhập vào hệ thống.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Academic Year & Semester Filter */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Năm học: {academicYear}
                    </h4>
                    <p className="text-sm text-gray-600">Học kỳ: {semester}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Tổng số môn học</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {scores.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grades Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-sm font-medium tracking-wider text-left text-gray-500 uppercase border-b">
                        Môn học
                      </th>
                      <th className="px-6 py-4 text-sm font-medium tracking-wider text-left text-gray-500 uppercase border-b">
                        Giáo viên
                      </th>
                      <th className="px-6 py-4 text-sm font-medium tracking-wider text-center text-gray-500 uppercase border-b">
                        Chi tiết điểm
                      </th>
                      <th className="px-6 py-4 text-sm font-medium tracking-wider text-center text-gray-500 uppercase border-b">
                        Điểm TB
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scores.map((scoreRecord, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-10 h-10 text-sm font-bold rounded-full text-primary-foreground bg-primary">
                              {scoreRecord.subject_name
                                ?.charAt(0)
                                ?.toUpperCase() || "?"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {scoreRecord.subject_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {scoreRecord.class_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {scoreRecord.teacher_name || "Chưa có thông tin"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {scoreRecord.academic_year} - {scoreRecord.semester}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-center gap-2">
                            {scoreRecord.score_data &&
                              (() => {
                                const getPriority = (name) => {
                                  const s = String(name || "").toLowerCase();
                                  if (s.includes("thuong")) return 0;
                                  if (s.includes("giua")) return 1;
                                  if (
                                    s.includes("cuoi") ||
                                    s.includes("hk") ||
                                    s.includes("final")
                                  )
                                    return 2;
                                  return 99;
                                };
                                const keys = Object.keys(
                                  scoreRecord.score_data,
                                )
                                  .filter(
                                    (key) =>
                                      key !== "Mon_hoc" &&
                                      scoreRecord.score_data[key]?.Diem !==
                                        undefined &&
                                      scoreRecord.score_data[key]?.Diem !==
                                        null &&
                                      scoreRecord.score_data[key]?.Diem !== "",
                                  )
                                  .sort((a, b) => {
                                    const wa = Number(
                                      scoreRecord.score_data[a]?.He_so ?? 1,
                                    );
                                    const wb = Number(
                                      scoreRecord.score_data[b]?.He_so ?? 1,
                                    );
                                    if (wa !== wb) return wa - wb;
                                    return getPriority(a) - getPriority(b);
                                  });
                                const LABEL_MAP = {
                                  Diem_thuong_xuyen: "Điểm thường xuyên",
                                  Diem_thi_giua_ki: "Điểm thi giữa kì",
                                  Diem_thi_cuoi_ki: "Điểm thi cuối kì",
                                };
                                const formatLabel = (key) => {
                                  if (LABEL_MAP[key]) return LABEL_MAP[key];
                                  let text = String(key || "").replace(
                                    /_/g,
                                    " ",
                                  );
                                  text = text.replace(/Diem/g, "Điểm");
                                  text = text.replace(/thuong/g, "thường");
                                  text = text.replace(/xuyen/g, "xuyên");
                                  text = text.replace(/giua/g, "giữa");
                                  text = text.replace(/cuoi/g, "cuối");
                                  text = text.replace(/ki\b/g, "kì");
                                  return text;
                                };
                                return keys.map((columnName) => (
                                  <div
                                    key={columnName}
                                    className="px-3 py-1 border border-blue-200 rounded-lg bg-blue-50"
                                  >
                                    <div className="text-xs font-medium text-blue-600">
                                      {formatLabel(columnName)}
                                    </div>
                                    <div className="text-sm font-bold text-blue-800">
                                      {
                                        scoreRecord.score_data[columnName]
                                          ?.Diem
                                      }
                                      <span className="ml-1 text-xs text-blue-600">
                                        (HS:{" "}
                                        {
                                          scoreRecord.score_data[columnName]
                                            ?.He_so
                                        }
                                        )
                                      </span>
                                    </div>
                                  </div>
                                ));
                              })()}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${(() => {
                              const score = scoreRecord.final_score;
                              const numericScore =
                                typeof score === "string"
                                  ? parseFloat(score)
                                  : score;
                              if (numericScore === null || isNaN(numericScore)) {
                                return "bg-gray-100 text-gray-800";
                              }
                              if (numericScore >= 8.0)
                                return "bg-green-100 text-green-800";
                              if (numericScore >= 6.5)
                                return "bg-yellow-100 text-yellow-800";
                              if (numericScore >= 5.0)
                                return "bg-orange-100 text-orange-800";
                              return "bg-red-100 text-red-800";
                            })()}`}
                          >
                            {scoreRecord.final_score}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="p-6 rounded-lg bg-muted/50">
                <h4 className="flex items-center gap-2 mb-3 font-medium text-gray-900">
                  <TrendingUp className="w-5 h-5 text-gray-700" /> Tổng kết
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(() => {
                    // Lọc điểm số (bỏ qua điểm chữ Đ/KĐ)
                    const numericScores = scores
                      .map((s) => {
                        const fs = s.final_score;
                        if (fs === null || fs === undefined) return null;
                        if (typeof fs === "string" && (fs === "Đ" || fs === "KĐ")) return null;
                        const num = typeof fs === "string" ? parseFloat(fs) : fs;
                        return typeof num === "number" && !isNaN(num) ? num : null;
                      })
                      .filter((v) => v !== null) as number[];

                    const avgScore = numericScores.length > 0
                      ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(2)
                      : "0.00";

                    const highCount = numericScores.filter((s) => s >= 8.0).length;
                    const lowCount = numericScores.filter((s) => s < 5.0).length;

                    return (
                      <>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">
                            Điểm trung bình chung
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            {avgScore}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Số môn &gt;= 8.0</p>
                          <p className="text-2xl font-bold text-green-600">
                            {highCount}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Số môn &lt; 5.0</p>
                          <p className="text-2xl font-bold text-red-600">
                            {lowCount}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 rounded-b-lg bg-gray-50">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
