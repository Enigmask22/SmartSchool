import {
  Users,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Edit,
  MessageCircle,
  Images,
  BarChart3,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  email?: string;
  phone?: string;
  class_name: string;
  grade?: string;
  gender?: string;
  is_active?: boolean;
}

interface StudentGridViewProps {
  paginatedStudents: Student[];
  filteredStudents: Student[];
  searchTerm: string;
  selectedClass: string;
  restoreLoading: boolean;
  onEdit: (student: Student) => void;
  onFeedback: (student: Student) => void;
  onUploadMultiple: (student: Student) => void;
  onViewScores: (student: Student) => void;
  onSelectSubjects: (student: Student) => void;
  onRestore: (student: Student) => void;
}

export function StudentGridView({
  paginatedStudents,
  filteredStudents,
  searchTerm,
  selectedClass,
  restoreLoading,
  onEdit,
  onFeedback,
  onUploadMultiple,
  onViewScores,
  onSelectSubjects,
  onRestore,
}: StudentGridViewProps) {
  if (filteredStudents.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {searchTerm || selectedClass
              ? "Không tìm thấy học sinh nào"
              : "Chưa có học sinh nào"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedClass
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
              : "Hãy thêm học sinh mới để bắt đầu"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {paginatedStudents.map((student) => (
        <Card
          key={student.id}
          className={`group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
            student.is_active === false
              ? "border-destructive/50 bg-destructive/5 opacity-75"
              : "hover:border-primary/50"
          }`}
        >
          {/* Header with avatar and basic info */}
          <CardHeader
            className={`${
              student.is_active === false
                ? "bg-destructive text-destructive-foreground"
                : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold rounded-full backdrop-blur-sm bg-white/20">
                    {student.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  {student.is_active === false && (
                    <div className="absolute flex items-center justify-center w-6 h-6 rounded-full -top-1 -right-1 bg-destructive">
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">
                    {student.full_name}
                  </h3>
                  <p className="font-mono text-sm text-primary-foreground/80">
                    {student.student_id}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className="text-xs text-white transition-colors bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/50"
                    >
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {student.class_name}
                    </Badge>
                    {student.gender && (
                      <Badge
                        variant="secondary"
                        className="text-xs text-white transition-colors bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/50"
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {student.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit button in top right corner */}
              {student.is_active !== false && (
                <Button
                  onClick={() => onEdit(student)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 text-xs text-white bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/50"
                >
                  <Edit className="w-3 h-3" />
                  <span>Sửa</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Student info */}
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center p-2 space-x-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">
                    {student.email || "Chưa có email"}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-2 space-x-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Số điện thoại</p>
                  <p className="text-sm font-medium">
                    {student.phone || "Chưa có SĐT"}
                  </p>
                </div>
              </div>

              <div className="flex items-center p-2 space-x-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Khối</p>
                  <p className="text-sm font-medium">
                    Khối {student.grade || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border/50">
              {student.is_active === false ? (
                <div className="space-y-3 text-center">
                  <Button
                    onClick={() => onRestore(student)}
                    disabled={restoreLoading}
                    size="sm"
                    className="w-full"
                  >
                    {restoreLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Đang khôi phục...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span>Khôi phục học sinh</span>
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Học sinh đã bị xóa
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => onFeedback(student)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 text-xs hover:bg-primary/5 hover:border-primary/50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Nhận xét</span>
                    </Button>

                    <Button
                      onClick={() => onUploadMultiple(student)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 text-xs hover:bg-primary/5 hover:border-primary/50"
                    >
                      <Images className="w-4 h-4" />
                      <span>Upload nhiều ảnh</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => onViewScores(student)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 text-xs hover:bg-primary/5 hover:border-primary/50"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Điểm số</span>
                    </Button>

                    <Button
                      onClick={() => onSelectSubjects(student)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 text-xs hover:bg-primary/5 hover:border-primary/50"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Môn học</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
