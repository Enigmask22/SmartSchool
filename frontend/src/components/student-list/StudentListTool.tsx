import { Search, RefreshCw, Download, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudentImport } from "@/hooks/student-list/useStudentImport";
import { SubjectImportModal } from "./modals";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface StudentListToolProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  availableClasses: string[];
  classesLoading: boolean;
  isHomeroomTeacher?: boolean;
  selectedAcademicYear: string;
  selectedSemester: string;
  showInactive: boolean;
  setShowInactive: (value: boolean) => void;
  onRefresh: () => void;
  onExportComments: () => void;
}

export function StudentListTool({
  searchTerm,
  setSearchTerm,
  selectedClass,
  setSelectedClass,
  availableClasses,
  classesLoading,
  isHomeroomTeacher,
  selectedAcademicYear,
  selectedSemester,
  showInactive,
  setShowInactive,
  onRefresh,
  onExportComments,
}: StudentListToolProps) {
  // Create filters object for import hook
  const filters = {
    searchTerm,
    selectedClass,
    selectedAcademicYear,
    selectedSemester,
    showInactive,
  };

  // Initialize import hook locally for template download and subject import
  // Wrap onRefresh to ensure it returns a Promise
  const importData = useStudentImport({
    filters,
    fetchStudents: async () => {
      await Promise.resolve();
      onRefresh();
    },
  });
  return (
    <>
      <Card className="shadow-md">
        <CardContent>
          <div className="space-y-4 pt-6">
            {/* Row 1: Search, Inactive Filter, Class Filter, and Refresh (far right) */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
              <div className="space-y-2 flex-1 md:max-w-md">
                {/* <Label htmlFor="search">Tìm kiếm</Label> */}
                <div className="relative">
                  <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Tên hoặc mã học sinh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-inactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-2 focus:ring-ring cursor-pointer"
                />
                <Label
                  htmlFor="show-inactive"
                  className="text-sm cursor-pointer text-muted-foreground whitespace-nowrap"
                >
                  Hiển thị đã xóa
                </Label>
              </div>

              {!isHomeroomTeacher ? (
                <Select
                  value={selectedClass}
                  onValueChange={(value) => setSelectedClass(value)}
                  disabled={classesLoading}
                >
                  <SelectTrigger className="flex items-center justify-between w-40">
                    <SelectValue
                      placeholder={
                        classesLoading ? "Đang tải lớp…" : "Tất cả lớp"
                      }
                    />
                    {classesLoading && (
                      <span className="inline-block w-3 h-3 ml-2 border-2 border-transparent rounded-full border-b-muted-foreground animate-spin" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClass &&
                      selectedClass !== "all" &&
                      !availableClasses.includes(selectedClass) && (
                        <SelectItem value={selectedClass}>
                          {selectedClass}
                        </SelectItem>
                      )}
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    {availableClasses.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Làm mới</span>
              </Button>
            </div>

            {/* Row 2: Action Buttons (right justified) */}
            <div className="flex items-center gap-2 flex-wrap pt-6 border-t justify-end">
              <Button
                onClick={importData.downloadSubjectTemplate}
                disabled={
                  !isHomeroomTeacher ||
                  !selectedClass ||
                  selectedClass === "all"
                }
                variant="outline"
                size="lg"
                className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Tải mẫu nhập môn học</span>
              </Button>

              <Button
                onClick={() => importData.setShowSubjectImportModal(true)}
                disabled={
                  !isHomeroomTeacher ||
                  !selectedClass ||
                  selectedClass === "all"
                }
                variant="outline"
                size="lg"
                className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>Import môn học</span>
              </Button>

              {/* <Button
                onClick={onExportComments}
                disabled={
                  !isHomeroomTeacher ||
                  !selectedClass ||
                  selectedClass === "all"
                }
                variant="default"
                size="lg"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Tải phiếu liên lạc</span>
              </Button> */}
            </div>
          </div>
        </CardContent>
      </Card>

      <SubjectImportModal
        open={importData.showSubjectImportModal}
        onOpenChange={importData.setShowSubjectImportModal}
        selectedClass={selectedClass}
        subjectImportFile={importData.subjectImportFile}
        subjectImportLoading={importData.subjectImportLoading}
        onFileSelect={(file) => importData.setSubjectImportFile(file || null)}
        onImport={importData.handleSubjectImport}
        onClose={() => {
          importData.setShowSubjectImportModal(false);
          importData.setSubjectImportFile(null);
        }}
      />
    </>
  );
}
