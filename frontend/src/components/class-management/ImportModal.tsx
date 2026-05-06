import { Upload, Loader2 } from 'lucide-react';
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

interface ImportedGradeRow {
  ho_va_ten: string;
  email: string;
  so_dien_thoai: string;
  lop_hoc: string;
  khoi: string;
  ngay_sinh?: string;
  gioi_tinh?: string;
  dia_chi?: string;
  nam_nhap_hoc?: string;
  ten_phu_huynh?: string;
  sdt_phu_huynh?: string;
  ten_bo?: string;
  sdt_bo?: string;
  ten_me?: string;
  sdt_me?: string;
  [key: string]: any;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedData: ImportedGradeRow[];
  importErrors: string[];
  importLoading: boolean;
  onConfirmImport: () => void;
  onClose: () => void;
}

const ImportModal = ({
  open,
  onOpenChange,
  importedData,
  importErrors,
  importLoading,
  onConfirmImport,
  onClose,
}: ImportModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xem trước dữ liệu</DialogTitle>
          <DialogDescription>
            Kiểm tra dữ liệu trước khi nhập vào hệ thống ({importedData.length}{' '}
            học sinh)
          </DialogDescription>
        </DialogHeader>

        {importErrors.length > 0 && (
          <div className="p-4 mb-6 border rounded-lg bg-destructive/10 border-destructive/20">
            <h3 className="mb-3 text-lg font-semibold text-destructive">
              Các lỗi cần sửa:
            </h3>
            <div className="space-y-2 overflow-y-auto max-h-40">
              {importErrors.map((error, index) => (
                <div key={index} className="p-2 text-sm text-destructive">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-12">STT</TableHead>
                <TableHead className="min-w-32">Họ tên</TableHead>
                <TableHead className="min-w-32">Email</TableHead>
                <TableHead className="min-w-24">SĐT</TableHead>
                <TableHead className="min-w-20">Lớp</TableHead>
                <TableHead className="min-w-16">Khối</TableHead>
                <TableHead className="min-w-20">Năm nhập học</TableHead>
                <TableHead className="min-w-20">Ngày sinh</TableHead>
                <TableHead className="min-w-20">Giới tính</TableHead>
                <TableHead className="min-w-32">Địa chỉ</TableHead>
                <TableHead className="min-w-24">Tên phụ huynh</TableHead>
                <TableHead className="min-w-20">SĐT PH</TableHead>
                <TableHead className="min-w-20">Tên bố</TableHead>
                <TableHead className="min-w-20">SĐT bố</TableHead>
                <TableHead className="min-w-20">Tên mẹ</TableHead>
                <TableHead className="min-w-20">SĐT mẹ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importedData.map((student, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {student.ho_va_ten}
                  </TableCell>
                  <TableCell>{student.email || '-'}</TableCell>
                  <TableCell>{student.so_dien_thoai || '-'}</TableCell>
                  <TableCell className="font-medium">
                    {student.lop_hoc}
                  </TableCell>
                  <TableCell className="font-medium">
                    {student.khoi}
                  </TableCell>
                  <TableCell className="font-medium">
                    {student.nam_nhap_hoc || '-'}
                  </TableCell>
                  <TableCell>
                    {student.ngay_sinh || '-'}
                  </TableCell>
                  <TableCell>
                    {student.gioi_tinh || '-'}
                  </TableCell>
                  <TableCell>
                    {student.dia_chi || '-'}
                  </TableCell>
                  <TableCell>
                    {student.ten_phu_huynh || '-'}
                  </TableCell>
                  <TableCell>
                    {student.sdt_phu_huynh || '-'}
                  </TableCell>
                  <TableCell>
                    {student.ten_bo || '-'}
                  </TableCell>
                  <TableCell>
                    {student.sdt_bo || '-'}
                  </TableCell>
                  <TableCell>
                    {student.ten_me || '-'}
                  </TableCell>
                  <TableCell>
                    {student.sdt_me || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onConfirmImport}
            disabled={importLoading || importErrors.length > 0}
          >
            {importLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Đang nhập...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                <span>Xác nhận nhập ({importedData.length} học sinh)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;
