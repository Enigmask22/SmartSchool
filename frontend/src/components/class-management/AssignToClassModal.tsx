import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import type { ClassInfo } from '@/hooks/class-management/useClassManagementAPI';

interface AssignToClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: number;
    full_name: string;
    student_id: string;
  } | null;
  onSuccess?: () => void;
}

export function AssignToClassModal({
  open,
  onOpenChange,
  student,
  onSuccess,
}: AssignToClassModalProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedYear('');
      setSelectedGrade('');
      setSelectedClass('');
      setAvailableClasses([]);
    }
  }, [open]);

  // Load classes when year or grade changes
  useEffect(() => {
    if (selectedYear && selectedGrade) {
      loadClasses();
    }
  }, [selectedYear, selectedGrade]);

  const loadClasses = async () => {
    if (!selectedYear || !selectedGrade) return;

    setClassesLoading(true);
    try {
      const response = await api.request(
        `/admin/classes?academic_year=${encodeURIComponent(selectedYear)}&grade=${encodeURIComponent(selectedGrade)}`
      );

      if (response.success) {
        const classes = response.data || [];
        setAvailableClasses(classes);
        if (classes.length === 0) {
          toast.info('Không có lớp học nào cho năm học và khối này');
        }
      } else {
        toast.error('Lỗi tải danh sách lớp học');
        setAvailableClasses([]);
      }
    } catch (err) {
      logger.error('Error loading classes:', err);
      toast.error('Lỗi khi tải danh sách lớp học');
      setAvailableClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!student || !selectedClass) {
      toast.error('Vui lòng chọn lớp học');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/students/${student.id}/assign-class`, {
        class_id: parseInt(selectedClass),
      });

      if (response.success) {
        toast.success(`Phân công học sinh "${student.full_name}" thành công`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.message || 'Lỗi phân công học sinh');
      }
    } catch (err) {
      logger.error('Error assigning student:', err);
      toast.error('Lỗi khi phân công học sinh');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Phân công học sinh vào lớp</DialogTitle>
          <DialogDescription>
            {student ? `Phân công "${student.full_name}" vào một lớp học` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="assign-year">Năm học</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="assign-year">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                {ACADEMIC_YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade Selection */}
          <div className="space-y-2">
            <Label htmlFor="assign-grade">Khối</Label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger id="assign-grade">
                <SelectValue placeholder="Chọn khối" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="11">11</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Selection */}
          <div className="space-y-2">
            <Label htmlFor="assign-class">Lớp học</Label>
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
              disabled={classesLoading || availableClasses.length === 0}
            >
              <SelectTrigger id="assign-class">
                {classesLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <SelectValue placeholder="Chọn lớp học" />
                )}
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.class_name} ({cls.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableClasses.length === 0 && selectedYear && selectedGrade && !classesLoading && (
              <p className="text-xs text-muted-foreground">
                Không có lớp học nào cho lựa chọn này
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || !selectedClass || classesLoading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {loading ? 'Đang xử lý...' : 'Phân công'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
