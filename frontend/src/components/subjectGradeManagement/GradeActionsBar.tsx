import React from "react";
import { Download, Upload, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import OCRGradeSheet from "@/components/OCRGradeSheet";

interface ClassSubject {
  id: number;
  classes: {
    class_name: string;
  };
  subjects: {
    subject_name: string;
  };
}

interface GradeActionsBarProps {
  selectedClassSubject: ClassSubject;
  academicYear: string;
  semester: string;
  onDownloadTemplate: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportToExcel: () => void;
  onImportSuccess: () => void;
}

export const GradeActionsBar: React.FC<GradeActionsBarProps> = ({
  selectedClassSubject,
  academicYear,
  semester,
  onDownloadTemplate,
  onFileUpload,
  onExportToExcel,
  onImportSuccess,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
      <Button
        onClick={onDownloadTemplate}
        className="flex items-center space-x-2"
      >
        <Download className="w-4 h-4" />
        <span>Tải template</span>
      </Button>

      <Button asChild variant="outline" className="flex items-center space-x-2">
        <label className="cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Nhập điểm từ file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </Button>

      <Button
        onClick={onExportToExcel}
        variant="outline"
        className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50"
      >
        <Download className="w-4 h-4" />
        <span>Xuất Excel</span>
      </Button>

      <OCRGradeSheet
        selectedClassSubject={selectedClassSubject}
        academicYear={academicYear}
        semester={semester}
        onImportSuccess={onImportSuccess}
      />

      <div className="px-3 py-2 text-sm border rounded-lg text-muted-foreground bg-primary/5 border-primary/20">
        <span className="flex items-center space-x-1 font-medium">
          <Lightbulb className="w-4 h-4" />
          <span>Hỗ trợ:</span>
        </span>{" "}
        Excel (.xlsx, .xls), CSV, và ảnh bảng điểm
      </div>
    </div>
  );
};

