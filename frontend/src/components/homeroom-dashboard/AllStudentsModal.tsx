import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StudentData, HomeroomInfo } from '@/hooks/useHomeroomDashboard';

interface AllStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeroomInfo: HomeroomInfo | null;
  students: StudentData[];
}

export function AllStudentsModal({
  open,
  onOpenChange,
  homeroomInfo,
  students,
}: AllStudentsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Tất cả học sinh lớp {homeroomInfo?.class_name}</DialogTitle>
          <DialogDescription>Tổng cộng {students.length} học sinh</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
