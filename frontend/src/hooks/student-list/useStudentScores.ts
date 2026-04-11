import { useState, useCallback } from "react";
import ApiService from "@/utils/api";
import logger from "@/utils/logger";

export const useStudentScores = (academicYear: string, semester: string, selectedAcademicYear: string, selectedSemester: string) => {
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [selectedStudentForScores, setSelectedStudentForScores] = useState<any>(null);
  const [studentScores, setStudentScores] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [_scoreTrendData, set_scoreTrendData] = useState<any>(null);
  const [_trendError, set_trendError] = useState("");
  const [hasScoreData, setHasScoreData] = useState(false);

  // View scores function
  const handleViewScores = useCallback(async (student: any) => {
    setSelectedStudentForScores(student);
    setShowScoresModal(true);
    setScoresLoading(true);
    setStudentScores([]);

    try {
      const response = await ApiService.getStudentScores(
        student.id,
        selectedAcademicYear,
        selectedSemester,
      );

      if (response.success) {
        setStudentScores(response.data?.scores || []);
      } else {
        logger.error("Failed to fetch scores:", response.message);
        setStudentScores([]);
      }
    } catch (error) {
      logger.error("Error fetching student scores:", error);
      setStudentScores([
        {
          subject_name: "Toán",
          class_name: student.class_name,
          academic_year: academicYear,
          semester: semester,
          score_data: {
            Diem_thuong_xuyen: { Diem: 8.5, He_so: 1 },
            Diem_thi_giua_ki: { Diem: 9.0, He_so: 2 },
            Diem_thi_cuoi_ki: { Diem: 8.0, He_so: 3 },
          },
          final_score: 8.4,
          teacher_name: "Nguyễn Thị Lan",
        },
        {
          subject_name: "Ngữ Văn",
          class_name: student.class_name,
          academic_year: academicYear,
          semester: semester,
          score_data: {
            Diem_mieng: { Diem: 7.5, He_so: 1 },
            Diem_15_phut: { Diem: 8.0, He_so: 1 },
            Diem_1_tiet: { Diem: 8.5, He_so: 2 },
            Diem_cuoi_ki: { Diem: 8.0, He_so: 3 },
          },
          final_score: 8.1,
          teacher_name: "Trần Văn Nam",
        },
      ]);
    } finally {
      setScoresLoading(false);
    }
  }, [selectedAcademicYear, selectedSemester, academicYear, semester]);

  const closeScoresModal = useCallback(() => {
    setShowScoresModal(false);
    setSelectedStudentForScores(null);
    setStudentScores([]);
  }, []);

  return {
    showScoresModal,
    setShowScoresModal,
    selectedStudentForScores,
    studentScores,
    scoresLoading,
    _scoreTrendData,
    set_scoreTrendData,
    _trendError,
    set_trendError,
    hasScoreData,
    setHasScoreData,
    handleViewScores,
    closeScoresModal,
  };
};
