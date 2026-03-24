// React already imported by JSX transform
import { Settings, Plus, Trash2, Save, FileEdit, Scale, BarChart3 } from 'lucide-react';
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
import {
  Card,
  CardContent,
} from '@/components/ui/card';

interface ConfigEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configForm: Record<string, any>;
  onConfigInputChange: (columnName: string, field: string, value: any) => void;
  onAddColumn: () => void;
  onRemoveColumn: (columnName: string) => void;
  onSaveConfig: () => void;
  getSortedColumnNames: (config: Record<string, any>) => string[];
}

const ConfigEditorModal = ({
  open,
  onOpenChange,
  configForm,
  onConfigInputChange,
  onAddColumn,
  onRemoveColumn,
  onSaveConfig,
  getSortedColumnNames,
}: ConfigEditorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Cấu hình cột điểm</span>
          </DialogTitle>
          <DialogDescription>
            Thiết lập các cột điểm và hệ số cho môn học
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {Object.keys(configForm).length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 rounded-full bg-muted">
                  <BarChart3 className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="mb-6 text-lg text-muted-foreground">
                  Chưa có cột điểm nào
                </p>
                <p className="text-muted-foreground">
                  Hãy thêm cột điểm đầu tiên để bắt đầu
                </p>
              </div>
            ) : (
              getSortedColumnNames(configForm).map((columnName, index) => (
                <Card
                  key={columnName}
                  className="transition-all hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 text-base font-bold text-white rounded-lg bg-primary">
                        {index + 1}
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label className="flex items-center space-x-1 mb-1.5">
                            <FileEdit className="w-4 h-4" />
                            <span>Tên hiển thị</span>
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={configForm[columnName].label}
                            onChange={(e) =>
                              onConfigInputChange(
                                columnName,
                                'label',
                                e.target.value
                              )
                            }
                            placeholder="Nhập tên hiển thị"
                          />
                          <p className="px-2 py-1 mt-1 text-xs rounded text-muted-foreground bg-muted">
                            Key: {columnName}
                          </p>
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
                            value={configForm[columnName].he_so}
                            onChange={(e) =>
                              onConfigInputChange(
                                columnName,
                                'he_so',
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => onRemoveColumn(columnName)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                        title={`Xóa cột "${configForm[columnName].label}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            onClick={onAddColumn}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm cột</span>
          </Button>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={onSaveConfig}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigEditorModal;
