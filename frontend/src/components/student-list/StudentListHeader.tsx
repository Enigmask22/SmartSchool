import {
  Search,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface StudentListHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  availableClasses: string[];
  classesLoading: boolean;
  isHomeroomTeacher?: boolean;
  homeroomClasses: any[];
  academicYears: string[];
  selectedAcademicYear: string;
  setSelectedAcademicYear: (value: string) => void;
  selectedSemester: string;
  setSelectedSemester: (value: string) => void;
  availableSemesters: string[];
  showInactive: boolean;
  setShowInactive: (value: boolean) => void;
  onRefresh: () => void;
  onDownloadTemplate: () => void;
  onImportSubjects: () => void;
  onExportComments: () => void;
  fetchAvailableClasses: (year?: string) => void;
}

export function StudentListHeader({
  searchTerm,
  setSearchTerm,
  selectedClass,
  setSelectedClass,
  availableClasses,
  classesLoading,
  isHomeroomTeacher,
  homeroomClasses,
  academicYears,
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedSemester,
  setSelectedSemester,
  availableSemesters,
  showInactive,
  setShowInactive,
  onRefresh,
  onDownloadTemplate,
  onImportSubjects,
  onExportComments,
  fetchAvailableClasses,
}: StudentListHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tìm kiếm và lọc</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Row 1: Main Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Tìm kiếm</Label>
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

            {isHomeroomTeacher ? (
              <>
                <div className="space-y-2">
                  <Label>Năm học</Label>
                  <Select
                    value={selectedAcademicYear || ""}
                    onValueChange={(v) => {
                      setSelectedAcademicYear(v);
                      fetchAvailableClasses(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn năm học" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Học kỳ</Label>
                  <Select
                    value={selectedSemester}
                    onValueChange={setSelectedSemester}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn học kỳ" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSemesters.map((sem) => (
                        <SelectItem key={sem} value={sem}>
                          {sem === "HK1"
                            ? "Học kỳ 1"
                            : sem === "HK2"
                              ? "Học kỳ 2"
                              : "Cả năm"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="class-select">Lớp</Label>
                <Select
                  value={selectedClass}
                  onValueChange={(value) => setSelectedClass(value)}
                  disabled={classesLoading}
                >
                  <SelectTrigger className="flex items-center justify-between w-full">
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
              </div>
            )}
          </div>

          {/* Row 2: Class Info & Actions */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-2 border-t">
            {/* Left: Class Info */}
            <div className="flex items-center gap-3">
              {isHomeroomTeacher && homeroomClasses.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm text-blue-700">Lớp chủ nhiệm:</span>
                  <span className="text-sm font-bold text-blue-900">
                    {homeroomClasses[0].class_name}
                  </span>
                </div>
              )}

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
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Hiển thị đã xóa
                </Label>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Làm mới</span>
              </Button>

              {isHomeroomTeacher &&
                selectedClass &&
                selectedClass !== "all" && (
                  <>
                    <Button
                      onClick={onDownloadTemplate}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải mẫu nhập môn học</span>
                    </Button>

                    <Button
                      onClick={onImportSubjects}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import môn học</span>
                    </Button>

                    <Button
                      onClick={onExportComments}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải phiếu liên lạc toàn lớp</span>
                    </Button>
                  </>
                )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
