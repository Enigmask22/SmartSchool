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
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailStudent, setEmailStudent] = useState<any>(null);

  // Refs (other refs)
  const multipleFileInputRef = useRef<HTMLInputElement>(null);

  // Helper function for confirm dialog
  const openConfirm = useCallback((config) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);

  // Refetch when academic year changes (homeroom) or class filter changes (other roles)
  useEffect(() => {
    fetchStudents();
  }, [filters.selectedClass, filters.selectedAcademicYear, filters.homeroomClasses]);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (isHomeroomTeacher) {
        // A homeroom teacher holds at most one class per academic year.
        // Find that class by academic year alone — class name is irrelevant here.
        const found = filters.homeroomClasses.find(
          (c) => c.academic_year === filters.selectedAcademicYear,
        );
        const classId = found?.id;

        if (!classId) {
          logger.warn(
            `❌ No homeroom class found for academic year ${filters.selectedAcademicYear}`,
          );
          setStudents([]);
          setLoading(false);
          return;
        }

        logger.info('🔎 Fetching students for class:', {
          selectedAcademicYear: filters.selectedAcademicYear,
          foundClass: found,
          classId: classId,
        });

        // Backend /homeroom/students queries homeroom_students_history by class_id
        response = await ApiService.request(
          `/homeroom/students?class_id=${classId}`,
        );
      } else {
        response = await ApiService.getStudents({});
      }

      //logger.debug("Students API response:", response);

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

          // For homeroom teachers: backend already filtered by class_id
          // For other roles: apply class filter if needed
          let matchesClass = true;
          if (!isHomeroomTeacher) {
            matchesClass =
              filters.selectedClass === "all" ||
              filters.selectedClass === "" ||
              student.class_name === filters.selectedClass;
          }

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
  const scores = useStudentScores(filters.selectedAcademicYear, filters.selectedSemester);

  // Use extracted feedback hook (now that scores is defined) - needed internally for exportStudentReportCard
  const feedback = useStudentFeedback({
    filters,
    scoresData: scores,
  });

  const exportStudentReportCard = async (
    student?: any,
    options?: { generatedFeedback?: string; selectedType?: string; summaryData?: any },
  ) => {
    const selectedStudent = student || feedback.selectedStudentForFeedback;
    if (!selectedStudent) {
      toast.error("Không có thông tin học sinh!");
      return;
    }

    try {
      const studentData = selectedStudent;
      // Dùng selectedType từ options (từ instance cha) thay vì từ hook local
      const effectiveType = options?.selectedType || feedback.selectedType;
      const isCnType = effectiveType === "CN";

      // Fetch scores (cho GK/CK)
      let feedbackScores: any[] = [];
      if (!isCnType) {
        const response = await ApiService.getStudentScores(
          studentData.id,
          filters.selectedAcademicYear,
          filters.selectedSemester,
        );
        if (response.success && response.data?.scores) {
          feedbackScores = response.data.scores;
        }
      }

      // Fetch summary data (cho CN)
      let summaryData: any = options?.summaryData || undefined;
      if (isCnType && !summaryData) {
        try {
          const summaryResp = await ApiService.getStudentAcademicSummary(
            studentData.id,
            filters.selectedAcademicYear,
          );
          if (summaryResp.success && summaryResp.data) {
            summaryData = summaryResp.data;
          } else {
            toast.warning("Không có dữ liệu tổng kết cả năm. Vui lòng kiểm tra lại.");
            return;
          }
        } catch (err) {
          logger.error("Error fetching summary for export:", err);
          toast.error("Lỗi khi lấy dữ liệu tổng kết cả năm.");
          return;
        }
      }

      await generateStudentReportCard({
        student: studentData,
        feedbackScores,
        generatedFeedback: options?.generatedFeedback || feedback.generatedFeedback,
        academicYear: filters.selectedAcademicYear || academicYear,
        semester: filters.selectedSemester || semester,
        ketQuaRenLuyen: isCnType ? undefined : feedback.ketQuaRenLuyen,
        hocLuc: isCnType ? undefined : (effectiveType === "CK" ? feedback.hocLuc : undefined),
        summaryData,
        feedbackType: effectiveType,
      });
    } catch (error) {
      logger.error("Error exporting report card:", error);
      toast.error("Lỗi khi xuất phiếu điểm: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };
  const openEmailDialog = (student?: any) => {
    // Use passed student param if available, otherwise fall back to state
    const selectedStudent = student || feedback.selectedStudentForFeedback;
    if (!selectedStudent) return;
    setEmailStudent(selectedStudent);
    setEmailRecipient(
      selectedStudent.received_email ||
        selectedStudent.email ||
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
    setEmailStudent(null);
  };

  interface SendEmailReportCardOptions {
    generatedFeedback?: string;
    overallAverage?: string | number;
    selectedType?: string;
    summaryData?: any;
  }

  const handleSendEmailReportCard = async (
    options?: SendEmailReportCardOptions,
  ) => {
    const selectedStudent = emailStudent;
    if (!selectedStudent) {
      setEmailError("Không có thông tin học sinh");
      return;
    }

    const recipient = emailRecipient.trim();
    if (!recipient) {
      setEmailError("Vui lòng nhập email phụ huynh");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(recipient)) {
      setEmailError("Email không hợp lệ");
      return;
    }

    setEmailSending(true);
    setEmailError("");

    try {
      const effectiveType = options?.selectedType || feedback.selectedType;
      const isCnType = effectiveType === "CN";
      let feedbackScores: any[] = [];
      let summaryData: any = options?.summaryData || null;
      let overallAverage: number | null = null;

      if (isCnType) {
        if (!summaryData) {
          // CN: fetch summary data trực tiếp từ API nếu chưa được truyền
          const summaryResp = await ApiService.getStudentAcademicSummary(
            selectedStudent.id,
            filters.selectedAcademicYear,
          );
          if (summaryResp.success && summaryResp.data) {
            summaryData = summaryResp.data;
          } else {
            setEmailError("Không có dữ liệu tổng kết cả năm.");
            setEmailSending(false);
            return;
          }
        }
        overallAverage = summaryData.year_avg_score ?? null;
      } else {
        // GK/CK: fetch scores
        const scoresResponse = await ApiService.getStudentScores(
          selectedStudent.id,
          filters.selectedAcademicYear,
          filters.selectedSemester,
        );
        if (scoresResponse.success && scoresResponse.data?.scores) {
          feedbackScores = scoresResponse.data.scores;
        }
        const parsedAverage = parseFloat(String(options?.overallAverage ?? ""));
        overallAverage = Number.isNaN(parsedAverage) ? null : parsedAverage;
      }

      const formattedScores = feedbackScores.map((score) => ({
        subject_name: score.subject_name,
        final_score: score.final_score,
        score_data: score.score_data,
      }));

      const teacherName =
        authContext?.user?.full_name || authContext?.user?.name || "";

      const reportData = {
        student_id: selectedStudent.id,
        student_code: selectedStudent.student_id,
        student_name: selectedStudent.full_name,
        class_name: selectedStudent.class_name || "",
        grade: selectedStudent.grade || "",
        teacher_name: teacherName,
        academic_year: filters.selectedAcademicYear || academicYear,
        semester: filters.selectedSemester || semester,
        feedback: options?.generatedFeedback || "",
        scores: formattedScores,
        overall_average: overallAverage,
        received_email: recipient,
        ket_qua_ren_luyen: isCnType ? null : (feedback.ketQuaRenLuyen || null),
        hoc_luc: isCnType ? null : (effectiveType === "CK" ? (feedback.hocLuc || null) : null),
        feedback_type: effectiveType || "CK",
        summary_data: summaryData,
      };

      const response = await ApiService.sendEmailReportCard(reportData);

      if (response.success) {
        setEmailSuccess(true);
        setEmailError("");
        toast.success(`Đã gửi phiếu điểm thành công đến ${recipient}!`);
      } else {
        setEmailError(response.message || "Không thể gửi email phiếu điểm");
      }
    } catch (error: any) {
      logger.error("Error sending email report card:", error);
      const errorMessage =
        error?.data?.detail ||
        error?.message ||
        "Lỗi kết nối server khi gửi email";
      setEmailError(
        typeof errorMessage === "string"
          ? errorMessage
          : "Lỗi kết nối server khi gửi email",
      );
    } finally {
      setEmailSending(false);
    }
  };

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
