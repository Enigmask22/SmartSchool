import { useState, useCallback, Dispatch, SetStateAction } from "react";
import ApiService from "@/utils/api";
import logger from "@/utils/logger";
import { toast } from "sonner";

interface SubjectHookProps {
  setStudents: Dispatch<SetStateAction<any[]>>;
}

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useStudentSubjects = ({
  setStudents,
}: SubjectHookProps) => {
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedStudentForSubject, setSelectedStudentForSubject] =
    useState<any>(null);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, any[]>>({
    core_subjects: [],
    elective_subjects: [],
  });
  const [subjectLoading, setSubjectLoading] = useState(false);

  const fetchAvailableSubjects = useCallback(async () => {
    try {
      logger.debug("🔍 Fetching subjects from API...");
      const response = await ApiService.getSubjectsForSelection();
      logger.debug("📦 API Response:", response);

      if (response.success && response.data) {
        logger.debug("✅ Setting subjects from API:", response.data);
        setAvailableSubjects(response.data);
      } else {
        logger.warn("⚠️ API response invalid, using fallback");
        throw new Error("Invalid API response");
      }
    } catch (error) {
      logger.error("❌ Error fetching subjects:", error);
      logger.debug("📋 Using fallback subject data");
      setAvailableSubjects([
        { subject_code: "TOAN", subject_name: "Toán" },
        { subject_code: "VAN", subject_name: "Ngữ Văn" },
        { subject_code: "ANH", subject_name: "Tiếng Anh" },
        { subject_code: "LY", subject_name: "Vật Lý" },
        { subject_code: "HOA", subject_name: "Hóa Học" },
        { subject_code: "SINH", subject_name: "Sinh Học" },
        { subject_code: "SU", subject_name: "Lịch Sử" },
        { subject_code: "DIA", subject_name: "Địa Lý" },
        { subject_code: "GDCD", subject_name: "Giáo Dục Công Dân" },
        { subject_code: "CNTT", subject_name: "Tin Học" },
        { subject_code: "CONG_NGHE", subject_name: "Công Nghệ" },
      ]);
    }
  }, []);

  const handleSubjectSelection = useCallback(
    (student: any) => {
      setSelectedStudentForSubject(student);

      logger.debug("=== DEBUG SUBJECT SELECTION ===");
      logger.debug("Student data:", student);
      logger.debug("Subject selected:", student.subject_selected);
      logger.debug("Subject selected type:", typeof student.subject_selected);

      if (student.subject_selected) {
        let subjectData = student.subject_selected;
        if (typeof subjectData === "string") {
          try {
            subjectData = JSON.parse(subjectData);
          } catch (e) {
            logger.error("Error parsing subject_selected:", e);
            subjectData = null;
          }
        }

        if (subjectData && typeof subjectData === "object") {
          logger.debug("Setting selected subjects:", subjectData);
          setSelectedSubjects(subjectData);
        } else {
          const mandatorySubjects = availableSubjects
            .filter((s) => s.is_mandatory)
            .map((s) => s.subject_code);
          setSelectedSubjects({
            core_subjects: mandatorySubjects,
            elective_subjects: [],
          });
        }
      } else {
        const mandatorySubjects = availableSubjects
          .filter((s) => s.is_mandatory)
          .map((s) => s.subject_code);
        setSelectedSubjects({
          core_subjects: mandatorySubjects,
          elective_subjects: [],
        });
      }

      setShowSubjectModal(true);
      fetchAvailableSubjects();
    },
    [availableSubjects, fetchAvailableSubjects],
  );

  const toggleSubjectSelection = useCallback(
    (subjectCode: string, type: string) => {
      setSelectedSubjects((prev) => {
        const currentSubjects = prev[type] || [];
        const isSelected = currentSubjects.includes(subjectCode);

        if (isSelected) {
          return {
            ...prev,
            [type]: currentSubjects.filter((code) => code !== subjectCode),
          };
        } else {
          const mandatoryCount = availableSubjects.filter(
            (s) => s.is_mandatory,
          ).length;
          const maxSubjects = type === "core_subjects" ? mandatoryCount : 4;
          if (currentSubjects.length >= maxSubjects) {
            toast.error(
              `Tối đa ${maxSubjects} môn ${
                type === "core_subjects" ? "chính" : "tự chọn"
              }`,
            );
            return prev;
          }
          return {
            ...prev,
            [type]: [...currentSubjects, subjectCode],
          };
        }
      });
    },
    [availableSubjects],
  );

  const saveSubjectSelection = useCallback(async () => {
    if (!selectedStudentForSubject) return;

    setSubjectLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/students/${selectedStudentForSubject.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject_selected: selectedSubjects,
          }),
        },
      );

      if (response.ok) {
        toast.success("Lưu môn học thành công!");
        setShowSubjectModal(false);

        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === selectedStudentForSubject.id
              ? { ...student, subject_selected: selectedSubjects }
              : student,
          ),
        );
      } else {
        const errorData = await response.json();
        toast.error(`Lỗi khi lưu môn học: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      logger.error("Error saving subject selection:", error);
      toast.error("Có lỗi xảy ra khi lưu môn học");
    } finally {
      setSubjectLoading(false);
    }
  }, [selectedStudentForSubject, selectedSubjects, setStudents]);

  const closeSubjectModal = useCallback(() => {
    setShowSubjectModal(false);
    setSelectedStudentForSubject(null);
    const mandatorySubjects = availableSubjects
      .filter((s) => s.is_mandatory)
      .map((s) => s.subject_code);
    setSelectedSubjects({
      core_subjects: mandatorySubjects,
      elective_subjects: [],
    });
  }, [availableSubjects]);

  return {
    showSubjectModal,
    setShowSubjectModal,
    selectedStudentForSubject,
    setSelectedStudentForSubject,
    availableSubjects,
    selectedSubjects,
    subjectLoading,
    fetchAvailableSubjects,
    handleSubjectSelection,
    toggleSubjectSelection,
    saveSubjectSelection,
    closeSubjectModal,
  };
};
