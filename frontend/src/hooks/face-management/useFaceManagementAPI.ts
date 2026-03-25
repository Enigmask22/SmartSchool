import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import ApiService from '@/utils/api';
import logger from '@/utils/logger';

export interface AIStatus {
  service_status: string;
  service_name: string;
  database_encodings: number;
  local_ai_encodings: number;
  accuracy?: string | number;
  similarity_threshold?: number;
  sync_status: string;
}

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  is_active: boolean;
  face_samples_count?: number;
}

export interface UseFaceManagementAPIReturn {
  aiStatus: AIStatus | null;
  students: Student[];
  loading: boolean;
  updating: boolean;
  error: string | null;
  fetchAIStatus: () => Promise<AIStatus | null>;
  faceBootstrap: (params: { year?: string; className?: string }) => Promise<void>;
  fetchStudentsData: (
    selectedClass: string,
    selectedAcademicYear: string,
    homeroomClasses: Array<{ id: string; class_name: string }>
  ) => Promise<void>;
  deleteFaceEncoding: (
    studentId: string,
    studentName: string
  ) => Promise<boolean>;
  reloadModels: () => Promise<boolean>;
  fetchData: (
    year?: string,
    className?: string
  ) => Promise<void>;
  bootstrapData: {
    academicYears: string[];
    availableClasses: string[];
    homeroomClasses: Array<{ id: string; class_name: string }>;
    resolvedYear: string;
    resolvedClass: string;
  };
}

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

/**
 * Fetches and manages face management API data (students, AI status, operations).
 * 
 * Dependencies:
 * - AuthContext (user, isHomeroomTeacher)
 * - API endpoints: /ai/status, /homeroom/face/bootstrap, /homeroom/students, /ai/student/{id}/encoding, /ai/reload-models
 * 
 * Returns: See UseFaceManagementAPIReturn interface
 */
export const useFaceManagementAPI = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isHomeroomTeacher =
    authContext?.isHomeroomTeacher || (() => false);

  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bootstrapData, setBootstrapData] = useState({
    academicYears: [] as string[],
    availableClasses: [] as string[],
    homeroomClasses: [] as Array<{ id: string; class_name: string }>,
    resolvedYear: '',
    resolvedClass: '',
  });

  const hasBootstrappedRef = useRef(false);

  const fetchAIStatus = async (): Promise<AIStatus | null> => {
    try {
      const statusResponse = await fetch(`${API_BASE_URL}/ai/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAIStatus(statusData.data);
        return statusData.data;
      }
    } catch (err) {
      logger.error('Error fetching AI status:', err);
    }
    return null;
  };

  const faceBootstrap = async (params: { year?: string; className?: string } = {}) => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams();
      if (params.year) searchParams.set('academic_year', params.year);
      if (params.className) searchParams.set('class_name', params.className);

      const url = `/homeroom/face/bootstrap${
        searchParams.toString() ? `?${searchParams.toString()}` : ''
      }`;

      const resp = (await ApiService.request(url)) as any;

      if (resp.success && resp.data) {
        const {
          academic_years,
          year: resolvedYear,
          classes,
          selected_class,
          students: stu,
        } = resp.data;

        const classNames = (classes || [])
          .map((c: any) => c.class_name)
          .filter(Boolean)
          .sort();

        const selectedClass =
          selected_class?.class_name && classNames.includes(selected_class.class_name)
            ? selected_class.class_name
            : classNames[0] || 'all';

        setBootstrapData({
          academicYears: Array.isArray(academic_years) ? academic_years : [],
          availableClasses: classNames,
          homeroomClasses: Array.isArray(classes) ? classes : [],
          resolvedYear: resolvedYear || '',
          resolvedClass: selectedClass,
        });

        setStudents(Array.isArray(stu) ? stu : []);
      }
    } catch (err) {
      logger.error('Face bootstrap error', err);
      setError('Không thể tải dữ liệu bootstrap');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsData = async (
    selectedClass: string,
    selectedAcademicYear: string,
    homeroomClasses: Array<{ id: string; class_name: string }>
  ) => {
    try {
      setUpdating(true);
      setError(null);

      if (
        isHomeroomTeacher() &&
        (!selectedClass || selectedClass === 'all')
      ) {
        logger.debug('No class selected for homeroom teacher, skipping fetch');
        setStudents([]);
        return;
      }

      let studentsResponse;

      if (isHomeroomTeacher()) {
        const found = homeroomClasses.find(
          (c) => c.class_name === selectedClass
        );
        const classId = found?.id;
        studentsResponse = await ApiService.request(
          classId
            ? `/homeroom/students?class_id=${classId}`
            : `/homeroom/students?class_name=${encodeURIComponent(
                selectedClass
              )}&academic_year=${encodeURIComponent(selectedAcademicYear)}`
        );
      } else {
        studentsResponse = await ApiService.getStudents({});
      }

      if (studentsResponse.success && studentsResponse.data) {
        let studentsData = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : [];

        if (
          !isHomeroomTeacher() &&
          selectedClass &&
          selectedClass !== 'all'
        ) {
          studentsData = studentsData.filter(
            (student: Student) => student.class_name === selectedClass
          );
        }

        studentsData = studentsData.filter(
          (student: Student) => student.is_active !== false
        );

        studentsData = studentsData.sort((a: Student, b: Student) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        setStudents(studentsData);
      } else {
        setStudents([]);
      }
    } catch (err) {
      logger.error('Error fetching students data:', err);
      setError('Không thể tải thông tin học sinh');
      setStudents([]);
    } finally {
      setUpdating(false);
    }
  };

  const deleteFaceEncoding = async (
    studentId: string,
    studentName: string
  ): Promise<boolean> => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa khuôn mặt đã đăng ký của ${studentName}?`
      )
    ) {
      return false;
    }

    try {
      setUpdating(true);
      const response = await fetch(
        `${API_BASE_URL}/ai/student/${studentId}/encoding`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Xóa khuôn mặt thành công!');
        // Refetch data instead of manual state update
        return true;
      } else {
        alert(`Lỗi: ${result.message}`);
        return false;
      }
    } catch (err) {
      logger.error('Error deleting face encoding:', err);
      alert('Có lỗi xảy ra khi xóa khuôn mặt');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const reloadModels = async (): Promise<boolean> => {
    try {
      setUpdating(true);
      const response = await fetch(`${API_BASE_URL}/ai/reload-models`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        alert('Reload models thành công!');
        return true;
      } else {
        alert(`Lỗi: ${result.message}`);
        return false;
      }
    } catch (err) {
      logger.error('Error reloading models:', err);
      alert('Có lỗi xảy ra khi reload models');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const fetchData = async (year?: string, className?: string) => {
    await Promise.all([
      fetchAIStatus(),
      faceBootstrap({
        year: year,
        className: className,
      }),
    ]);
  };

  // Initial bootstrap
  useEffect(() => {
    if (!hasBootstrappedRef.current) {
      hasBootstrappedRef.current = true;
      faceBootstrap({});
    }
  }, []);

  // Re-bootstrap when user changes
  useEffect(() => {
    if (!loading) {
      faceBootstrap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    aiStatus,
    students,
    loading,
    updating,
    error,
    fetchAIStatus,
    faceBootstrap,
    fetchStudentsData,
    deleteFaceEncoding,
    reloadModels,
    fetchData,
    bootstrapData,
    isHomeroomTeacher,
  };
};
