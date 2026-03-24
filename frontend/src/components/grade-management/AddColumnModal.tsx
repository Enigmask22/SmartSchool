// React already imported by JSX transform
import { Plus, Key, FileEdit, Scale, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewColumnFormData {
  name: string;
  label: string;
  he_so: number;
}

interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newColumnForm: NewColumnFormData;
  onFormChange: (updates: Partial<NewColumnFormData>) => void;
  onConfirm: () => void;
}

const AddColumnModal = ({
  open,
  onOpenChange,
  newColumnForm,
  onFormChange,
  onConfirm,
}: AddColumnModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Thêm cột điểm mới</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="flex items-center space-x-1 mb-1.5">
              <Key className="w-4 h-4" />
              <span>Tên cột (key)</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={newColumnForm.name}
              onChange={(e) =>
                onFormChange({
                  ...newColumnForm,
                  name: e.target.value,
                })
              }
              placeholder="vd: Diem_thi_15_phut"
            />
            <p className="mt-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-md p-2">
              <AlertCircle className="inline w-3 h-3 mr-1" />
              Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
            </p>
          </div>

          <div>
            <Label className="flex items-center space-x-1 mb-1.5">
              <FileEdit className="w-4 h-4" />
              <span>Tên hiển thị</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={newColumnForm.label}
              onChange={(e) =>
                onFormChange({
                  ...newColumnForm,
                  label: e.target.value,
                })
              }
              placeholder="vd: Điểm thi 15 phút"
            />
          </div>

          <div>
            <Label className="flex items-center space-x-1 mb-1.5">
              <Scale className="w-4 h-4" />
              <span>Hệ số</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={newColumnForm.he_so}
              onChange={(e) =>
                onFormChange({
                  ...newColumnForm,
                  he_so: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm cột</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnModal;
