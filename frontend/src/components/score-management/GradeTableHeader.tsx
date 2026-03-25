import React from 'react';
import { Download, Upload, Lightbulb } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OCRGradeSheet from '@/components/score-management/OCRGradeSheet';

interface ClassSubject {
  id: string;
  classes: {
    class_name: string;
    grade: string;
  };
  subjects: {
    subject_name: string;
  };
}

interface GradeTableHeaderProps {
  selectedClassSubject: ClassSubject;
  academicYear: string;
  semester: string;
  hasScoreConfig: boolean;
  onBack: () => void;
  onDownloadTemplate: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportToExcel: () => void;
  onImportSuccess: () => void;
}

const GradeTableHeader = ({
  selectedClassSubject,
  academicYear,
  semester,
  hasScoreConfig,
  onBack,
  onDownloadTemplate,
  onFileUpload,
  onExportToExcel,
  onImportSuccess,
}: GradeTableHeaderProps) => {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>←</span>
                <span>Quay lại</span>
              </Button>
              <div className="w-px h-8 bg-border"></div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedClassSubject.classes.class_name} -{" "}
                  {selectedClassSubject.subjects.subject_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Khối {selectedClassSubject.classes.grade}
                </p>
              </div>
            </div>
          </div>

          {/* Import/Export Buttons */}
          {hasScoreConfig && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
              <Button
                onClick={onDownloadTemplate}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải template</span>
              </Button>

              <Button
                asChild
                variant="outline"
                className="flex items-center space-x-2"
              >
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GradeTableHeader;
