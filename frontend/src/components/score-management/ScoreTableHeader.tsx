import { Download, Upload, Lightbulb, ChevronLeft } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OCRScoreSheet from '@/components/score-management/OCRScoreSheet';

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

interface ScoreTableHeaderProps {
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

function ScoreTableHeader({
  selectedClassSubject,
  academicYear,
  semester,
  hasScoreConfig,
  onBack,
  onDownloadTemplate,
  onFileUpload,
  onExportToExcel,
  onImportSuccess,
}: ScoreTableHeaderProps) {
  return (
    <Card className="shadow-md">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
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
          <div className="flex flex-col gap-3 pt-3 border-t border-border">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={onDownloadTemplate}
                disabled={!hasScoreConfig}
                title={!hasScoreConfig ? 'Vui lòng cấu hình điểm trước khi tải template' : ''}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải template</span>
              </Button>

              <Button
                asChild
                variant="outline"
                disabled={!hasScoreConfig}
                title={!hasScoreConfig ? 'Vui lòng cấu hình điểm trước khi nhập điểm' : ''}
                className="flex items-center space-x-2"
              >
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Nhập điểm từ file</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={onFileUpload}
                    disabled={!hasScoreConfig}
                    className="hidden"
                  />
                </label>
              </Button>

              <Button
                onClick={onExportToExcel}
                disabled={!hasScoreConfig}
                title={!hasScoreConfig ? 'Vui lòng cấu hình điểm trước khi xuất Excel' : ''}
                variant="outline"
                className="flex items-center space-x-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </Button>

              <div title={!hasScoreConfig ? 'Vui lòng cấu hình điểm trước khi quét ảnh' : ''} className={!hasScoreConfig ? 'opacity-50' : ''}>
                <OCRScoreSheet
                  selectedClassSubject={selectedClassSubject}
                  academicYear={academicYear}
                  semester={semester}
                  onImportSuccess={onImportSuccess}
                  disabled={!hasScoreConfig}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Lightbulb className="w-3 h-3" />
                <span>Hỗ trợ: Excel (.xlsx, .xls), CSV, ảnh bảng điểm</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreTableHeader;
