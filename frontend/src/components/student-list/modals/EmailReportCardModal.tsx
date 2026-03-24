import React from "react";
import { Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Student {
  id?: number;
  full_name?: string;
  student_id?: string;
}

interface EmailReportCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: Student;
  emailRecipient: string;
  emailSending: boolean;
  emailError: string;
  emailSuccess: boolean;
  generatedFeedback: string;
  semester?: string;
  selectedSemester?: string;
  academicYear?: string;
  selectedAcademicYear?: string;
  onEmailRecipientChange: (email: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export function EmailReportCardModal({
  open,
  onOpenChange,
  selectedStudent,
  emailRecipient,
  emailSending,
  emailError,
  emailSuccess,
  generatedFeedback,
  semester,
  selectedSemester,
  academicYear,
  selectedAcademicYear,
  onEmailRecipientChange,
  onSend,
  onClose,
}: EmailReportCardModalProps) {
  const displaySemester = semester || selectedSemester;
  const displayAcademicYear = academicYear || selectedAcademicYear;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Gửi phiếu điểm qua email
          </DialogTitle>
          <DialogDescription>
            {selectedStudent?.full_name} -{" "}
            {selectedStudent?.student_id}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Email Success */}
          {emailSuccess && (
            <div className="p-3 border border-green-200 rounded-md bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Đã gửi phiếu điểm thành công đến {emailRecipient}!
                </p>
              </div>
            </div>
          )}

          {/* Email Error */}
          {emailError && (
            <div className="p-3 border border-red-200 rounded-md bg-red-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-800">{emailError}</p>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <Label
              htmlFor="email-recipient"
              className="text-sm font-medium text-gray-700"
            >
              Email phụ huynh
            </Label>
            <Input
              id="email-recipient"
              type="email"
              placeholder="phuhuynh@example.com"
              value={emailRecipient}
              onChange={(e) => onEmailRecipientChange(e.target.value)}
              className="mt-1"
              disabled={emailSending}
            />
            <p className="mt-1 text-xs text-gray-500">
              Email sẽ được lưu lại cho lần gửi sau.
            </p>
          </div>

          {/* Preview info */}
          <div className="p-3 rounded-md bg-gray-50">
            <p className="mb-1 text-xs font-medium text-gray-500 uppercase">
              Nội dung gửi
            </p>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>
                📊 Bảng điểm chi tiết ({displaySemester || "HK1"})
              </li>
              <li>
                💬 Nhận xét:{" "}
                {generatedFeedback
                  ? `"${generatedFeedback.substring(0, 60)}..."`
                  : "Chưa có"}
              </li>
              <li>🎓 Năm học: {displayAcademicYear || "N/A"}</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={emailSending}
          >
            {emailSuccess ? "Đóng" : "Hủy"}
          </Button>
          {!emailSuccess && (
            <Button
              onClick={onSend}
              disabled={emailSending || !emailRecipient}
              className="text-white bg-blue-600 hover:bg-blue-700"
            >
              {emailSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Gửi email
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
