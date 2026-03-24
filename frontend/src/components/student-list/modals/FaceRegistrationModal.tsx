import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FaceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: { full_name?: string; id?: number };
  showFaceModal: boolean;
  setShowFaceModal: (show: boolean) => void;
  registrationMode: "camera" | "upload" | "multiple";
  setRegistrationMode: (mode: "camera" | "upload" | "multiple") => void;
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  uploadedImage: { previewUrl: string; name?: string } | null;
  setUploadedImage: (image: { previewUrl: string; name?: string } | null) => void;
  cameraReady: boolean;
  cameraError: string | null;
  faceRegistrationLoading: boolean;
  multipleFiles: Array<{ id: number; previewUrl: string; name: string; status: string }>;
  multipleResults: Array<{ success: boolean; message: string; detection_score?: number }>;
  setMultipleFiles: (files: any[]) => void;
  setMultipleResults: (results: any[]) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  multipleFileInputRef: React.RefObject<HTMLInputElement>;
  capturePhoto: () => void;
  resetCamera: () => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  submitFaceRegistration: () => void;
  handleMultipleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeMultipleFile: (fileId: number) => void;
  submitMultipleFaceRegistration: () => void;
}

export function FaceRegistrationModal({
  open,
  onOpenChange,
  selectedStudent,
  registrationMode,
  setRegistrationMode,
  capturedImage,
  setCapturedImage,
  uploadedImage,
  setUploadedImage,
  cameraReady,
  cameraError,
  faceRegistrationLoading,
  multipleFiles,
  multipleResults,
  setMultipleFiles,
  setMultipleResults,
  videoRef,
  canvasRef,
  fileInputRef,
  multipleFileInputRef,
  capturePhoto,
  resetCamera,
  handleImageUpload,
  submitFaceRegistration,
  handleMultipleFileSelect,
  removeMultipleFile,
  submitMultipleFaceRegistration,
}: FaceRegistrationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Đăng ký khuôn mặt - {selectedStudent?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2 p-1 rounded-lg bg-muted">
            <Button
              variant={registrationMode === "camera" ? "default" : "ghost"}
              onClick={() => setRegistrationMode("camera")}
              className="flex-1"
            >
              📷 Camera
            </Button>
            <Button
              variant={registrationMode === "upload" ? "default" : "ghost"}
              onClick={() => setRegistrationMode("upload")}
              className="flex-1"
            >
              📁 Upload
            </Button>
            <Button
              variant={registrationMode === "multiple" ? "default" : "ghost"}
              onClick={() => setRegistrationMode("multiple")}
              className="flex-1"
            >
              Upload nhiều ảnh
            </Button>
          </div>

          {/* Camera Mode */}
          {registrationMode === "camera" && (
            <>
              {!capturedImage ? (
                <div className="text-center">
                  {cameraError ? (
                    <div className="p-6 border border-red-200 rounded-lg bg-red-50">
                      <div className="mb-2 text-lg text-red-600">❌</div>
                      <p className="font-medium text-red-700">
                        {cameraError}
                      </p>
                      <div className="mt-3 space-x-2">
                        <button
                          onClick={resetCamera}
                          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          🔄 Thử lại Camera
                        </button>
                        <button
                          onClick={() => setRegistrationMode("upload")}
                          className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                        >
                          📁 Chuyển sang Upload
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full max-w-md mx-auto border rounded-lg"
                        />
                        {!cameraReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                            <div className="text-center">
                              <div className="w-8 h-8 mx-auto mb-2 border-b-2 border-blue-600 rounded-full animate-spin"></div>
                              <p className="text-gray-600">
                                Đang khởi động camera...
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={capturePhoto}
                          disabled={!cameraReady}
                          className={`px-6 py-2 rounded-md transition-colors ${
                            cameraReady
                              ? "text-white bg-blue-600 hover:bg-blue-700"
                              : "text-gray-500 bg-gray-300 cursor-not-allowed"
                          }`}
                        >
                          📸 Chụp ảnh
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {cameraReady
                          ? 'Hãy nhìn thẳng vào camera và bấm "Chụp ảnh"'
                          : "Đang chuẩn bị camera, vui lòng đợi..."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full max-w-md mx-auto border rounded-lg"
                  />
                  <div className="mt-4 space-x-2">
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                    >
                      🔄 Chụp lại
                    </button>
                    <button
                      onClick={submitFaceRegistration}
                      disabled={faceRegistrationLoading}
                      className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {faceRegistrationLoading
                        ? "⏳ Đang xử lý..."
                        : "✅ Đăng ký"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Upload Mode */}
          {registrationMode === "upload" && (
            <>
              {!uploadedImage ? (
                <div className="text-center">
                  <div className="p-8 border-2 border-gray-300 border-dashed rounded-lg">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                    >
                      📁 Chọn ảnh từ máy tính
                    </button>
                    <p className="mt-2 text-sm text-gray-600">
                      Chọn ảnh khuôn mặt rõ ràng, đủ sáng
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <img
                    src={uploadedImage.previewUrl}
                    alt="Uploaded face"
                    className="w-full max-w-md mx-auto border rounded-lg"
                  />
                  <div className="mt-4 space-x-2">
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(uploadedImage.previewUrl);
                        setUploadedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                    >
                      🔄 Chọn lại
                    </button>
                    <button
                      onClick={submitFaceRegistration}
                      disabled={faceRegistrationLoading}
                      className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {faceRegistrationLoading
                        ? "⏳ Đang xử lý..."
                        : "✅ Đăng ký"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Multiple Mode */}
          {registrationMode === "multiple" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50">
                <h4 className="mb-2 font-semibold text-blue-800">
                  Đăng ký nhiều ảnh (Độ chính xác cao)
                </h4>
                <p className="text-sm text-blue-700">
                  Chụp 5-10 ảnh với góc độ khác nhau để đạt độ chính xác 90%+:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-blue-600">
                  <li>• Nhìn thẳng, nghiêng trái/phải 15-30°</li>
                  <li>• Cười và không cười</li>
                  <li>• Ánh sáng tự nhiên và đèn</li>
                  <li>• Khoảng cách gần và xa</li>
                </ul>
              </div>

              {multipleFiles.length === 0 ? (
                <div className="text-center">
                  <div className="p-8 border-2 border-green-300 border-dashed rounded-lg">
                    <input
                      ref={multipleFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => multipleFileInputRef.current?.click()}
                      className="px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Chọn nhiều ảnh (tối đa 10)
                    </button>
                    <p className="mt-2 text-sm text-gray-600">
                      Chọn 5-10 ảnh khuôn mặt với góc độ khác nhau
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium">
                      Đã chọn {multipleFiles.length} ảnh:
                    </h5>
                    <button
                      onClick={() => multipleFileInputRef.current?.click()}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      + Thêm ảnh
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-60">
                    {multipleFiles.map((fileObj) => (
                      <div key={fileObj.id} className="relative">
                        <img
                          src={fileObj.previewUrl}
                          alt={fileObj.name}
                          className="object-cover w-full h-24 border rounded"
                        />
                        <button
                          onClick={() => removeMultipleFile(fileObj.id)}
                          className="absolute w-6 h-6 text-xs text-white bg-red-500 rounded-full -top-2 -right-2 hover:bg-red-600"
                        >
                          ×
                        </button>
                        {fileObj.status !== "pending" && (
                          <div
                            className={`absolute bottom-0 left-0 right-0 text-xs p-1 text-center ${
                              fileObj.status === "success"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {fileObj.status === "success" ? "✅" : "❌"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-x-2 text-center">
                    <button
                      onClick={() => {
                        multipleFiles.forEach((file) =>
                          URL.revokeObjectURL(file.previewUrl),
                        );
                        setMultipleFiles([]);
                        setMultipleResults([]);
                        if (multipleFileInputRef.current) {
                          multipleFileInputRef.current.value = "";
                        }
                      }}
                      className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                    >
                      🔄 Chọn lại
                    </button>
                    <button
                      onClick={submitMultipleFaceRegistration}
                      disabled={
                        faceRegistrationLoading || multipleFiles.length === 0
                      }
                      className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {faceRegistrationLoading
                        ? "⏳ Đang xử lý..."
                        : `✅ Đăng ký ${multipleFiles.length} ảnh`}
                    </button>
                  </div>

                  {multipleResults.length > 0 && (
                    <div className="p-3 mt-4 rounded bg-gray-50">
                      <h6 className="mb-2 font-medium">Kết quả:</h6>
                      <div className="space-y-1 text-sm">
                        {multipleResults.map((result, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 ${
                              result.success
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            <span>{result.success ? "✅" : "❌"}</span>
                            <span>{result.message}</span>
                            {result.detection_score && (
                              <span className="text-xs text-gray-500">
                                ({(result.detection_score * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </DialogContent>
    </Dialog>
  );
}
