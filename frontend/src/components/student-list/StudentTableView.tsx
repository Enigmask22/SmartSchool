import React from "react";
import {
  Users,
  GraduationCap,
  Mail,
  Phone,
  X,
  CheckCircle2,
  Edit,
  BarChart3,
  MessageCircle,
  RefreshCw,
  Images,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  email?: string;
  phone?: string;
  class_name: string;
  grade?: string;
  is_active?: boolean;
}

interface StudentTableViewProps {
  paginatedStudents: Student[];
  filteredStudents: Student[];
  searchTerm: string;
  selectedClass: string;
  startIndex: number;
  restoreLoading: boolean;
  onEdit: (student: Student) => void;
  onViewScores: (student: Student) => void;
  onFeedback: (student: Student) => void;
  onSelectSubjects: (student: Student) => void;
  onUploadMultiple: (student: Student) => void;
  onRestore: (student: Student) => void;
}

export function StudentTableView({
  paginatedStudents,
  filteredStudents,
  searchTerm,
  selectedClass,
  startIndex,
  restoreLoading,
  onEdit,
  onViewScores,
  onFeedback,
  onSelectSubjects,
  onUploadMultiple,
  onRestore,
}: StudentTableViewProps) {
  if (filteredStudents.length === 0) {
    return (
      <Card>
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
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px] text-center">STT</TableHead>
                <TableHead>Học sinh</TableHead>
                <TableHead className="text-center">Lớp</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">Số điện thoại</TableHead>
                <TableHead className="text-center">Khối</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.map((student, index) => (
                <TableRow
                  key={student.id}
                  className={`${
                    student.is_active === false
                      ? "bg-destructive/5 opacity-75"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* STT */}
                  <TableCell className="font-medium text-center">
                    {startIndex + index + 1}
                  </TableCell>

                  {/* Student Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                          student.is_active === false
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {student.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {student.student_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Class */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit mx-auto"
                    >
                      <GraduationCap className="w-3 h-3" />
                      {student.class_name || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {student.email || "Chưa có"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {student.phone || "Chưa có"}
                    </div>
                  </TableCell>

                  {/* Grade */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="mx-auto">
                      Khối {student.grade || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {student.is_active === false ? (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1 w-fit mx-auto"
                      >
                        <X className="w-3 h-3" />
                        Đã xóa
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="flex items-center gap-1 w-fit mx-auto bg-green-500 text-white hover:bg-green-600"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Đang học
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {student.is_active === false ? (
                        <Button
                          onClick={() => onRestore(student)}
                          disabled={restoreLoading}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Khôi phục
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => onEdit(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onViewScores(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Xem điểm số"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onFeedback(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Tạo nhận xét"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onSelectSubjects(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Chọn môn học"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onUploadMultiple(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Upload ảnh"
                          >
                            <Images className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
