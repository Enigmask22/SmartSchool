// React already imported by JSX transform
import { Clipboard, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ImportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedData: any[];
  importErrors: string[];
  scoreConfig: any;
  onConfirmImport: () => void;
  onCancel: () => void;
  flattenScoreColumns: (config: Record<string, any>) => any[];
}

const ImportPreviewModal = ({
  open,
  onOpenChange,
  importedData,
  importErrors,
  scoreConfig,
  onConfirmImport,
  onCancel,
  flattenScoreColumns,
}: ImportPreviewModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmClick = async () => {
    setIsLoading(true);
    try {
      await onConfirmImport();
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clipboard className="w-4 h-4" />
            <span>Xem trước dữ liệu import</span>
          </DialogTitle>
          <DialogDescription>
            Kiểm tra kỹ thông tin trước khi cập nhật điểm •{" "}
            {importedData.length} học sinh
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {importErrors.length > 0 && (
            <div className="p-4 mb-4 border rounded-lg bg-destructive/10 border-destructive/20">
              <h4 className="flex items-center mb-2 space-x-1 font-bold text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Có {importErrors.length} lỗi:</span>
              </h4>
              <ul className="space-y-1 text-sm list-disc list-inside text-destructive">
                {importErrors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {importErrors.length > 10 && (
                  <li className="font-medium text-destructive">
                    ... và {importErrors.length - 10} lỗi khác
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Mã HS</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  {scoreConfig &&
                    flattenScoreColumns(scoreConfig.score_column_config).map(
                      (column: any) => (
                        <TableHead key={column.key} className="text-center">
                          {column.label}
                        </TableHead>
                      )
                    )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedData.map((row: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium text-primary">
                      {row.student_id}
                    </TableCell>
                    <TableCell>{row.ho_va_ten}</TableCell>
                    {scoreConfig &&
                      flattenScoreColumns(scoreConfig.score_column_config).map(
                        (column: any) => (
                          <TableCell key={column.key} className="text-center">
                            {row[column.key] !== null &&
                            row[column.key] !== undefined ? (
                              <Badge
                                variant="secondary"
                                className="text-green-700 bg-green-100"
                              >
                                {row[column.key]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )
                      )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importedData.length === 0 && (
            <div className="py-12 text-center">
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-muted">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Không có dữ liệu hợp lệ</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang cập nhật điểm...</span>
              </div>
            ) : (
              <>
                <span className="font-semibold">{importedData.length}</span> bản
                ghi sẽ được cập nhật
                {importErrors.length > 0 && (
                  <span className="ml-2 text-destructive">
                    •{" "}
                    <span className="font-semibold">{importErrors.length}</span> lỗi
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirmClick}
              disabled={
                importedData.length === 0 || importErrors.length > 0 || isLoading
              }
              className="hover:bg-primary/90 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Cập nhật điểm"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportPreviewModal;
