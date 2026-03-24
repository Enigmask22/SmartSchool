import { Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClassPerformanceData } from "@/hooks/admin-dashboard/useAdminDashboard";

interface ClassPerformanceTabProps {
  classPerformance: ClassPerformanceData[];
}

export function ClassPerformanceTab({
  classPerformance,
}: ClassPerformanceTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="w-5 h-5" />
          <span>Hiệu Suất Học Tập Theo Lớp</span>
        </CardTitle>
        <CardDescription>
          Xếp hạng lớp học theo điểm trung bình
        </CardDescription>
      </CardHeader>
      <CardContent>
        {classPerformance.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lớp</TableHead>
                <TableHead>Số Học Sinh</TableHead>
                <TableHead>Điểm TB</TableHead>
                <TableHead>Xuất Sắc</TableHead>
                <TableHead>Khá</TableHead>
                <TableHead>Trung Bình</TableHead>
                <TableHead>Yếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classPerformance.map((classData, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {classData.class_name}
                  </TableCell>
                  <TableCell>{classData.total_students}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        classData.average_grade >= 8
                          ? "default"
                          : classData.average_grade >= 6.5
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {classData.average_grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-green-600">
                    {classData.excellent_count}
                  </TableCell>
                  <TableCell className="text-blue-600">
                    {classData.good_count}
                  </TableCell>
                  <TableCell className="text-yellow-600">
                    {classData.average_count}
                  </TableCell>
                  <TableCell className="text-red-600">
                    {classData.poor_count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Không có dữ liệu điểm số
          </div>
        )}
      </CardContent>
    </Card>
  );
}
