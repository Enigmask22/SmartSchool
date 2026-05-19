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
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';

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
  moveGrade: string | null;
  setMoveGrade: (value: string) => void;
  moveTargetClassId: string | null;
  setMoveTargetClassId: (value: string) => void;
  moveLoading: boolean;
  academicYears: string[];
  moveYearClasses: ClassData[];
  selectedStudentIds: number[];
  currentClass?: ClassData | null;
  onConfirm: () => void;
}

const MoveClassModal = ({
  open,
  onOpenChange,
  moveYear,
  setMoveYear,
  moveGrade,
  setMoveGrade,
  moveTargetClassId,
  setMoveTargetClassId,
  moveLoading,
  moveYearClasses,
  selectedStudentIds,
  currentClass,
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

        <div className="space-y-4 mb-6">
          {/* Current Class & Student Count Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Lớp hiện tại</p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentClass?.class_name} - Khối {currentClass?.grade}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Số học sinh sẽ chuyển</p>
                <p className="text-sm font-semibold text-blue-700">
                  {selectedStudentIds.length} học sinh
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label>Năm học</Label>
            <Select
              value={moveYear || 'none'}
              onValueChange={(value) => {
                const selectedYear = value === 'none' ? '' : value;
                setMoveYear(selectedYear);
                setMoveGrade('');
                setMoveTargetClassId('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn năm học" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn năm học</SelectItem>
                {ACADEMIC_YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Khối</Label>
            <Select
              value={moveGrade || 'none'}
              onValueChange={(value) => {
                const selectedGrade = value === 'none' ? '' : value;
                setMoveGrade(selectedGrade);
                setMoveTargetClassId('');
              }}
              disabled={!moveYear}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn khối" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn khối</SelectItem>
                {Array.from(
                  new Set(
                    moveYearClasses
                      .map((c) => String(c.grade))
                  )
                )
                  .sort()
                  .map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Khối {grade}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lớp đích</Label>
            <Select
              value={moveTargetClassId || 'none'}
              onValueChange={(value) => {
                setMoveTargetClassId(value === 'none' ? '' : value);
              }}
              disabled={!moveYear || !moveGrade}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chọn lớp</SelectItem>
                {moveYearClasses
                  .filter(
                    (c) =>
                      String(c.academic_year) === moveYear &&
                      String(c.grade) === moveGrade &&
                      c.id !== currentClass?.id
                  )
                  .map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.class_name}
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
