import React, { useState, useCallback } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import api from "@/services/api";
import logger from "@/utils/logger";

const OCRGradeSheet = ({
  selectedClassSubject,
  academicYear,
  semester,
  onImportSuccess,
}) => {
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false });

  const openConfirm = useCallback((config) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Queue management states
  const [requestId, setRequestId] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null); // 'queued', 'processing', 'completed', 'failed'
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [queuePosition, setQueuePosition] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // 20 rows per page

  // Editing states - cho phép sửa điểm trực tiếp trong preview
  const [editingRowIndex, setEditingRowIndex] = useState(null); // Index của row đang edit (trong sorted list)
  const [editValues, setEditValues] = useState({}); // Giá trị đang edit

  // Hàm cập nhật điểm trong parsedData
  const handleScoreChange = (globalIndex, field, value) => {
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
      (r) => r.student_id === rowToUpdate.student_id
    );

    if (originalIndex === -1) return;

    // Normalize và update values
    const updatedRows = [...parsedData.parsed_rows];
    const row = { ...updatedRows[originalIndex] };

    // Update each field if it was edited
    ["diem_thuong_xuyen", "diem_thi_giua_ki", "diem_thi_cuoi_ki"].forEach(
      (field) => {
        if (editValues[field] !== undefined) {
          const value = editValues[field].trim();
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
      }
    );

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
    setEditingRowIndex(globalIndex);
    setEditValues({
      diem_thuong_xuyen:
        row.diem_thuong_xuyen !== null && row.diem_thuong_xuyen !== undefined
          ? String(row.diem_thuong_xuyen)
          : "",
      diem_thi_giua_ki:
        row.diem_thi_giua_ki !== null && row.diem_thi_giua_ki !== undefined
          ? String(row.diem_thi_giua_ki)
          : "",
      diem_thi_cuoi_ki:
        row.diem_thi_cuoi_ki !== null && row.diem_thi_cuoi_ki !== undefined
          ? String(row.diem_thi_cuoi_ki)
          : "",
    });
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
      (r) => r.student_id !== rowToDelete.student_id
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

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.warning("Vui lòng chọn file ảnh (jpg, png, etc.)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.warning("File ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.");
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    event.target.value = ""; // Reset input
  };

  // Poll status của OCR request
  const pollOCRStatus = async (reqId) => {
    try {
      const response = await api.getOCRStatus(reqId);

      if (response.success) {
        const status = response.data.status;
        setOcrStatus(status);
        setProgress(response.data.progress || 0);
        setStatusMessage(response.data.message || "");

        if (status === "queued") {
          setQueuePosition(response.data.position_in_queue);
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 3000); // Poll every 3 seconds
        } else if (status === "processing") {
          setQueuePosition(null);
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 2000); // Poll every 2 seconds when processing
        } else if (status === "completed") {
          // Parse completed!
          const result = response.data.result;
          setParsedData(result);
          setParsing(false);
          setUploading(false);
          setOcrStatus(null); // Clear status để ẩn UI loading
          setProgress(0);
          setStatusMessage("");

          if (result.total_valid === 0) {
            toast.warning("Không tìm thấy dữ liệu hợp lệ trong ảnh!", {
              description: "Kiểm tra: ảnh đủ sáng, rõ nét và đúng format (id, họ và tên, điểm).",
            });
          } else if (result.total_errors > 0) {
            toast.warning(`Phân tích thành công nhưng có ${result.total_errors} lỗi!`, {
              description: `Hợp lệ: ${result.total_valid} học sinh • Lỗi: ${result.total_errors} dòng`,
            });
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
          toast.error("Lỗi khi xử lý ảnh: " + (response.data.error || "Unknown error"));
        }
      } else {
        throw new Error(response.message || "Failed to get status");
      }
    } catch (error) {
      logger.error("Error polling OCR status:", error);
      setParsing(false);
      setUploading(false);
      toast.error("Lỗi khi kiểm tra trạng thái OCR!");
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedImage) {
      toast.warning("Vui lòng chọn ảnh bảng điểm!");
      return;
    }

    try {
      setUploading(true);
      setParsing(true);
      setOcrStatus("uploading");
      setProgress(0);
      setStatusMessage("Đang upload ảnh...");

      const formData = new FormData();
      formData.append("file", selectedImage);

      const response = await api.parseScoreSheetOCR(formData);

      if (response.success) {
        // Get request_id and start polling
        const reqId = response.data.request_id;
        setRequestId(reqId);
        setOcrStatus(response.data.status); // Should be 'queued'
        setQueuePosition(response.data.position_in_queue);
        setStatusMessage("Đã thêm vào hàng chờ...");

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
      if (error.response && error.response.status === 503) {
        toast.warning("Hệ thống đang quá tải!", {
          description: "Hàng chờ đã đầy. Vui lòng thử lại sau vài phút.",
        });
      } else {
        toast.error("Lỗi khi xử lý ảnh! Vui lòng thử lại.");
      }

      setUploading(false);
      setParsing(false);
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

      // Convert parsed data to import format
      const grades = parsedData.parsed_rows.map((row) => ({
        student_id: row.student_id,
        diem_thuong_xuyen: row.diem_thuong_xuyen,
        diem_thi_giua_ki: row.diem_thi_giua_ki,
        diem_thi_cuoi_ki: row.diem_thi_cuoi_ki,
      }));

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
      await api.exportParsedOCRToExcel({ parsed_rows: parsedData.parsed_rows });
      toast.success("Tải file Excel thành công!");
    } catch (error) {
      logger.error("Error exporting OCR data:", error);
      toast.error("Lỗi khi export file!");
    }
  };

  const handleCloseModal = () => {
    setShowOCRModal(false);
    setParsedData(null);
    setSelectedImage(null);
    setImagePreview(null);

    // Reset queue states
    setRequestId(null);
    setOcrStatus(null);
    setProgress(0);
    setStatusMessage("");
    setQueuePosition(null);
  };

  return (
    <>
      {/* OCR Button */}
      <Button
        onClick={() => setShowOCRModal(true)}
        className="flex items-center space-x-2"
        title="Upload ảnh bảng điểm viết tay để tự động nhận dạng"
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
                          id, ho_va_ten, diem_thuong_xuyen, diem_thi_giua_ki,
                          diem_thi_cuoi_ki
                        </strong>
                      </li>
                      <li>• Viết tay hoặc in đều được hỗ trợ</li>
                      <li>• Định dạng ảnh: JPG, PNG (tối đa 10MB)</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Image Preview */}
                {imagePreview && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ảnh đã chọn</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto max-w-full max-h-96 rounded-lg shadow-md"
                      />
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        {selectedImage.name} (
                        {(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Upload Button */}
                <div className="flex flex-col items-center space-y-4">
                  <Button asChild className="w-full max-w-md">
                    <label className="cursor-pointer">
                      <Upload className="w-5 h-5 mr-2" />
                      <span>
                        {selectedImage ? "Chọn ảnh khác" : "Chọn ảnh bảng điểm"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </Button>

                  {selectedImage && !parsing && (
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
                          <span>Phân tích bảng điểm</span>
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
                              Vui lòng đợi 2-3 phút để hệ thống xử lý ảnh...
                            </span>
                          </p>
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
                {(() => {
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
                              <span className="font-semibold">{totalRows}</span>{" "}
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
                              Mã HS
                            </TableHead>
                            <TableHead className="text-xs font-medium text-left">
                              Họ và tên
                            </TableHead>
                            <TableHead className="text-xs font-medium text-left">
                              Lớp
                            </TableHead>
                            <TableHead className="text-xs font-medium text-center">
                              ĐTX
                            </TableHead>
                            <TableHead className="text-xs font-medium text-center">
                              ĐGK
                            </TableHead>
                            <TableHead className="text-xs font-medium text-center">
                              ĐCK
                            </TableHead>
                            <TableHead className="text-xs font-medium text-center w-24">
                              Thao tác
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // const totalRows = parsedData.parsed_rows.length;
                            const startIndex = (currentPage - 1) * pageSize;
                            const endIndex = startIndex + pageSize;
                            // Sắp xếp theo student_id tăng dần trước khi phân trang
                            const sortedRows = [...parsedData.parsed_rows].sort(
                              (a, b) => {
                                const aId = parseInt(a.student_id) || 0;
                                const bId = parseInt(b.student_id) || 0;
                                return aId - bId;
                              }
                            );
                            const paginatedRows = sortedRows.slice(
                              startIndex,
                              endIndex
                            );

                            return paginatedRows.map((row, idx) => {
                              const globalIndex = startIndex + idx; // Index trong sorted list
                              const isEditing = editingRowIndex === globalIndex;

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

                                  {/* ĐTX */}
                                  <TableCell
                                    className="text-sm text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isEditing ? (
                                      <Input
                                        type="text"
                                        value={
                                          editValues.diem_thuong_xuyen ?? ""
                                        }
                                        onChange={(e) =>
                                          handleScoreChange(
                                            globalIndex,
                                            "diem_thuong_xuyen",
                                            e.target.value
                                          )
                                        }
                                        placeholder="0-10, Đ, KĐ"
                                        className="w-16 h-7 text-xs text-center mx-auto"
                                      />
                                    ) : row.diem_thuong_xuyen !== null &&
                                      row.diem_thuong_xuyen !== undefined ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-700"
                                      >
                                        {row.diem_thuong_xuyen}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* ĐGK */}
                                  <TableCell
                                    className="text-sm text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isEditing ? (
                                      <Input
                                        type="text"
                                        value={
                                          editValues.diem_thi_giua_ki ?? ""
                                        }
                                        onChange={(e) =>
                                          handleScoreChange(
                                            globalIndex,
                                            "diem_thi_giua_ki",
                                            e.target.value
                                          )
                                        }
                                        placeholder="0-10, Đ, KĐ"
                                        className="w-16 h-7 text-xs text-center mx-auto"
                                      />
                                    ) : row.diem_thi_giua_ki !== null &&
                                      row.diem_thi_giua_ki !== undefined ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-700"
                                      >
                                        {row.diem_thi_giua_ki}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </TableCell>

                                  {/* ĐCK */}
                                  <TableCell
                                    className="text-sm text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isEditing ? (
                                      <Input
                                        type="text"
                                        value={
                                          editValues.diem_thi_cuoi_ki ?? ""
                                        }
                                        onChange={(e) =>
                                          handleScoreChange(
                                            globalIndex,
                                            "diem_thi_cuoi_ki",
                                            e.target.value
                                          )
                                        }
                                        placeholder="0-10, Đ, KĐ"
                                        className="w-16 h-7 text-xs text-center mx-auto"
                                      />
                                    ) : row.diem_thi_cuoi_ki !== null &&
                                      row.diem_thi_cuoi_ki !== undefined ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-700"
                                      >
                                        {row.diem_thi_cuoi_ki}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </TableCell>

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
                {(() => {
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
                          (_, i) => i + 1
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
                                currentPage === pageNum ? "default" : "outline"
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
                            Math.min(totalPages, prev + 1)
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
                      setSelectedImage(null);
                      setImagePreview(null);
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

export default OCRGradeSheet;
