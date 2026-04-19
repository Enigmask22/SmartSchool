import React, { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Upload,
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  BarChart3,
  FileText,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import api from "@/utils/api";
import logger from "@/utils/logger";

interface ParsedDataType {
  parsed_rows?: any[];
  total_valid?: number;
  total_errors?: number;
  total_parsed?: number;
  validation_errors?: any[];
  ocr_errors?: any[];
  [key: string]: any;
}

interface ApiError {
  response?: {
    status?: number;
  };
  message?: string;
}

const OCRScoreSheet = ({
  selectedClassSubject,
  academicYear,
  semester,
  onImportSuccess,
  disabled = false,
}: {
  selectedClassSubject: any;
  academicYear: string;
  semester: string;
  onImportSuccess: any;
  disabled?: boolean;
}) => {
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDataType | null>(null);
  const [confirmState, setConfirmState] = useState<any>({ open: false });

  const openConfirm = useCallback(
    (config: any) =>
      setConfirmState({
        open: true,
        variant: "destructive",
        confirmText: "Xác nhận",
        ...config,
      }),
    [],
  );

  const closeConfirm = useCallback(
    () => setConfirmState((prev: any) => ({ ...prev, open: false })),
    [],
  );
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Queue management states
  const [_requestId, setRequestId] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null); // 'queued', 'processing', 'completed', 'failed'
  const [_progress, setProgress] = useState<number>(0);
  const [_statusMessage, setStatusMessage] = useState<string>("");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [ocrEngine, setOcrEngine] = useState<"gemini" | "qwen">("gemini");
  const [estimatedWaitSeconds, setEstimatedWaitSeconds] = useState<
    number | null
  >(null);
  const [nextWindowInSeconds, setNextWindowInSeconds] = useState<number | null>(
    null,
  );

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20); // 20 rows per page

  // Editing states - cho phép sửa điểm trực tiếp trong preview
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null); // Index của row đang edit (trong sorted list)
  const [editValues, setEditValues] = useState<any>({}); // Giá trị đang edit

  const scoreColumns = useMemo(() => {
    if (!parsedData) return [];

    if (
      Array.isArray(parsedData.score_columns) &&
      parsedData.score_columns.length > 0
    ) {
      return parsedData.score_columns;
    }

    if (
      !Array.isArray(parsedData.parsed_rows) ||
      parsedData.parsed_rows.length === 0
    ) {
      return [];
    }

    const excludedFields = new Set([
      "id",
      "student_id",
      "student_db_id",
      "ho_va_ten",
      "full_name",
      "class_name",
      "ocr_name",
      "diem_thuong_xuyen",
    ]);

    const columnsSet = new Set<string>();
    parsedData.parsed_rows.forEach((row) => {
      if (!row || typeof row !== "object") return;
      Object.keys(row).forEach((key) => {
        if (!excludedFields.has(key)) {
          columnsSet.add(key);
        }
      });
    });

    const sortKey = (column: string): [number, number, string] => {
      const lowered = column.toLowerCase();
      if (lowered.startsWith("diem_tx") || lowered.includes("thuong_xuyen")) {
        const match = lowered.match(/diem_tx(\d+)/);
        return [1, match ? Number(match[1]) : 0, lowered];
      }
      if (lowered.includes("giua") || lowered.endsWith("_gk")) {
        return [2, 0, lowered];
      }
      if (lowered.includes("cuoi") || lowered.endsWith("_ck")) {
        return [3, 0, lowered];
      }
      return [4, 0, lowered];
    };

    return Array.from(columnsSet).sort((a, b) => {
      const [pa, ia, sa] = sortKey(a);
      const [pb, ib, sb] = sortKey(b);
      if (pa !== pb) return pa - pb;
      if (ia !== ib) return ia - ib;
      return sa.localeCompare(sb);
    });
  }, [parsedData]);

  const getColumnLabel = (column: string) => {
    const lowered = column.toLowerCase();
    if (lowered === "diem_tx") return "ĐTX";
    if (lowered.startsWith("diem_tx"))
      return column.replace("Diem_", "").replace("diem_", "").toUpperCase();
    if (lowered.includes("giua") || lowered.endsWith("_gk")) return "ĐGK";
    if (lowered.includes("cuoi") || lowered.endsWith("_ck")) return "ĐCK";
    return column;
  };

  // Hàm cập nhật điểm trong parsedData
  const handleScoreChange = (
    _globalIndex: number,
    field: string,
    value: any,
  ) => {
    // Validate score value
    let normalizedValue = value.trim();

    if (normalizedValue !== "") {
      const upperValue = normalizedValue.toUpperCase();

      // Accept letter grades
      if (["Đ", "D", "DAT", "ĐẠT"].includes(upperValue)) {
        normalizedValue = "Đ";
      } else if (
        [
          "KĐ",
          "KD",
          "KHONG_DAT",
          "KHONGDAT",
          "KHÔNG_ĐẠT",
          "KHÔNG ĐẠT",
        ].includes(upperValue)
      ) {
        normalizedValue = "KĐ";
      } else {
        // Try parsing as number
        const numValue = parseFloat(normalizedValue);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
          normalizedValue = numValue;
        }
      }
    } else {
      normalizedValue = null;
    }

    // Update editValues for current editing session
    setEditValues((prev) => ({
      ...prev,
      [field]: value, // Keep original input value for display
    }));
  };

  // Lưu thay đổi vào parsedData
  const handleSaveEdit = (globalIndex) => {
    if (!parsedData || !parsedData.parsed_rows) return;

    // Sort rows giống như trong render
    const sortedRows = [...parsedData.parsed_rows].sort((a, b) => {
      const aId = parseInt(a.student_id) || 0;
      const bId = parseInt(b.student_id) || 0;
      return aId - bId;
    });

    // Tìm original index trong parsedData.parsed_rows
    const rowToUpdate = sortedRows[globalIndex];
    const originalIndex = parsedData.parsed_rows.findIndex(
      (r) => r.student_id === rowToUpdate.student_id,
    );

    if (originalIndex === -1) return;

    // Normalize và update values
    const updatedRows = [...parsedData.parsed_rows];
    const row = { ...updatedRows[originalIndex] };

    // Update each score column if it was edited
    scoreColumns.forEach((field) => {
      if (editValues[field] !== undefined) {
        const value = String(editValues[field] ?? "").trim();
        if (value === "") {
          row[field] = null;
        } else {
          const upperValue = value.toUpperCase();
          if (["Đ", "D", "DAT", "ĐẠT"].includes(upperValue)) {
            row[field] = "Đ";
          } else if (
            [
              "KĐ",
              "KD",
              "KHONG_DAT",
              "KHONGDAT",
              "KHÔNG_ĐẠT",
              "KHÔNG ĐẠT",
            ].includes(upperValue)
          ) {
            row[field] = "KĐ";
          } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
              row[field] = numValue;
            }
          }
        }
      }
    });

    updatedRows[originalIndex] = row;

    setParsedData({
      ...parsedData,
      parsed_rows: updatedRows,
    });

    // Reset editing state
    setEditingRowIndex(null);
    setEditValues({});
  };

  // Bắt đầu edit một row
  const handleStartEdit = (globalIndex, row) => {
    const initialValues = {};
    scoreColumns.forEach((column) => {
      const value = row[column];
      initialValues[column] =
        value !== null && value !== undefined ? String(value) : "";
    });

    setEditingRowIndex(globalIndex);
    setEditValues(initialValues);
  };

  // Hủy edit
  const handleCancelEdit = () => {
    setEditingRowIndex(null);
    setEditValues({});
  };

  // Xóa một row
  const handleDeleteRow = (globalIndex) => {
    if (!parsedData || !parsedData.parsed_rows) return;

    openConfirm({
      title: "Xóa học sinh khỏi danh sách",
      description: "Bạn có chắc muốn xóa học sinh này khỏi danh sách?",
      confirmText: "Xóa",
      onConfirm: () => {
        closeConfirm();
        doDeleteRow(globalIndex);
      },
    });
  };

  const doDeleteRow = (globalIndex) => {
    if (!parsedData || !parsedData.parsed_rows) return;

    // Sort rows giống như trong render
    const sortedRows = [...parsedData.parsed_rows].sort((a, b) => {
      const aId = parseInt(a.student_id) || 0;
      const bId = parseInt(b.student_id) || 0;
      return aId - bId;
    });

    const rowToDelete = sortedRows[globalIndex];
    const updatedRows = parsedData.parsed_rows.filter(
      (r) => r.student_id !== rowToDelete.student_id,
    );

    setParsedData({
      ...parsedData,
      parsed_rows: updatedRows,
      total_rows: updatedRows.length,
      total_valid: updatedRows.length,
    });
  };

  // Reset page when parsedData changes
  React.useEffect(() => {
    setCurrentPage(1);

    // Auto scroll to bottom of dialog when data is parsed
    if (
      parsedData &&
      parsedData.parsed_rows &&
      parsedData.parsed_rows.length > 0
    ) {
      setTimeout(() => {
        // Find the DialogContent and scroll to bottom
        const dialogContent = document.querySelector('[role="dialog"]');
        if (dialogContent) {
          dialogContent.scrollTo({
            top: dialogContent.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 500); // Increase delay to ensure content is fully rendered
    }
  }, [parsedData]);

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (files.length === 0) return;

    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (files.length > maxFiles) {
      toast.warning(`Chỉ được chọn tối đa ${maxFiles} ảnh mỗi lần.`);
    }

    const limitedFiles = files.slice(0, maxFiles);
    const validFiles: File[] = [];

    for (const file of limitedFiles) {
      if (!file.type.startsWith("image/")) {
        toast.warning(`Bỏ qua ${file.name}: không phải file ảnh hợp lệ.`);
        continue;
      }

      if (file.size > maxSize) {
        toast.warning(`Bỏ qua ${file.name}: ảnh lớn hơn 10MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    try {
      const previews = await Promise.all(
        validFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  resolve(reader.result);
                } else {
                  reject(new Error("Không đọc được ảnh preview"));
                }
              };
              reader.onerror = () => reject(new Error("Lỗi đọc file ảnh"));
              reader.readAsDataURL(file);
            }),
        ),
      );

      setSelectedImages(validFiles);
      setImagePreviews(previews);
    } catch (error) {
      logger.error("Error creating image previews:", error);
      toast.error("Không thể tạo preview cho ảnh đã chọn.");
    }

    event.target.value = ""; // Reset input
  };

  // Poll status của OCR request
  const pollOCRStatus = async (reqId) => {
    try {
      const response = await api.getOCRStatus(reqId);
      const payload = response?.data;
      const status = payload?.status;

      if (status) {
        setOcrStatus(status);
        setProgress(payload.progress || 0);
        setStatusMessage(payload.message || "");
        setQueuePosition(payload.position_in_queue ?? null);
        setEstimatedWaitSeconds(payload.estimated_wait_seconds ?? null);
        setNextWindowInSeconds(payload.next_window_in_seconds ?? null);

        if (status === "queued") {
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 3000); // Poll every 3 seconds
        } else if (status === "processing") {
          setQueuePosition(null);
          setEstimatedWaitSeconds(null);
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 2000); // Poll every 2 seconds when processing
        } else if (status === "completed") {
          // Parse completed!
          const result = payload.result;
          setParsedData(result);
          setParsing(false);
          setUploading(false);
          setOcrStatus(null); // Clear status để ẩn UI loading
          setProgress(0);
          setStatusMessage("");
          setQueuePosition(null);
          setEstimatedWaitSeconds(null);
          setNextWindowInSeconds(null);

          if (result.total_valid === 0) {
            toast.warning("Không tìm thấy dữ liệu hợp lệ trong ảnh!", {
              description:
                "Kiểm tra: ảnh đủ sáng, rõ nét và đúng format (id, họ và tên, điểm).",
            });
          } else if (result.total_errors > 0) {
            toast.warning(
              `Phân tích thành công nhưng có ${result.total_errors} lỗi!`,
              {
                description: `Hợp lệ: ${result.total_valid} học sinh • Lỗi: ${result.total_errors} dòng`,
              },
            );
          } else {
            toast.success("Phân tích bảng điểm thành công!", {
              description: `Tìm thấy ${result.total_valid} học sinh.`,
            });
          }
        } else if (status === "failed") {
          // Failed
          setParsing(false);
          setUploading(false);
          setOcrStatus(null); // Clear status
          setProgress(0);
          setStatusMessage("");
          setQueuePosition(null);
          setEstimatedWaitSeconds(null);
          setNextWindowInSeconds(null);
          toast.error(
            "Lỗi khi xử lý ảnh: " + (payload.error || "Unknown error"),
          );
        }
      } else {
        throw new Error(response?.message || "Failed to get status");
      }
    } catch (error) {
      logger.error("Error polling OCR status:", error);
      setParsing(false);
      setUploading(false);
      setQueuePosition(null);
      setEstimatedWaitSeconds(null);
      setNextWindowInSeconds(null);
      toast.error("Lỗi khi kiểm tra trạng thái OCR!");
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedImages || selectedImages.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 ảnh bảng điểm!");
      return;
    }

    try {
      setUploading(true);
      setParsing(true);
      setOcrStatus("uploading");
      setProgress(0);
      setStatusMessage(`Đang upload ${selectedImages.length} ảnh...`);

      const formData = new FormData();
      selectedImages.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("ocr_engine", ocrEngine);

      const response = await api.parseScoreSheetOCR(formData);

      if (response.success) {
        // Get request_id and start polling
        const reqId = response.data.request_id;
        setRequestId(reqId);
        setOcrStatus(response.data.status); // Should be 'queued'
        setQueuePosition(response.data.position_in_queue ?? null);
        setEstimatedWaitSeconds(response.data.estimated_wait_seconds ?? null);
        setNextWindowInSeconds(response.data.next_window_in_seconds ?? null);
        setStatusMessage(response.data.message || "Đã thêm vào hàng chờ...");

        // Start polling status
        setTimeout(() => pollOCRStatus(reqId), 2000); // Start polling after 2s
      } else {
        toast.error("Lỗi khi upload ảnh: " + response.message);
        setUploading(false);
        setParsing(false);
      }
    } catch (error) {
      logger.error("Error uploading OCR:", error);

      // Check if queue is full (HTTP 503)
      const apiError = error as ApiError;
      if (apiError?.response && apiError.response.status === 503) {
        toast.warning("Hệ thống đang quá tải!", {
          description: "Hàng chờ đã đầy. Vui lòng thử lại sau vài phút.",
        });
      } else {
        toast.error("Lỗi khi xử lý ảnh! Vui lòng thử lại.");
      }

      setUploading(false);
      setParsing(false);
      setQueuePosition(null);
      setEstimatedWaitSeconds(null);
      setNextWindowInSeconds(null);
    }
  };

  const handleConfirmImport = async () => {
    if (
      !parsedData ||
      !parsedData.parsed_rows ||
      parsedData.parsed_rows.length === 0
    ) {
      toast.warning("Không có dữ liệu để import!");
      return;
    }

    try {
      setUploading(true);

      const importScoreColumns =
        scoreColumns.length > 0
          ? scoreColumns
          : ["diem_thuong_xuyen", "diem_thi_giua_ki", "diem_thi_cuoi_ki"];

      // Convert parsed data to import format (dynamic score columns)
      const grades = parsedData.parsed_rows.map((row) => {
        const gradeRow: any = {
          student_id: row.student_id,
        };

        importScoreColumns.forEach((column) => {
          if (row[column] !== undefined) {
            gradeRow[column] = row[column];
          }
        });

        return gradeRow;
      });

      const importPayload = {
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grades: grades,
      };

      const response = await api.bulkImportScores(importPayload);

      if (response.success) {
        toast.success(response.message, {
          description: `Thành công: ${response.data.success_count} bản ghi${
            response.data.error_count > 0
              ? ` • Lỗi: ${response.data.error_count} bản ghi`
              : ""
          }`,
        });

        // Reset and close
        handleCloseModal();

        // Callback to refresh data
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        toast.error("Lỗi khi import điểm: " + response.message);
      }
    } catch (error) {
      logger.error("Error importing grades from OCR:", error);
      toast.error("Lỗi khi import điểm!");
    } finally {
      setUploading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (
      !parsedData ||
      !parsedData.parsed_rows ||
      parsedData.parsed_rows.length === 0
    ) {
      toast.warning("Không có dữ liệu để export!");
      return;
    }

    try {
      await api.exportParsedOCRToExcel({
        parsed_rows: parsedData.parsed_rows,
        class_subject_id: selectedClassSubject?.id,
        score_columns: scoreColumns,
      });
      toast.success("Tải file Excel thành công!");
    } catch (error) {
      logger.error("Error exporting OCR data:", error);
      toast.error("Lỗi khi export file!");
    }
  };

  const handleCloseModal = () => {
    setShowOCRModal(false);
    setParsedData(null);
    setSelectedImages([]);
    setImagePreviews([]);

    // Reset queue states
    setRequestId(null);
    setOcrStatus(null);
    setProgress(0);
    setStatusMessage("");
    setQueuePosition(null);
    setEstimatedWaitSeconds(null);
    setNextWindowInSeconds(null);
  };

  return (
    <>
      {/* OCR Button */}
      <Button
        onClick={() => setShowOCRModal(true)}
        disabled={disabled}
        className="flex items-center space-x-2"
        title={
          disabled
            ? "Vui lòng cấu hình điểm trước khi quét ảnh"
            : "Upload ảnh bảng điểm viết tay để tự động nhận dạng"
        }
      >
        <Camera className="w-4 h-4" />
        <span>OCR - Nhập điểm từ ảnh</span>
      </Button>

      {/* OCR Modal */}
      <Dialog open={showOCRModal} onOpenChange={setShowOCRModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Camera className="w-6 h-6 text-primary" />
              <span>OCR - Nhận dạng bảng điểm viết tay</span>
            </DialogTitle>
            <DialogDescription>
              Upload ảnh chụp bảng điểm để tự động nhận dạng và nhập điểm
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6">
            {!parsedData ? (
              // Upload Section
              <div className="space-y-6">
                {/* Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Hướng dẫn</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Chụp ảnh bảng điểm rõ nét, đủ sáng</li>
                      <li>
                        • Bảng điểm phải có các cột:{" "}
                        <strong>
                          id, ho_va_ten và các cột điểm theo môn (ví dụ: Diem_tx
                          hoặc Diem_tx1..Diem_tx4, Diem_thi_giua_ki,
                          Diem_thi_cuoi_ki)
                        </strong>
                      </li>
                      <li>• Viết tay hoặc in đều được hỗ trợ</li>
                      <li>• Định dạng ảnh: JPG, PNG (tối đa 10MB/ảnh)</li>
                      <li>• Có thể chọn nhiều ảnh, tối đa 5 ảnh/lần</li>
                      <li>
                        • Nên đặt ảnh có header cột ở vị trí đầu tiên để OCR map
                        cột chính xác
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Image Preview */}
                {imagePreviews.length > 0 && selectedImages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Ảnh đã chọn ({selectedImages.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {imagePreviews.map((preview, idx) => (
                          <div
                            key={`${selectedImages[idx]?.name || "image"}-${idx}`}
                            className="rounded-lg border p-3"
                          >
                            <img
                              src={preview}
                              alt={`Preview ${idx + 1}`}
                              className="mx-auto max-h-64 w-full rounded-md object-contain"
                            />
                            <p className="mt-2 text-xs text-center text-muted-foreground">
                              #{idx + 1} {selectedImages[idx]?.name} (
                              {(
                                (selectedImages[idx]?.size || 0) /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB)
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upload Button */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-full max-w-md rounded-md border bg-muted/20 p-3">
                    <label className="mb-2 block text-sm font-medium">
                      OCR Engine
                    </label>
                    <select
                      value={ocrEngine}
                      onChange={(event) =>
                        setOcrEngine(event.target.value as "gemini" | "qwen")
                      }
                      disabled={parsing || uploading}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="gemini">Gemini API (nhanh, cloud)</option>
                      <option value="qwen">
                        Qwen local (chậm hơn, private)
                      </option>
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Qwen thường mất lâu hơn (có thể 1-2 phút/ảnh), phù hợp khi
                      muốn xử lý local.
                    </p>
                  </div>

                  <Button asChild className="w-full max-w-md">
                    <label className="cursor-pointer">
                      <Upload className="w-5 h-5 mr-2" />
                      <span>
                        {selectedImages.length > 0
                          ? "Chọn lại ảnh"
                          : "Chọn ảnh bảng điểm"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </Button>

                  {selectedImages.length > 0 && !parsing && (
                    <Button
                      onClick={handleUploadAndParse}
                      disabled={uploading}
                      size="lg"
                      className="w-full max-w-md"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          <span>
                            Phân tích {selectedImages.length} ảnh bảng điểm
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Progress Display */}
                  {parsing && (
                    <Card className="mt-6 w-full max-w-md">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {ocrStatus === "queued" && (
                              <>
                                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                <span className="font-semibold text-yellow-700 flex items-center space-x-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Đang trong hàng chờ</span>
                                </span>
                              </>
                            )}
                            {ocrStatus === "processing" && (
                              <>
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                <span className="font-semibold text-primary flex items-center space-x-2">
                                  <RefreshCw className="w-4 h-4" />
                                  <span>Đang xử lý OCR</span>
                                </span>
                              </>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Status Message */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-800 flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                              {_statusMessage ||
                                "Yêu cầu đã vào hàng đợi. Vui lòng chờ hệ thống xử lý..."}
                            </span>
                          </p>
                          {_progress > 0 && (
                            <p className="mt-2 text-xs text-blue-700">
                              Tiến độ: {_progress}%
                            </p>
                          )}
                        </div>

                        {/* Queue Position */}
                        {queuePosition !== null && (
                          <div className="p-3 mt-3 bg-yellow-50 rounded-md border border-yellow-200">
                            <p className="text-xs text-yellow-800 flex items-center space-x-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                Vị trí trong hàng chờ:{" "}
                                <strong className="text-lg">
                                  #{queuePosition}
                                </strong>
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Estimated Wait */}
                        {estimatedWaitSeconds !== null &&
                          estimatedWaitSeconds > 0 && (
                            <div className="p-3 mt-3 bg-amber-50 rounded-md border border-amber-200">
                              <p className="text-xs text-amber-800">
                                Ước tính chờ: khoảng{" "}
                                <strong>
                                  {estimatedWaitSeconds >= 60
                                    ? `${Math.ceil(estimatedWaitSeconds / 60)} phút`
                                    : `${estimatedWaitSeconds} giây`}
                                </strong>
                              </p>
                            </div>
                          )}

                        {/* Next Window */}
                        {ocrStatus === "queued" &&
                          nextWindowInSeconds !== null &&
                          nextWindowInSeconds > 0 && (
                            <div className="p-3 mt-3 bg-slate-50 rounded-md border border-slate-200">
                              <p className="text-xs text-slate-700">
                                Đợt xử lý quota kế tiếp sau khoảng{" "}
                                <strong>{nextWindowInSeconds}s</strong>
                              </p>
                            </div>
                          )}

                        {/* Info */}
                        <p className="mt-3 text-xs italic text-muted-foreground">
                          💡 Bạn có thể đóng cửa sổ này. Hệ thống sẽ tự động xử
                          lý.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              // Results Section
              <div id="ocr-results-section" className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-700">
                          Hợp lệ
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-green-900">
                        {parsedData.total_valid}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm font-medium text-red-700">Lỗi</p>
                      </div>
                      <p className="text-3xl font-bold text-red-900">
                        {parsedData.total_errors}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <p className="text-sm font-medium text-blue-700">
                          Tổng
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">
                        {parsedData.total_parsed}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Errors Display */}
                {parsedData.validation_errors &&
                  parsedData.validation_errors.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-red-900">
                          <AlertCircle className="w-5 h-5" />
                          <span>Lỗi validation</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-y-auto max-h-32">
                          <ul className="space-y-2 text-sm text-red-800">
                            {parsedData.validation_errors.map((error, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span>
                                  Row {error.row}: {error.error}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* OCR Errors */}
                {parsedData.ocr_errors && parsedData.ocr_errors.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-yellow-900">
                        <AlertCircle className="w-5 h-5" />
                        <span>Cảnh báo OCR</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-y-auto max-h-32">
                        <ul className="space-y-2 text-sm text-yellow-800">
                          {parsedData.ocr_errors.map((error, idx) => (
                            <li
                              key={idx}
                              className="flex items-start space-x-2"
                            >
                              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pagination Summary */}
                {parsedData &&
                  parsedData.parsed_rows &&
                  (() => {
                    const totalRows = parsedData.parsed_rows.length;
                    // const totalPages = Math.ceil(totalRows / pageSize);
                    const startIndex = (currentPage - 1) * pageSize;
                    const endIndex = startIndex + pageSize;

                    if (totalRows > pageSize) {
                      return (
                        <Card className="mb-4">
                          <CardContent className="p-4">
                            <div className="flex flex-wrap gap-3 justify-between items-center">
                              <div className="text-sm text-muted-foreground">
                                Hiển thị{" "}
                                <span className="font-semibold">
                                  {startIndex + 1}
                                </span>{" "}
                                đến{" "}
                                <span className="font-semibold">
                                  {Math.min(endIndex, totalRows)}
                                </span>{" "}
                                trong tổng số{" "}
                                <span className="font-semibold">
                                  {totalRows}
                                </span>{" "}
                                bản ghi
                              </div>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-muted-foreground">
                                  Số lượng/trang:
                                </label>
                                <select
                                  value={pageSize}
                                  onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                  }}
                                  className="py-1 pr-8 pl-3 text-sm bg-background rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  <option value={10}>10</option>
                                  <option value={20}>20</option>
                                  <option value={30}>30</option>
                                  <option value={50}>50</option>
                                </select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}

                {/* Data Table */}
                <Card>
                  <CardHeader className="py-3 px-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Dữ liệu đã nhận dạng
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Edit2 className="w-3 h-3" />
                        <span>Click vào hàng để chỉnh sửa điểm</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-medium text-left">
                              STT
                            </TableHead>
                            <TableHead className="text-xs font-medium text-left">
                              MÃ SỐ HỌC SINH
                            </TableHead>
                            <TableHead className="text-xs font-medium text-left">
                              HỌ VÀ TÊN
                            </TableHead>
                            <TableHead className="text-xs font-medium text-left">
                              LỚP
                            </TableHead>
                            {scoreColumns.map((column) => (
                              <TableHead
                                key={column}
                                className="text-xs font-medium text-center"
                              >
                                {getColumnLabel(column)}
                              </TableHead>
                            ))}
                            <TableHead className="text-xs font-medium text-center w-24">
                              TÙY CHỌN
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData &&
                            parsedData.parsed_rows &&
                            (() => {
                              // const totalRows = parsedData.parsed_rows.length;
                              const startIndex = (currentPage - 1) * pageSize;
                              const endIndex = startIndex + pageSize;
                              // Sắp xếp theo student_id tăng dần trước khi phân trang
                              const sortedRows = [
                                ...parsedData.parsed_rows,
                              ].sort((a, b) => {
                                const aId = parseInt(a.student_id) || 0;
                                const bId = parseInt(b.student_id) || 0;
                                return aId - bId;
                              });
                              const paginatedRows = sortedRows.slice(
                                startIndex,
                                endIndex,
                              );

                              return paginatedRows.map((row, idx) => {
                                const globalIndex = startIndex + idx; // Index trong sorted list
                                const isEditing =
                                  editingRowIndex === globalIndex;

                                return (
                                  <TableRow
                                    key={idx}
                                    className={`${
                                      isEditing
                                        ? "bg-blue-50"
                                        : "hover:bg-muted/50 cursor-pointer"
                                    }`}
                                    onClick={() =>
                                      !isEditing &&
                                      handleStartEdit(globalIndex, row)
                                    }
                                  >
                                    <TableCell className="text-sm">
                                      {startIndex + idx + 1}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-primary">
                                      {row.student_id}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {row.full_name}
                                      {row.ocr_name &&
                                        row.ocr_name !== row.full_name && (
                                          <span className="block text-xs text-muted-foreground">
                                            OCR: {row.ocr_name}
                                          </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {row.class_name}
                                    </TableCell>

                                    {scoreColumns.map((column) => {
                                      const cellValue = row[column];
                                      return (
                                        <TableCell
                                          key={`${globalIndex}-${column}`}
                                          className="text-sm text-center"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {isEditing ? (
                                            <Input
                                              type="text"
                                              value={editValues[column] ?? ""}
                                              onChange={(e) =>
                                                handleScoreChange(
                                                  globalIndex,
                                                  column,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="0-10, Đ, KĐ"
                                              className="w-16 h-7 text-xs text-center mx-auto"
                                            />
                                          ) : cellValue !== null &&
                                            cellValue !== undefined ? (
                                            <Badge
                                              variant="secondary"
                                              className="bg-blue-100 text-blue-700"
                                            >
                                              {cellValue}
                                            </Badge>
                                          ) : (
                                            <span className="text-muted-foreground">
                                              -
                                            </span>
                                          )}
                                        </TableCell>
                                      );
                                    })}

                                    {/* Actions */}
                                    <TableCell
                                      className="text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isEditing ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="h-6 w-6 p-0"
                                            onClick={() =>
                                              handleSaveEdit(globalIndex)
                                            }
                                            title="Lưu"
                                          >
                                            <Save className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={handleCancelEdit}
                                            title="Hủy"
                                          >
                                            <XCircle className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartEdit(globalIndex, row);
                                            }}
                                            title="Sửa"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteRow(globalIndex);
                                            }}
                                            title="Xóa"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              });
                            })()}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Pagination Controls */}
                {parsedData &&
                  parsedData.parsed_rows &&
                  (() => {
                    const totalRows = parsedData.parsed_rows.length;
                    const totalPages = Math.ceil(totalRows / pageSize);
                    // const startIndex = (currentPage - 1) * pageSize;
                    // const endIndex = startIndex + pageSize;

                    if (totalPages <= 1) return null;

                    return (
                      <div className="flex justify-center items-center mt-4 space-x-2">
                        <Button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                        >
                          ← Trước
                        </Button>

                        <div className="flex items-center space-x-1">
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                          ).map((pageNum) => {
                            const showPage =
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              (pageNum >= currentPage - 1 &&
                                pageNum <= currentPage + 1);

                            if (!showPage) {
                              if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                              ) {
                                return (
                                  <span
                                    key={pageNum}
                                    className="px-2 text-muted-foreground"
                                  >
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }

                            return (
                              <Button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                variant={
                                  currentPage === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1),
                            )
                          }
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                        >
                          Sau →
                        </Button>
                      </div>
                    );
                  })()}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <Button
                    onClick={() => {
                      setParsedData(null);
                      setSelectedImages([]);
                      setImagePreviews([]);
                    }}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Phân tích ảnh khác
                  </Button>

                  <div className="flex space-x-3">
                    <Button onClick={handleExportToExcel} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Tải Excel
                    </Button>

                    <Button
                      onClick={handleConfirmImport}
                      disabled={
                        uploading ||
                        !parsedData.parsed_rows ||
                        parsedData.parsed_rows.length === 0
                      }
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>Đang import...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span>Xác nhận import</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmState} onCancel={closeConfirm} />
    </>
  );
};

export default OCRScoreSheet;
