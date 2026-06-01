import { useState, useCallback, useEffect } from "react";
import ApiService from "@/utils/api";
import logger from "@/utils/logger";
import { toast } from "sonner";

/** Key name contains TX-related pattern (thường xuyên) */
const _isGK_TX_column = (keyLower: string) =>
  keyLower.includes("tx") ||
  keyLower.includes("thuong_xuyen") ||
  keyLower.includes("thuong_ky") ||
  keyLower.includes("giua_ki") ||
  keyLower.includes("giua_ky") ||
  keyLower.includes("gk");

/** Key name contains CK-related pattern (cuối kỳ) — should be excluded */
const _isCK_column = (keyLower: string) =>
  keyLower.includes("ck") ||
  keyLower.includes("cuoi_ki") ||
  keyLower.includes("cuoi_ky");

/** Map raw score_data key → human-readable column label */
const _columnLabel = (rawKey: string): string => {
  const k = rawKey.toLowerCase().replace(/^diem_/, "");
  const MAP: Record<string, string> = {
    tx1: "TX 1", tx2: "TX 2", tx3: "TX 3", tx4: "TX 4", tx5: "TX 5",
    thuong_xuyen: "Điểm thường xuyên",
    thi_giua_ki: "Điểm giữa kỳ", giua_ki: "Điểm giữa kỳ", gk: "Điểm giữa kỳ",
    thi_cuoi_ki: "Điểm cuối kỳ", cuoi_ki: "Điểm cuối kỳ", ck: "Điểm cuối kỳ",
    mieng: "Điểm miệng",
    "15_phut": "Điểm 15 phút", "1_tiet": "Điểm 1 tiết",
    thuc_hanh: "Điểm thực hành",
  };
  if (MAP[k]) return MAP[k];
  // Try prefix match for keys like "diem_tx1" → lookup "tx1"
  for (const [pattern, label] of Object.entries(MAP)) {
    if (k === pattern || k.endsWith("_" + pattern)) return label;
  }
  return rawKey.replace(/^Diem_/, "").replace(/_/g, " ");
};

interface FeedbackHookProps {
  filters: any;
  scoresData: any;
}

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useStudentFeedback = ({
  filters,
  scoresData,
}: FeedbackHookProps) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] =
    useState<any>(null);
  const [feedbackForm, setFeedbackForm] = useState<Record<string, any>>({
    student_name: "",
    score: "",
    top_subjects: [],
    weak_subjects: [],
    attendance_rate: "100",
    subject: "",
    notes: "",
  });
  const [generatedFeedback, setGeneratedFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("CK");
  const [gkLowScoreDetails, setGkLowScoreDetails] = useState<any[]>([]);
  const [allScoresData, setAllScoresData] = useState<any[]>([]);

  // Re-process GK low score details khi selectedType thay đổi
  useEffect(() => {
    if (selectedType === "GK" && allScoresData.length > 0) {
      const lowDetails: any[] = [];
      for (const subjectScore of allScoresData) {
        const scoreData = subjectScore.score_data;
        if (!scoreData || typeof scoreData !== "object") continue;
        const subjectName = scoreData.Mon_hoc || subjectScore.subject_name || "???";
        const lowColumns: { name: string; value: string }[] = [];
        for (const [key, val] of Object.entries(scoreData)) {
          if (key === "Mon_hoc") continue;
          const keyLower = key.toLowerCase();
          if (!_isGK_TX_column(keyLower)) continue;
          if (_isCK_column(keyLower)) continue;
          const diem = (val as any)?.Diem;
          if (diem === undefined || diem === null) continue;
          const diemNum = typeof diem === "string" ? parseFloat(diem) : diem;
          const isKD = typeof diem === "string" && diem.toUpperCase() === "KĐ";
          if (isKD || (!isNaN(diemNum) && diemNum < 8)) {
            lowColumns.push({ name: _columnLabel(key), value: String(diem) });
          }
        }
        if (lowColumns.length > 0) {
          lowDetails.push({ subject: subjectName, columns: lowColumns });
        }
      }
      setGkLowScoreDetails(lowDetails);
    } else {
      setGkLowScoreDetails([]);
    }
  }, [selectedType, allScoresData]);

  // Re-fetch comment khi người dùng đổi loại GK/CK trong modal đang mở
  useEffect(() => {
    if (!showFeedbackModal || !selectedStudentForFeedback) return;

    const fetchCommentForType = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const commentResponse = await fetch(
          `${API_BASE_URL}/feedback/comments/${selectedStudentForFeedback.id}?semester=${filters.selectedSemester}&type=${selectedType}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (commentResponse.ok) {
          const commentResult = await commentResponse.json();
          if (commentResult.success && commentResult.data) {
            setGeneratedFeedback(commentResult.data.description);
            logger.debug("✅ Loaded existing comment for type:", selectedType, commentResult.data);
          } else {
            setGeneratedFeedback("");
          }
        }
      } catch (error) {
        logger.error("Error loading comment for type:", selectedType, error);
      }
    };

    fetchCommentForType();
  }, [selectedType, showFeedbackModal, selectedStudentForFeedback, filters.selectedSemester]);

  const handleFeedbackClick = useCallback(
    async (student: any) => {
      setSelectedStudentForFeedback(student);
      setGeneratedFeedback("");
      setFeedbackError("");
      setFeedbackSuccess(false);
      scoresData.set_scoreTrendData(null);
      scoresData.set_trendError("");
      scoresData.setHasScoreData(false);

      let initialForm: Record<string, any> = {
        student_name: student.full_name,
        score: "",
        top_subjects: [] as string[],
        weak_subjects: [] as string[],
        attendance_rate: "100",
        subject: "",
        notes: "",
      };

      let scoresResponse: any = null;

      try {
        logger.debug(
          "🎯 Fetching scores for feedback form for student:",
          student,
        );
        scoresResponse = await ApiService.getStudentScores(
          student.id,
          filters.selectedAcademicYear,
          filters.selectedSemester,
        );
        logger.debug("📊 Scores response for feedback:", scoresResponse);

        if (scoresResponse.success && scoresResponse.data) {
          const responseData = scoresResponse.data;
          const studentScoresList = responseData.scores;
          logger.debug("📋 Full response data:", responseData);
          logger.debug("📋 Scores array:", studentScoresList);
          logger.debug("📏 Scores array length:", studentScoresList?.length);
          logger.debug("🔍 First score object:", studentScoresList?.[0]);

          if (Array.isArray(studentScoresList) && studentScoresList.length > 0) {
            // GK mode: chỉ cần có dữ liệu điểm (không cần final_score)
            if (selectedType === "GK") {
              scoresData.setHasScoreData(true);
            }

            const validScores = studentScoresList.filter(
              (score) =>
                score.final_score !== null && score.final_score !== undefined,
            );
            logger.debug("✅ Valid scores with final_score:", validScores);

            if (validScores.length > 0) {
              const avgScore = (
                validScores.reduce(
                  (sum, score) => sum + (score.final_score || 0),
                  0,
                ) / validScores.length
              ).toFixed(1);
              logger.debug("📊 Calculated average score for feedback:", avgScore);

              initialForm.score = avgScore;
              scoresData.setHasScoreData(true);

              const sortedScores = [...validScores]
                .map((g) => ({
                  subject: g.subject_name,
                  score:
                    typeof g.final_score === "string"
                      ? parseFloat(g.final_score)
                      : g.final_score,
                }))
                .filter((g) => typeof g.score === "number" && !isNaN(g.score));

              const byDesc = [...sortedScores].sort((a, b) => b.score - a.score);
              const byAsc = [...sortedScores].sort((a, b) => a.score - b.score);

              initialForm.top_subjects = byDesc
                .slice(0, 3)
                .map((g) => `${g.subject} (${g.score})`);
              initialForm.weak_subjects = byAsc
                .filter((g) => g.score < 8.0)
                .slice(0, 3)
                .map((g) => `${g.subject} (${g.score})`);
            } else {
              logger.debug("⚠️ No valid final_score found in scores");
              scoresData.setHasScoreData(false);
            }
          } else {
            logger.debug(
              "⚠️ No scores found for student - not an array or empty",
            );
            logger.debug("📋 Scores type:", typeof studentScoresList);
            logger.debug("📋 Is array:", Array.isArray(studentScoresList));
            scoresData.setHasScoreData(false);
          }
        } else {
          logger.debug("❌ Failed to fetch scores:", scoresResponse);
          scoresData.setHasScoreData(false);
        }
      } catch (error) {
        logger.error("Error fetching student scores:", error);
        scoresData.setHasScoreData(false);
      }

      // GK mode: process raw score_data to extract TX/GK columns below threshold
      // Always store scores data so it's available when switching to GK later
      const scoresList = scoresResponse?.data?.scores || [];
      setAllScoresData(scoresList);

      try {
        if (selectedType === "GK") {

          const lowDetails: any[] = [];
          for (const subjectScore of scoresList) {
            const scoreData = subjectScore.score_data;
            if (!scoreData || typeof scoreData !== "object") continue;

            const subjectName = scoreData.Mon_hoc || subjectScore.subject_name || "???";
            const lowColumns: { name: string; value: string }[] = [];

            for (const [key, val] of Object.entries(scoreData)) {
              if (key === "Mon_hoc") continue;
              const keyLower = key.toLowerCase();
              // Only TX and GK columns, exclude CK
              if (!_isGK_TX_column(keyLower)) continue;
              if (_isCK_column(keyLower)) continue;

              const diem = (val as any)?.Diem;
              if (diem === undefined || diem === null) continue;

              const diemNum = typeof diem === "string" ? parseFloat(diem) : diem;
              const isKD = typeof diem === "string" && diem.toUpperCase() === "KĐ";

              if (isKD || (!isNaN(diemNum) && diemNum < 8)) {
                lowColumns.push({ name: _columnLabel(key), value: String(diem) });
              }
            }

            if (lowColumns.length > 0) {
              lowDetails.push({ subject: subjectName, columns: lowColumns });
            }
          }
          setGkLowScoreDetails(lowDetails);
        }
      } catch (err) {
        logger.error("Error processing GK score details:", err);
      }

      try {
        const token = localStorage.getItem("access_token");
        const commentResponse = await fetch(
          `${API_BASE_URL}/feedback/comments/${student.id}?semester=${filters.selectedSemester}&type=${selectedType}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (commentResponse.ok) {
          const commentResult = await commentResponse.json();
          if (commentResult.success && commentResult.data) {
            setGeneratedFeedback(commentResult.data.description);
            logger.debug("✅ Loaded existing comment:", commentResult.data);
          }
        }
      } catch (error) {
        logger.error("Error loading comment:", error);
      }

      logger.debug("📝 Setting feedback form:", initialForm);
      setFeedbackForm(initialForm);
      setShowFeedbackModal(true);
    },
    [filters.selectedAcademicYear, filters.selectedSemester, selectedType, scoresData],
  );

  const closeFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
    setSelectedStudentForFeedback(null);
    setFeedbackForm({
      student_name: "",
      score: "",
      top_subjects: [],
      weak_subjects: [],
      attendance_rate: "100",
      subject: "",
      notes: "",
    });
    setGeneratedFeedback("");
    setFeedbackError("");
    setFeedbackSuccess(false);
    scoresData.set_scoreTrendData(null);
    scoresData.set_trendError("");
  }, [scoresData]);

  const handleFeedbackFormChange = useCallback((field: string, value: any) => {
    setFeedbackForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFeedbackError("");
    setFeedbackSuccess(false);
  }, []);

  const validateFeedbackForm = useCallback(() => {
    const { student_name, score, attendance_rate } = feedbackForm;

    if (!student_name.trim()) {
      setFeedbackError("Vui lòng nhập tên học sinh");
      return false;
    }

    if (!scoresData.hasScoreData) {
      setFeedbackError("Cần có dữ liệu điểm của học sinh để tạo nhận xét");
      return false;
    }

    // CK mode: validate score range
    if (selectedType === "CK") {
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
        setFeedbackError("Điểm số phải từ 0 đến 10");
        return false;
      }
    }

    const attendanceNum = parseInt(attendance_rate);
    if (isNaN(attendanceNum) || attendanceNum < 0 || attendanceNum > 100) {
      setFeedbackError("Tỷ lệ chuyên cần phải từ 0 đến 100%");
      return false;
    }

    return true;
  }, [feedbackForm, scoresData.hasScoreData, selectedType]);

  const generateFeedback = useCallback(async () => {
    if (!validateFeedbackForm()) return;

    setFeedbackLoading(true);
    setFeedbackError("");
    setGeneratedFeedback("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/feedback/generate-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: feedbackForm.student_name,
            score: selectedType === "CK" ? parseFloat(feedbackForm.score || "0") : 0,
            top_subjects: selectedType === "CK" ? (feedbackForm.top_subjects || []) : [],
            weak_subjects: selectedType === "CK" ? (feedbackForm.weak_subjects || []) : [],
            attendance_rate: parseInt(feedbackForm.attendance_rate || "100"),
            subject: feedbackForm.subject || null,
            notes: feedbackForm.notes,
            type: selectedType,
            low_score_details: selectedType === "GK" ? gkLowScoreDetails : [],
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        setGeneratedFeedback(result.feedback);
        setFeedbackSuccess(true);
      } else {
        setFeedbackError(result.error || "Không thể tạo nhận xét");
      }
    } catch (err) {
      logger.error("Error generating feedback:", err);
      setFeedbackError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackForm, validateFeedbackForm, selectedType, gkLowScoreDetails]);

  const saveComment = useCallback(async () => {
    if (!generatedFeedback || !selectedStudentForFeedback) {
      setFeedbackError("Không có nhận xét để lưu");
      return;
    }

    setSmsLoading(true);
    setFeedbackError("");

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/feedback/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: selectedStudentForFeedback.id,
          description: generatedFeedback,
          semester: filters.selectedSemester,
          type: selectedType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackSuccess(true);
        setFeedbackError("");
        logger.info("✅ Đã lưu nhận xét thành công");
      } else {
        setFeedbackError(result.message || "Không thể lưu nhận xét");
      }
    } catch (error) {
      logger.error("Error saving comment:", error);
      setFeedbackError("Lỗi kết nối server khi lưu nhận xét");
    } finally {
      setSmsLoading(false);
    }
  }, [generatedFeedback, selectedStudentForFeedback, filters.selectedSemester, selectedType]);

  const exportAllComments = useCallback(async () => {
    if (!filters.selectedClass || filters.selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để tải nhận xét");
      return;
    }

    try {
      // Find the class by BOTH name AND academic year to get the correct ID
      const found = filters.homeroomClasses.find(
        (c) => c.class_name === filters.selectedClass && c.academic_year === filters.selectedAcademicYear,
      );
      const classId = found?.id;

      if (!classId) {
        toast.error("Không tìm thấy thông tin lớp");
        return;
      }

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/feedback/comments/class/${classId}?semester=${filters.selectedSemester}&type=${selectedType}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        toast.error("Lỗi khi lấy nhận xét từ server");
        return;
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        toast.error("Lớp này chưa có nhận xét nào");
        return;
      }

      // Download comments as text
      const commentsText = result.data
        .map(
          (c: any) =>
            `Học sinh: ${c.student_name || c.student_code}\nNhận xét: ${c.description}\n---\n`,
        )
        .join("\n");

      const blob = new Blob([commentsText], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Nhan_xet_${filters.selectedClass}_${filters.selectedSemester}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Đã tải nhận xét thành công!");
    } catch (error) {
      logger.error("Error exporting comments:", error);
      toast.error(
        "Lỗi khi tải nhận xét: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  }, [filters.selectedClass, filters.selectedSemester, filters.homeroomClasses, selectedType]);

  return {
    showFeedbackModal,
    setShowFeedbackModal,
    selectedStudentForFeedback,
    feedbackForm,
    setFeedbackForm,
    generatedFeedback,
    setGeneratedFeedback,
    feedbackLoading,
    feedbackError,
    setFeedbackError,
    feedbackSuccess,
    setFeedbackSuccess,
    smsLoading,
    selectedType,
    setSelectedType,
    gkLowScoreDetails,
    allScoresData,
    handleFeedbackClick,
    closeFeedbackModal,
    handleFeedbackFormChange,
    validateFeedbackForm,
    generateFeedback,
    saveComment,
    exportAllComments,
  };
};
