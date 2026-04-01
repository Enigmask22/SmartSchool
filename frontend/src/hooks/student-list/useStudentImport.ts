import { useState, useCallback } from "react";
import logger from "@/utils/logger";
import { toast } from "sonner";

interface ImportHookProps {
  filters: any;
  fetchStudents: () => Promise<void>;
}

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useStudentImport = ({ filters, fetchStudents }: ImportHookProps) => {
  const [showSubjectImportModal, setShowSubjectImportModal] = useState(false);
  const [subjectImportFile, setSubjectImportFile] = useState<File | null>(null);
  const [subjectImportLoading, setSubjectImportLoading] = useState(false);

  const downloadSubjectTemplate = useCallback(async () => {
    if (!filters.selectedClass || filters.selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để tải mẫu nhập môn học");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/homeroom/export-subject-template/${filters.selectedClass}?academic_year=${filters.selectedAcademicYear}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Lỗi khi tải file mẫu");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Mau_nhap_mon_hoc_${filters.selectedClass}_${filters.selectedAcademicYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Đã tải file mẫu thành công!");
    } catch (error) {
      logger.error("Error downloading subject template:", error);
      toast.error(
        "Lỗi khi tải file mẫu: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  }, [filters.selectedClass, filters.selectedAcademicYear]);

  const handleSubjectImport = useCallback(async () => {
    if (!subjectImportFile) {
      toast.error("Vui lòng chọn file để import");
      return;
    }

    if (!filters.selectedClass || filters.selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để import môn học");
      return;
    }

    setSubjectImportLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", subjectImportFile);

      const response = await fetch(
        `${API_BASE_URL}/homeroom/import-subjects/${filters.selectedClass}?academic_year=${filters.selectedAcademicYear}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Lỗi khi import file");
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `✅ ${result.message}\n\n` +
            `• Số học sinh đã cập nhật: ${result.total_updated}\n` +
            (result.total_errors > 0
              ? `• Số lỗi: ${result.total_errors}\n${
                  result.errors?.join("\n") || ""
                }`
              : ""),
        );

        setSubjectImportFile(null);
        setShowSubjectImportModal(false);
        fetchStudents();
      } else {
        throw new Error(result.message || "Import thất bại");
      }
    } catch (error) {
      logger.error("Error importing subjects:", error);
      toast.error(
        "Lỗi khi import file: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setSubjectImportLoading(false);
    }
  }, [subjectImportFile, filters.selectedClass, filters.selectedAcademicYear, fetchStudents]);

  return {
    showSubjectImportModal,
    setShowSubjectImportModal,
    subjectImportFile,
    setSubjectImportFile,
    subjectImportLoading,
    downloadSubjectTemplate,
    handleSubjectImport,
  };
};
