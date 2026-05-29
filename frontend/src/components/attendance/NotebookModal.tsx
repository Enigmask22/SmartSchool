import { useState, useRef, useEffect } from "react";
import ApiService from "../../utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import logger from "../../utils/logger";

/**
 * Modal xem/upload ảnh chụp sổ đầu bài cho lớp học.
 *
 * Props:
 * - open: boolean - Trạng thái mở/đóng modal
 * - onClose: () => void - Callback khi đóng modal
 * - classId: number - ID lớp học
 * - className: string - Tên lớp (hiển thị)
 * - targetDate: string - Ngày điểm danh (YYYY-MM-DD)
 * - existingImageUrl: string|null - URL ảnh sổ đầu bài hiện tại (nếu có)
 * - onUploadSuccess: (imageUrl: string) => void - Callback sau khi upload thành công
 * - uploadDisabled: khi true chỉ xem, không upload/thay ảnh (khóa sửa điểm danh).
 */
const NotebookModal = ({
  open,
  onClose,
  classId,
  className,
  targetDate,
  existingImageUrl,
  onUploadSuccess,
  uploadDisabled = false,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(existingImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ imageUrl khi prop thay đổi
  useEffect(() => {
    setImageUrl(existingImageUrl || null);
    setPreviewFile(null);
    setError(null);
    setSuccessMsg(null);
  }, [existingImageUrl, classId, targetDate, open]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPG, PNG, WebP)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File ảnh vượt quá 5MB");
      return;
    }

    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setPreviewFile({ file, previewUrl });
  };

  const handleUpload = async () => {
    if (!previewFile?.file) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await ApiService.uploadNotebookImage(
        classId,
        previewFile.file,
        targetDate,
      );

      if (response.success) {
        const newUrl = response.data?.image_url;
        setImageUrl(newUrl);
        setPreviewFile(null);
        setSuccessMsg("Upload sổ đầu bài thành công!");
        setTimeout(() => setSuccessMsg(null), 3000);

        if (onUploadSuccess) {
          onUploadSuccess(newUrl);
        }
      } else {
        setError(response.message || "Lỗi upload sổ đầu bài");
      }
    } catch (err) {
      logger.error("Error uploading notebook:", err);
      setError("Không thể upload sổ đầu bài. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (previewFile?.previewUrl) {
      URL.revokeObjectURL(previewFile.previewUrl);
    }
    setPreviewFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleCancelPreview();
    onClose();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    } catch {
      return dateStr;
    }
  };

  const displayImageUrl = previewFile?.previewUrl || imageUrl;
  const hasExistingImage = !!imageUrl;
  const hasPreview = !!previewFile;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sổ đầu bài</DialogTitle>
          <DialogDescription>
            {className && (
              <span className="font-semibold">Lớp {className}</span>
            )}
            {targetDate && <> | Ngày: {formatDisplayDate(targetDate)}</>}
          </DialogDescription>
        </DialogHeader>

        {/* Thông báo khóa sửa */}
        {uploadDisabled && (
          <div className="p-3 text-sm border rounded text-amber-800 bg-amber-50 border-amber-200">
            Đã quá hạn chỉnh sửa điểm danh. Chỉ xem được sổ đầu bài đã lưu; không thể tải lên hoặc thay đổi.
          </div>
        )}

        {/* Thông báo lỗi */}
        {error && (
          <div className="p-3 text-sm border rounded text-destructive bg-destructive/10 border-destructive/20">
            {error}
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="p-3 text-sm text-green-700 bg-green-100 border border-green-400 rounded">
            {successMsg}
          </div>
        )}

        {/* Hiển thị ảnh */}
        <div className="flex flex-col items-center gap-4">
          {displayImageUrl ? (
            <div className="relative w-full">
              <img
                src={displayImageUrl}
                alt="Sổ đầu bài"
                className="object-contain w-full rounded-lg border max-h-[500px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  setError("Không thể tải ảnh sổ đầu bài");
                }}
              />
              {hasPreview && (
                <div className="absolute px-2 py-1 text-xs text-white bg-yellow-500 rounded top-2 left-2">
                  Xem trước - Chưa lưu
                </div>
              )}
              {!hasPreview && hasExistingImage && (
                <div className="absolute px-2 py-1 text-xs text-white bg-green-600 rounded top-2 left-2">
                  Đã lưu
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-12 border-2 border-dashed rounded-lg text-muted-foreground">
              <svg
                className="w-12 h-12 mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">Chưa có sổ đầu bài cho ngày này</p>
              <p className="mt-1 text-xs">
                Nhấn &quot;Chọn ảnh&quot; để upload ảnh chụp sổ đầu bài
              </p>
            </div>
          )}
        </div>

        {/* File input ẩn */}
        {!uploadDisabled && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={handleFileSelect}
          />
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Nút chọn ảnh mới */}
          {!uploadDisabled && !hasPreview && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {hasExistingImage ? "Thay đổi ảnh" : "Chọn ảnh"}
            </Button>
          )}

          {/* Khi đang preview: nút Upload + Hủy */}
          {!uploadDisabled && hasPreview && (
            <>
              <Button
                variant="outline"
                onClick={handleCancelPreview}
                disabled={uploading}
              >
                Hủy
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent" />
                    Đang upload...
                  </span>
                ) : (
                  "Upload sổ đầu bài"
                )}
              </Button>
            </>
          )}

          {/* Nút đóng */}
          {(!hasPreview || uploadDisabled) && (
            <Button variant="secondary" onClick={handleClose}>
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotebookModal;
