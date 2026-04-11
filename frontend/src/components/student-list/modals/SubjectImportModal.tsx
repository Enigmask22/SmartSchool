import { Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubjectImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClass: string;
  subjectImportFile?: File | null;
  subjectImportLoading: boolean;
  onFileSelect: (file: File | undefined) => void;
  onImport: () => void;
  onClose: () => void;
}

export function SubjectImportModal({
  open,
  onOpenChange,
  selectedClass,
  subjectImportFile,
  subjectImportLoading,
  onFileSelect,
  onImport,
  onClose,
}: SubjectImportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import môn học cho lớp {selectedClass}</DialogTitle>
          <DialogDescription>
            Tải file Excel đã điền thông tin môn học của học sinh
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Hướng dẫn */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">
              📋 Hướng dẫn:
            </h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Tải file mẫu bằng nút "Tải mẫu nhập môn học"</li>
              <li>Điền chữ "x" vào ô nếu học sinh chọn môn đó</li>
              <li>Các môn bắt buộc đã được đánh dấu sẵn</li>
              <li>Upload file đã hoàn thành vào đây</li>
            </ol>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="subject-file">Chọn file Excel</Label>
            <Input
              id="subject-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => onFileSelect(e.target.files?.[0])}
              className="cursor-pointer"
            />
            {subjectImportFile && (
              <p className="text-sm text-green-600">
                ✓ Đã chọn: {subjectImportFile.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onFileSelect(undefined);
            }}
            disabled={subjectImportLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={onImport}
            disabled={!subjectImportFile || subjectImportLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {subjectImportLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang import...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
