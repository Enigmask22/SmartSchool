import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClassData {
  id: number;
  class_name: string;
  grade?: number | string;
  homeroom_teacher?: string;
  academic_year?: string;
  teachers?: {
    teacher_code: string;
    full_name: string;
  };
}

interface MoveClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moveYear: string | null;
  setMoveYear: (value: string) => void;
  moveClasses: ClassData[];
  moveTargetClassId: string | null;
  setMoveTargetClassId: (value: string) => void;
  moveLoading: boolean;
  academicYears: string[];
  classes: ClassData[];
  selectedStudentIds: number[];
  onConfirm: () => void;
}

const MoveClassModal = ({
  open,
  onOpenChange,
  moveYear,
  setMoveYear,
  moveClasses,
  moveTargetClassId,
  setMoveTargetClassId,
  moveLoading,
  academicYears,
  classes,
  selectedStudentIds,
  onConfirm,
}: MoveClassModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chuyển lớp cho học sinh</DialogTitle>
          <DialogDescription>
            Chọn năm học và lớp đích. Các học sinh được chọn sẽ cập nhật lớp
            và ghi lịch sử.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Năm học</Label>
            <Select
              value={moveYear || 'none'}
              onValueChange={(value) => {
                const y = value === 'none' ? '' : value;
                setMoveYear(y);
                setMoveTargetClassId('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn năm học</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lớp đích</Label>
            <Select
              value={moveTargetClassId || 'none'}
              onValueChange={(value) =>
                setMoveTargetClassId(value === 'none' ? '' : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn lớp</SelectItem>
                {(moveClasses.length ? moveClasses : classes).map((cls) => (
                  <SelectItem key={cls.id} value={String(cls.id)}>
                    {cls.class_name} ({cls.academic_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            disabled={
              moveLoading ||
              !moveTargetClassId ||
              selectedStudentIds.length === 0
            }
            onClick={onConfirm}
          >
            {moveLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang chuyển...
              </>
            ) : (
              'Xác nhận'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveClassModal;
