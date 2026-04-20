import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
//import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Users, User, FolderOpen, Download, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClassInfo {
  id: number;
  class_name: string;
  grade: number | string;
  academic_year: string;
  is_active: boolean;
  teachers?: {
    id: number;
    full_name: string;
    teacher_code: string;
  };
  student_count?: number;
}

interface ClassManagementSelectorProps {
  classes: ClassInfo[];
  selectedGrade: string;
  academicYear: string;
  onSelect: (classInfo: ClassInfo) => void;
  loading?: boolean;
  downloadStudentTemplate?: () => void;
  handleFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddStudent?: () => void;
}

export default function ClassManagementSelector({
  classes,
  selectedGrade,
  //academicYear,
  onSelect,
  loading = false,
  downloadStudentTemplate,
  handleFileUpload,
  onAddStudent,
}: ClassManagementSelectorProps) {
  // Filter classes by selected grade
  const filteredClasses = selectedGrade 
    ? classes.filter(cls => cls.grade.toString() === selectedGrade)
    : classes;

  return (
    <Card className="shadow-md border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="text-left">
            <CardTitle className="text-xl font-bold text-gray-900">
              Danh sách lớp học
            </CardTitle>
            <CardDescription className="text-gray-600">
              Lựa chọn lớp để quản lý học sinh
            </CardDescription>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {downloadStudentTemplate && (
              <Button
                variant="outline"
                onClick={downloadStudentTemplate}
                size="sm"
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                <span>Tải template</span>
              </Button>
            )}
            {handleFileUpload && (
              <Button
                variant="outline"
                asChild
                size="sm"
                className="flex items-center gap-1"
              >
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Nhập</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
            )}
            {onAddStudent && (
              <Button
                onClick={onAddStudent}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 min-h-[400px] items-start">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 space-y-3 border border-gray-200 rounded-lg bg-white">
                <Skeleton className="h-24 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            ))
          ) : filteredClasses.length > 0 ? (
            filteredClasses.map((classInfo) => (
              <Card
                key={classInfo.id}
                onClick={() => onSelect(classInfo)}
                className="transition-all duration-200 cursor-pointer hover:shadow-lg border-gray-200 bg-white hover:border-rose-300 group"
              >
                <CardContent className="p-5 bg-white rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center text-lg font-bold rounded-md w-24 h-12 text-white bg-amber-500">
                      {classInfo.class_name}
                    </div>
                    <div className="flex items-center justify-center transition-all rounded-full w-7 h-7 bg-amber-100 group-hover:bg-rose-200">
                      <span className="text-amber-700 group-hover:text-rose-700">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* <h3 className="mb-3 text-base font-bold text-amber-950">
                    {classInfo.class_name}
                  </h3> */}

                  {/* Homeroom Teacher Section */}
                  {classInfo.teachers ? (
                    <div className="mb-4 p-2.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-md border border-amber-200">
                      <div className="flex items-center text-sm text-amber-800 mb-1">
                        <User className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="font-medium">Chủ nhiệm:</span>
                      </div>
                      <p className="text-xs text-amber-700 ml-6">
                        {classInfo.teachers.full_name}
                      </p>
                      <p className="text-xs text-amber-600 ml-6">
                        ({classInfo.teachers.teacher_code})
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4 p-2.5 bg-amber-100 rounded-md border border-amber-100">
                      <div className="flex items-center text-sm text-amber-700">
                        <User className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="text-xs">Chưa có chủ nhiệm</span>
                      </div>
                    </div>
                  )}

                  {/* Student Count Section */}
                  <div className="p-2.5 bg-gradient-to-r from-rose-100 to-red-100 rounded-md border border-rose-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-rose-700 font-medium">
                        <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Học sinh:</span>
                      </div>
                      <span className="text-sm font-bold text-rose-800 bg-white rounded px-2 py-0.5 min-w-[2.5rem] text-center">
                        {classInfo.student_count ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Footer Info */}
                  {/* <div className="flex items-center justify-between mt-4 text-xs">
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                      Khối {classInfo.grade}
                    </Badge>
                    <span className="text-amber-700 font-medium">{academicYear}</span>
                  </div> */}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="mb-3">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto" />
                </div>
                <p className="text-sm font-medium text-amber-900">
                  Không tìm thấy lớp học
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Vui lòng chọn năm học khác
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
