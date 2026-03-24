// React already imported by JSX transform
import { Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ScoreEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStudent: any;
  scoreConfig: any;
  scoreForm: Record<string, any>;
  onScoreInputChange: (columnKey: string, value: string) => void;
  onSaveScore: () => void;
  getDisplayColumns: (config: Record<string, any>) => any[];
}

const ScoreEditModal = ({
  open,
  onOpenChange,
  editingStudent,
  scoreConfig,
  scoreForm,
  onScoreInputChange,
  onSaveScore,
  getDisplayColumns,
}: ScoreEditModalProps) => {
  if (!editingStudent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Pencil className="w-4 h-4" />
            <span>Nhập điểm cho {editingStudent?.student?.full_name}</span>
          </DialogTitle>
          <DialogDescription>
            Mã số: {editingStudent?.student?.student_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editingStudent && scoreConfig && (
            <>
              {getDisplayColumns(scoreConfig.score_column_config).map(
                (column: any) => {
                  if (column.hasChildren) {
                    return (
                      <div
                        key={column.key}
                        className="p-4 border rounded-lg bg-blue-50"
                      >
                        <div className="mb-3 text-sm font-semibold text-blue-900">
                          {column.label}
                        </div>
                        <div className="space-y-3">
                          {column.children.map((child: any) => (
                            <div
                              key={child.key}
                              className="flex items-center space-x-3"
                            >
                              <Label className="w-32 text-sm font-medium text-gray-700">
                                {child.label}
                              </Label>
                              <Badge variant="secondary" className="text-xs">
                                Hệ số: {child.he_so}
                              </Badge>
                              <Input
                                type="text"
                                placeholder="-"
                                value={scoreForm[child.key]?.Diem || ""}
                                onChange={(e) =>
                                  onScoreInputChange(child.key, e.target.value)
                                }
                                className="flex-1 text-lg font-semibold text-center"
                              />
                              <div className="text-xs text-gray-500 min-w-16">
                                <div>Số: 0-10</div>
                                <div>Chữ: Đ/KĐ</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={column.key}
                        className="p-4 rounded-lg bg-muted"
                      >
                        <Label className="block mb-2 text-sm font-medium">
                          <span className="flex items-center justify-between">
                            <span>{column.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              Hệ số: {column.he_so}
                            </Badge>
                          </span>
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="text"
                            placeholder="0.0, Đ, hoặc KĐ"
                            value={scoreForm[column.key]?.Diem || ""}
                            onChange={(e) =>
                              onScoreInputChange(column.key, e.target.value)
                            }
                            className="flex-1 text-lg font-semibold text-center"
                          />
                          <div className="text-xs text-gray-500 min-w-16">
                            <div>Số: 0-10</div>
                            <div>Chữ: Đ/KĐ</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onSaveScore}>Lưu điểm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreEditModal;
