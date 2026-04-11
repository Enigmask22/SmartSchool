import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Download,
  Mail,
} from "lucide-react";

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  class_name?: string;
  grade?: string;
}

interface FeedbackForm {
  student_name: string;
  score: string;
  top_subjects: string[];
  weak_subjects: string[];
  attendance_rate?: string;
  notes?: string;
}

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: Student;
  form: FeedbackForm;
  onFormChange: (field: string, value: any) => void;
  loading: boolean;
  feedbackLoading?: boolean;
  error?: string;
  success?: boolean;
  hasScoreData: boolean;
  generatedFeedback: string;
  onGeneratedFeedbackChange: (value: string) => void;
  onGenerateFeedback: () => void;
  onSaveComment: () => void;
  onClose: () => void;
  smsLoading?: boolean;
  exportStudentReportCard?: () => void;
  openEmailDialog?: () => void;
}

export function FeedbackModal({
  open,
  onOpenChange,
  selectedStudent,
  form,
  onFormChange,
  feedbackLoading = false,
  error,
  success,
  hasScoreData,
  generatedFeedback,
  onGeneratedFeedbackChange,
  onGenerateFeedback,
  onSaveComment,
  onClose,
  smsLoading = false,
  exportStudentReportCard,
  openEmailDialog,
}: FeedbackModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) =>
        !newOpen ? onClose() : onOpenChange(newOpen)
      }
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Tạo nhận xét
            học sinh
          </DialogTitle>
          <DialogDescription>
            {selectedStudent?.full_name} - {selectedStudent?.student_id} | Lớp{" "}
            {selectedStudent?.class_name} - Khối {selectedStudent?.grade}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Content */}
        <div className="p-6">
          {/* Error Alert */}
          {error && (
            <div className="p-4 mb-4 border border-red-200 rounded-md bg-red-50">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="p-4 mb-4 border border-green-200 rounded-md bg-green-50">
              <div className="flex">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    Tạo nhận xét thành công!
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Input Form */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Thông Tin Học Sinh
                </h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Student Name */}
                <div>
                  <label
                    htmlFor="student_name"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Tên Học Sinh
                  </label>
                  <input
                    id="student_name"
                    type="text"
                    value={form?.student_name || ""}
                    onChange={(e) =>
                      onFormChange("student_name", e.target.value)
                    }
                    placeholder="Nhập tên học sinh"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    readOnly
                  />
                </div>

                {/* Score */}
                <div>
                  <label
                    htmlFor="score"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Điểm trung bình học kì
                  </label>
                  <input
                    id="score"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form?.score || ""}
                    onChange={(e) => onFormChange("score", e.target.value)}
                    placeholder="8.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Subject Highlights */}
                {(Array.isArray(form?.top_subjects) &&
                  form.top_subjects.length > 0) ||
                (Array.isArray(form?.weak_subjects) &&
                  form.weak_subjects.length > 0) ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Array.isArray(form?.top_subjects) &&
                      form.top_subjects.length > 0 && (
                        <div>
                          <p className="mb-1 text-sm font-medium text-green-700">
                            Những môn học tốt
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {form.top_subjects.map((s, idx) => (
                              <Badge
                                key={`top-${idx}`}
                                className="text-green-800 border-green-200 bg-green-50"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {Array.isArray(form?.weak_subjects) &&
                      form.weak_subjects.length > 0 && (
                        <div>
                          <p className="mb-1 text-sm font-medium text-red-700">
                            Những môn cần cải thiện
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {form.weak_subjects.map((s, idx) => (
                              <Badge
                                key={`weak-${idx}`}
                                className="text-red-800 border-red-200 bg-red-50"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-red-500">
                            Chỉ liệt kê các môn có điểm trung bình &lt; 8.0
                          </p>
                        </div>
                      )}
                  </div>
                ) : null}

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block mb-1 text-sm font-medium text-gray-700"
                  >
                    Ghi Chú Thêm (Tùy chọn)
                  </label>
                  <textarea
                    id="notes"
                    value={form?.notes || ""}
                    onChange={(e) => onFormChange("notes", e.target.value)}
                    placeholder="Mặc định: học sinh chuyên cần 100%. Nếu có vắng mặt/chuyên cần kém, vui lòng ghi rõ tại đây (ví dụ: vắng 2 buổi do ốm, hay thường xuyên đi học muộn, ...)."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Generate Button */}
                {!hasScoreData && (
                  <div className="p-3 mb-2 text-sm text-yellow-800 border border-yellow-200 rounded bg-yellow-50">
                    ⚠️ Cần có dữ liệu điểm của học sinh để tạo nhận xét.
                  </div>
                )}
                <button
                  onClick={onGenerateFeedback}
                  disabled={feedbackLoading || !hasScoreData}
                  className="flex items-center justify-center w-full px-4 py-2 font-medium text-white transition-colors bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {feedbackLoading ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2 -ml-1 text-white animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      <span>Tạo Nhận Xét</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Display */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Nhận Xét Được Tạo
                </h3>
              </div>
              <div className="px-6 py-4">
                {generatedFeedback ? (
                  <div className="space-y-4">
                    <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                      <div className="flex items-start gap-3">
                        <MessageCircle className="flex-shrink-0 w-5 h-5 mt-1 text-indigo-600" />
                        <div className="flex-1">
                          <h4 className="mb-2 font-medium text-indigo-900">
                            Nhận xét cho {form?.student_name} (có thể
                            chỉnh sửa trước khi gửi):
                          </h4>
                          <textarea
                            value={generatedFeedback}
                            onChange={(e) => onGeneratedFeedbackChange(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <p className="mt-2 text-xs text-indigo-700">
                            Bạn có thể điều chỉnh câu chữ/chi tiết trước khi
                            gửi cho phụ huynh hoặc xuất phiếu điểm.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Save Comment Button */}
                    <button
                      onClick={onSaveComment}
                      disabled={smsLoading}
                      className="flex items-center justify-center w-full px-4 py-2 font-medium text-white transition-colors bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {smsLoading ? (
                        <>
                          <svg
                            className="w-4 h-4 mr-2 -ml-1 text-white animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Đang lưu...
                        </>
                      ) : (
                        <>Lưu nhận xét</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
                    <p>
                      Nhấn "Tạo nhận xét" để AI tự động tạo nhận xét cho học
                      sinh
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 rounded-b-lg bg-gray-50">
          <div className="flex items-center justify-between">
            {generatedFeedback && (
              <div className="flex items-center gap-2">
                {exportStudentReportCard && (
                  <Button
                    onClick={exportStudentReportCard}
                    className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    Xuất phiếu điểm
                  </Button>
                )}
                {openEmailDialog && (
                  <Button
                    onClick={openEmailDialog}
                    className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4" />
                    Gửi email
                  </Button>
                )}
              </div>
            )}
            <div className="ml-auto">
              <Button variant="secondary" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
