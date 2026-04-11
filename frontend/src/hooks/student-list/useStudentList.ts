import { useState, useEffect, useRef, useContext, useCallback } from "react";
import ApiService from "@/utils/api";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/useSystemSettings";
import logger from "@/utils/logger";
import { toast } from "sonner";
import { generateStudentReportCard } from "@/utils/studentReportExport";
import { useStudentScores } from "./useStudentScores";
import { useStudentFeedback } from "./useStudentFeedback";

interface UseStudentListFilters {
  searchTerm: string;
  selectedClass: string;
  selectedAcademicYear: string;
  selectedSemester: string;
  showInactive: boolean;
  homeroomClasses: any[];
}

export const useStudentList = (filters: UseStudentListFilters) => {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { settings } = useSystemSettings();
  const academicYear = settings.academic_year || "2024-2025";
  const semester = settings.semester || "HK1";

  // Basic student data states
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<Record<string, any>>({ open: false });

  // Email report card states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSending, _setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Refs (other refs)
  const multipleFileInputRef = useRef<HTMLInputElement>(null);

  // Helper function for confirm dialog
  const openConfirm = useCallback((config) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);

  // When selected class changes, fetch students
  useEffect(() => {
    fetchStudents();
  }, [filters.selectedClass]);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (isHomeroomTeacher) {
        if (!filters.selectedClass || filters.selectedClass === "all") {
          logger.debug(
            "🚫 No class selected for homeroom teacher, skipping fetch",
          );
          setStudents([]);
          setLoading(false);
          return;
        }
        const found = filters.homeroomClasses.find(
          (c) => c.class_name === filters.selectedClass,
        );
        const classId = found?.id;
        response = await ApiService.request(
          classId
            ? `/homeroom/students?class_id=${classId}`
            : `/homeroom/students?class_name=${encodeURIComponent(
                filters.selectedClass,
              )}&academic_year=${encodeURIComponent(filters.selectedAcademicYear)}`,
        );
      } else {
        response = await ApiService.getStudents({});
      }

      logger.debug("Students API response:", response);

      if (response.success && response.data) {
        setStudents(Array.isArray(response.data) ? response.data : []);
      } else {
        logger.warn("Invalid response structure:", response);
        setStudents([]);
      }
    } catch (error) {
      logger.error("Error fetching students:", error);
      setError(
        "Không thể tải danh sách học sinh từ server. Hiển thị dữ liệu mẫu.",
      );

      // Mock data fallback
      setStudents([
        {
          id: 1,
          student_id: "250001",
          full_name: "Nguyễn Văn An",
          class_name: "10A1",
          grade: "10",
          email: "an.nguyen@student.edu.vn",
          phone: "0123456789",
          gender: "Nam",
        },
        {
          id: 2,
          student_id: "250002",
          full_name: "Trần Thị Bình",
          class_name: "10A1",
          grade: "10",
          email: "binh.tran@student.edu.vn",
          phone: "0123456790",
          gender: "Nữ",
        },
        {
          id: 3,
          student_id: "250003",
          full_name: "Lê Minh Châu",
          class_name: "10A2",
          grade: "10",
          email: "chau.le@student.edu.vn",
          phone: "0123456791",
          gender: "Nữ",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort students
  const filteredStudents = Array.isArray(students)
    ? students
        .filter((student) => {
          const matchesSearch =
            student.full_name
              ?.toLowerCase()
              .includes(filters.searchTerm.toLowerCase()) ||
            student.student_id
              ?.toLowerCase()
              .includes(filters.searchTerm.toLowerCase());
          const matchesClass =
            filters.selectedClass === "all" ||
            filters.selectedClass === "" ||
            student.class_name === filters.selectedClass;

          let matchesActiveStatus = true;
          if (filters.showInactive) {
            matchesActiveStatus = student.is_active === false;
          } else {
            matchesActiveStatus = student.is_active !== false;
          }

          return matchesSearch && matchesClass && matchesActiveStatus;
        })
        .sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        })
    : [];

  // Note: pagination is calculated by StudentList using calculatePagination from useStudentFilters
  // We just provide the filtered students and let the caller handle pagination

  // Use extracted scores hook - needed internally for exportStudentReportCard
  const scores = useStudentScores(academicYear, semester, filters.selectedAcademicYear, filters.selectedSemester);

  // Use extracted feedback hook (now that scores is defined) - needed internally for exportStudentReportCard
  const feedback = useStudentFeedback({
    filters,
    scoresData: scores,
  });

  const exportStudentReportCard = async () => {
    if (!feedback.selectedStudentForFeedback) {
      toast.error("Không có thông tin học sinh!");
      return;
    }

    try {
      const student = feedback.selectedStudentForFeedback;

      // Fetch scores if not already loaded
      let feedbackScores = scores.studentScores;
      if (!feedbackScores || feedbackScores.length === 0) {
        const response = await ApiService.getStudentScores(
          student.id,
          filters.selectedAcademicYear,
          filters.selectedSemester,
        );
        if (response.success && response.data?.scores) {
          feedbackScores = response.data.scores;
        } else {
          toast.warning(
            "Không tìm thấy điểm của học sinh. Phiếu điểm sẽ chỉ hiển thị thông tin và nhận xét.",
          );
          feedbackScores = [];
        }
      }

      // Generate and download report card
      await generateStudentReportCard({
        student,
        feedbackScores,
        generatedFeedback: feedback.generatedFeedback,
        academicYear,
        semester,
      });
    } catch (error) {
      logger.error("Error exporting report card:", error);
      toast.error(
        "Lỗi khi xuất phiếu điểm: " + (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };
  const openEmailDialog = () => {
    if (!feedback.selectedStudentForFeedback) return;
    setEmailRecipient(
      feedback.selectedStudentForFeedback.received_email ||
        feedback.selectedStudentForFeedback.email ||
        "",
    );
    setEmailError("");
    setEmailSuccess(false);
    setShowEmailDialog(true);
  };
  const closeEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailError("");
    setEmailSuccess(false);
  };
  const handleSendEmailReportCard = async () => {};

  // Return only core student list functionality
  return {
    // Student data
    students,
    loading,
    error,
    filteredStudents,
    
    // Confirm dialog
    confirmState,
    openConfirm,
    closeConfirm,

    // Email dialog
    showEmailDialog,
    setShowEmailDialog,
    emailRecipient,
    setEmailRecipient,
    emailSending,
    emailError,
    emailSuccess,

    // Refs
    multipleFileInputRef,

    // Functions
    fetchStudents,
    exportStudentReportCard,
    openEmailDialog,
    closeEmailDialog,
    handleSendEmailReportCard,
  };
};
