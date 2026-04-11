import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/useSystemSettings";
import api from "@/utils/api";
import logger from "@/utils/logger";

// Tạo danh sách năm học từ 2024-2025 đến 2035-2036
const generateAcademicYears = () => {
  const years: string[] = [];
  for (let year = 2024; year <= 2035; year++) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

// Danh sách học kỳ cố định
export const SEMESTERS = ["HK1", "HK2", "HK3"];
export const ACADEMIC_YEARS = generateAcademicYears();

// Types
export interface Subject {
  subject_id: string;
  subject_name: string;
  subject_code: string;
}

export interface ClassItem {
  class_id: string;
  class_name: string;
  grade: number;
  subjects: Subject[];
}

export interface AnalyticsData {
  total_classes: number;
  total_students: number;
  students_with_scores: number;
  students_without_scores: number;
  is_letter_grade_subject: boolean;
  subjects: string[];
  overview: {
    pass_count: number;
    fail_count: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  };
  performance_groups: Record<
    string,
    {
      label: string;
      count: number;
      percentage: number;
      color: string;
    }
  >;
  score_distribution: Record<string, number>;
  students_need_attention: Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    final_score: number | string;
  }>;
  top_students: Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    final_score: number | string;
  }>;
  class_comparison: Array<{
    class_name: string;
    average_score: number;
    pass_rate: number;
  }>;
}

export const useSubjectDashboard = () => {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('useSubjectDashboard must be used within AuthProvider');
  }
  const { settings } = useSystemSettings();
  const defaultAcademicYear = settings.academic_year || "2024-2025";
  const defaultSemester = settings.semester || "HK1";

  // State - Data Loading
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Filter states
  const [academicYear, setAcademicYear] = useState(
    defaultAcademicYear || "2024-2025"
  );
  const [semester, setSemester] = useState(defaultSemester || "HK1");

  // Fetch functions
  const fetchClassList = async () => {
    try {
      setLoadingClasses(true);
      const response = await api.getTeacherClasses(academicYear, semester);
      logger.debug("Class list response:", response);
      if (response.success && response.data) {
        // Extract unique classes from class_subjects data
        const classesMap: Record<string, ClassItem> = {};
        response.data.forEach((cs: any) => {
          if (cs.classes) {
            const classId = cs.classes.id;
            if (!classesMap[classId]) {
              classesMap[classId] = {
                class_id: classId,
                class_name: cs.classes.class_name,
                grade: cs.classes.grade,
                subjects: [],
              };
            }
            // Add subject if exists
            if (cs.subjects) {
              classesMap[classId].subjects.push({
                subject_id: cs.subjects.id,
                subject_name: cs.subjects.subject_name,
                subject_code: cs.subjects.subject_code,
              });
            }
          }
        });

        const classList = Object.values(classesMap).sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          return a.class_name.localeCompare(b.class_name);
        });

        setClassList(classList);
        logger.debug("Class list set to:", classList);
      }
    } catch (error) {
      logger.error("Error fetching class list:", error);
      setClassList([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherDashboardAnalytics(
        academicYear,
        semester,
        selectedClass ? parseInt(selectedClass) : null
      );
      logger.debug("Analytics response:", response);
      if (response.success) {
        setAnalytics(response.data);
      } else {
        logger.error("Failed to fetch analytics:", response.message);
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sync with system settings
  useEffect(() => {
    if (defaultAcademicYear) {
      setAcademicYear(defaultAcademicYear);
    }
  }, [defaultAcademicYear]);

  useEffect(() => {
    if (defaultSemester) {
      setSemester(defaultSemester);
    }
  }, [defaultSemester]);

  // Fetch class list when academicYear or semester changes
  useEffect(() => {
    if (academicYear && semester) {
      fetchClassList();
    }
  }, [academicYear, semester]);

  // Fetch analytics when academicYear, semester, or selectedClass changes
  useEffect(() => {
    if (academicYear && semester) {
      fetchAnalytics();
    }
  }, [academicYear, semester, selectedClass]);

  return {
    loading,
    analytics,
    classList,
    selectedClass,
    loadingClasses,
    academicYear,
    semester,
    setAnalytics,
    setClassList,
    setSelectedClass,
    setLoadingClasses,
    setAcademicYear,
    setSemester,
  };
};
