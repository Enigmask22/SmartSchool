import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { StudentData, HomeroomInfo } from '@/hooks/homeroom-dashboard/useHomeroomData';

interface StudentGridProps {
  homeroomInfo: HomeroomInfo | null;
  students: StudentData[];
  currentPage: number;
  studentsPerPage?: number;
  currentStudents: StudentData[];
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewAll: () => void;
  loading?: boolean;
}

export function StudentGrid({
  homeroomInfo,
  currentPage,
  currentStudents,
  totalPages,
  onPageChange,
  onViewAll,
  loading = false,
}: StudentGridProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Học sinh lớp {homeroomInfo?.class_name}</CardTitle>
            <CardDescription>Danh sách học sinh – thống kê</CardDescription>
          </div>
          <Button variant="outline" onClick={onViewAll} className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Xem tất cả</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [...Array(6)].map((_, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-20 mb-2" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : currentStudents.map((student) => (
                <Card key={student.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          <span className="text-sm font-medium text-blue-600">
                            {student.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{student.full_name}</h4>
                          <p className="text-sm text-gray-500">Mã: {student.student_id}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="destructive">
                              Vắng {student.absent_count ?? 0}
                            </Badge>
                            <Badge variant="warning">
                              Muộn {student.late_count ?? 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center mt-6 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
