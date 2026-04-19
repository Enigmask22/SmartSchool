import { useState, useCallback } from "react";
import { toast } from "sonner";
import logger from "@/utils/logger";

const API_BASE_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useMultipleFaceRegistration = (
  fetchStudents: () => void,
  selectedStudentForFace: any,
) => {
  // Multiple face registration states
  const [multipleFiles, setMultipleFiles] = useState<Array<{ file: File; id: number; name: string; previewUrl: string; status: string }>>([]);
  const [multipleResults, setMultipleResults] = useState<any[]>([]);
  const [showMultipleModal, setShowMultipleModal] = useState(false);
  const [selectedStudentForMultiple, setSelectedStudentForMultiple] = useState<any>(null);

  const handleMultipleFileSelect = useCallback((event: any) => {
    const files = Array.from(event.target.files);
    if (files.length > 10) {
      toast.error("Tối đa 10 ảnh mỗi lần");
      return;
    }

    const fileObjects = files.map((file, index) => ({
      file: file as File,
      id: index,
      name: (file as File).name,
      previewUrl: URL.createObjectURL(file as File),
      status: "pending",
    }));

    setMultipleFiles(fileObjects);
  }, []);

  const removeMultipleFile = useCallback((fileId: number) => {
    setMultipleFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const removedFile = prev.find((f) => f.id === fileId);
      if (removedFile) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return updated;
    });
  }, []);

  const submitMultipleFaceRegistration = async () => {
    if (multipleFiles.length === 0 || !selectedStudentForFace) return;

    try {
      const formData = new FormData();
      multipleFiles.forEach((fileObj) => {
        formData.append("files", fileObj.file);
      });

      const response = await fetch(
        `${API_BASE_URL}/ai/register-multiple/${selectedStudentForFace.id}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (result.success) {
        setMultipleResults(result.data.results || []);
        toast.success(
          `Đăng ký thành công ${result.data.successful_registrations}/${result.data.total_images} ảnh cho ${selectedStudentForFace.full_name}!`,
        );

        setMultipleFiles((prev) =>
          prev.map((file, index) => ({
            ...file,
            status: result.data.results[index]?.success ? "success" : "error",
            message: result.data.results[index]?.message || "",
          })),
        );

        fetchStudents();
      } else {
        toast.error(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error("Error registering multiple faces:", error);
      toast.error("Có lỗi xảy ra khi đăng ký nhiều khuôn mặt");
    }
  };

  return {
    // States
    multipleFiles,
    setMultipleFiles,
    multipleResults,
    setMultipleResults,
    showMultipleModal,
    setShowMultipleModal,
    selectedStudentForMultiple,
    setSelectedStudentForMultiple,

    // Functions
    handleMultipleFileSelect,
    removeMultipleFile,
    submitMultipleFaceRegistration,
  };
};
