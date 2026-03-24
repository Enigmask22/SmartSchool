import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Target, ClipboardList, Check } from "lucide-react";

interface Subject {
  id?: number;
  subject_code?: string;
  subject_name?: string;
  name?: string;
  code?: string;
  is_mandatory?: boolean;
}

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  class_name?: string;
  grade?: string;
}

interface SubjectSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: Student;
  availableSubjects: Subject[];
  selectedSubjects: {
    core_subjects: (string | number)[];
    elective_subjects: (string | number)[];
  };
  onToggleSubject: (subjectId: string | number, type?: string) => void;
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function SubjectSelectionModal({
  open,
  onOpenChange,
  selectedStudent,
  availableSubjects,
  selectedSubjects,
  onToggleSubject,
  loading,
  onSave,
  onClose,
}: SubjectSelectionModalProps) {
  const mandatorySubjects = availableSubjects.filter(
    (s) => s.is_mandatory || s.subject_code?.toUpperCase() === "TOAN"
  );
  const electiveSubjects = availableSubjects.filter(
    (s) => !s.is_mandatory && s.subject_code?.toUpperCase() !== "TOAN"
  );

  const getSubjectId = (subject: Subject) => {
    return subject.subject_code || subject.code || subject.id;
  };

  const getSubjectName = (subject: Subject) => {
    return subject.subject_name || subject.name;
  };

  const isSelected = (subjectId: string | number, type: string) => {
    if (type === "core") {
      return selectedSubjects.core_subjects?.includes(subjectId);
    }
    return selectedSubjects.elective_subjects?.includes(subjectId);
  };

  const isValid =
    selectedSubjects.core_subjects?.length === mandatorySubjects.length &&
    selectedSubjects.elective_subjects?.length === 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Chọn môn học
          </DialogTitle>
          <DialogDescription>
            {selectedStudent?.full_name} - {selectedStudent?.student_id} | Lớp{" "}
            {selectedStudent?.class_name} - Khối {selectedStudent?.grade}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Core Subjects */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <BookOpen className="w-5 h-5 text-blue-600" /> Môn học chính
                  ({mandatorySubjects.length} môn)
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Bắt buộc: Tất cả môn được đánh dấu "Môn bắt buộc" trong quản
                  trị
                </p>
              </div>
              <div className="px-6 py-4 space-y-3 overflow-y-auto max-h-64">
                {mandatorySubjects.length > 0 ? (
                  mandatorySubjects.map((subject) => {
                    const subjectId = getSubjectId(subject);
                    const isChecked = isSelected(subjectId, "core");
                    return (
                      <label
                        key={subjectId}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleSubject(subjectId, "core")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {getSubjectName(subject)} (
                          {subject.subject_code || subject.code})
                        </span>
                        {isChecked && (
                          <Check className="w-4 h-4 text-blue-600 ml-auto" />
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">
                    Không có môn học chính nào
                  </p>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-200 bg-blue-50">
                <p className="text-xs text-blue-700 font-medium">
                  Đã chọn: {selectedSubjects.core_subjects?.length || 0}/
                  {mandatorySubjects.length} môn chính
                </p>
              </div>
            </div>

            {/* Elective Subjects */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <Target className="w-5 h-5 text-green-600" /> Môn tự chọn (4
                  môn)
                </h3>
                <p className="text-sm text-gray-600 mt-1">Chọn 4 môn từ danh sách</p>
              </div>
              <div className="px-6 py-4 space-y-3 overflow-y-auto max-h-64">
                {electiveSubjects.length > 0 ? (
                  electiveSubjects.map((subject) => {
                    const subjectId = getSubjectId(subject);
                    const isChecked = isSelected(subjectId, "elective");
                    return (
                      <label
                        key={subjectId}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-green-50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            onToggleSubject(subjectId, "elective")
                          }
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {getSubjectName(subject)} (
                          {subject.subject_code || subject.code})
                        </span>
                        {isChecked && (
                          <Check className="w-4 h-4 text-green-600 ml-auto" />
                        )}
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">
                    Không có môn học tự chọn nào
                  </p>
                )}
              </div>
              <div className="px-6 py-3 border-t border-gray-200 bg-green-50">
                <p className="text-xs text-green-700 font-medium">
                  Đã chọn: {selectedSubjects.elective_subjects?.length || 0}/4 môn tự
                  chọn
                </p>
              </div>
            </div>
          </div>

          {/* Current Selection Summary */}
          <div className="p-4 mt-6 rounded-lg bg-gray-50 border border-gray-200">
            <h4 className="flex items-center gap-2 mb-3 font-medium text-gray-900">
              <ClipboardList className="w-5 h-5 text-gray-700" /> Tóm tắt lựa
              chọn:
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">
                  Môn chính:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSubjects.core_subjects?.length > 0 ? (
                    selectedSubjects.core_subjects.map((subject, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full"
                      >
                        {subject}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Chưa chọn môn nào</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">
                  Môn tự chọn:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSubjects.elective_subjects?.length > 0 ? (
                    selectedSubjects.elective_subjects.map((subject, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full"
                      >
                        {subject}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Chưa chọn môn nào</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-col gap-2">
          {!isValid && (
            <p className="text-xs text-center text-red-600 col-span-2">
              Vui lòng chọn đúng {mandatorySubjects.length} môn chính và 4 môn
              tự chọn
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={onSave} disabled={loading || !isValid}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu môn học"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
