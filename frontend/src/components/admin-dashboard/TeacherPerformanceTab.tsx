import { UserCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeacherPerformanceData } from "@/hooks/useAdminDashboard";

interface TeacherPerformanceTabProps {
  teacherPerformance: TeacherPerformanceData[];
}

export function TeacherPerformanceTab({
  teacherPerformance,
}: TeacherPerformanceTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="w-5 h-5" />
          <span>Hiệu Suất Giáo Viên</span>
        </CardTitle>
        <CardDescription>
          Thống kê hiệu suất quản lý lớp của giáo viên
        </CardDescription>
      </CardHeader>
      <CardContent>
        {teacherPerformance.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Giáo Viên</TableHead>
                <TableHead>Mã GV</TableHead>
                <TableHead>Số Lớp</TableHead>
                <TableHead>Tổng Học Sinh</TableHead>
                <TableHead>Tỷ Lệ Điểm Danh</TableHead>
                <TableHead>Ghi Chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherPerformance.map((teacher, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {teacher.teacher_name}
                  </TableCell>
                  <TableCell>{teacher.teacher_code}</TableCell>
                  <TableCell>{teacher.classes_count}</TableCell>
                  <TableCell>{teacher.total_students}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={teacher.attendance_rate}
                        className="w-20 h-2"
                      />
                      <span className="text-sm font-medium">
                        {teacher.attendance_rate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        teacher.attendance_rate >= 90
                          ? "default"
                          : teacher.attendance_rate >= 70
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {teacher.attendance_rate >= 90
                        ? "Xuất sắc"
                        : teacher.attendance_rate >= 70
                        ? "Tốt"
                        : "Cần cải thiện"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Không có dữ liệu giáo viên
          </div>
        )}
      </CardContent>
    </Card>
  );
}
