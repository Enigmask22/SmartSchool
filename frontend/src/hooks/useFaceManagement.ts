import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import ApiService from '@/utils/api';
import logger from '@/utils/logger';

// Type definitions
export interface AIStatus {
  service_status: string;
  service_name: string;
  database_encodings: number;
  local_ai_encodings: number;
  accuracy?: string | number;
  similarity_threshold?: number;
  sync_status: string;
}

export interface FaceBootstrapResponse {
  success: boolean;
  data?: {
    academic_years: string[];
    year: string;
    classes: Array<{ id: string; class_name: string }>;
    selected_class?: { class_name: string };
    students: Student[];
  };
}

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  is_active: boolean;
  face_samples_count?: number;
}

export interface FaceManagementParams {
  year?: string;
  className?: string;
}

export interface FaceManagementState {
  aiStatus: AIStatus | null;
  students: Student[];
  loading: boolean;
  error: string | null;
  selectedClass: string;
  availableClasses: string[];
  homeroomClasses: Array<{ id: string; class_name: string }>;
  academicYears: string[];
  selectedAcademicYear: string;
  classesLoading: boolean;
  bootstrapLoading: boolean;
  currentPage: number;
  pageSize: number;
}

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

export const useFaceManagement = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isHomeroomTeacher = authContext?.isHomeroomTeacher || (() => false);
  
  // State
  const [state, setState] = useState<FaceManagementState>({
    aiStatus: null,
    students: [],
    loading: true,
    error: null,
    selectedClass: 'all',
    availableClasses: [],
    homeroomClasses: [],
    academicYears: [],
    selectedAcademicYear: '',
    classesLoading: false,
    bootstrapLoading: false,
    currentPage: 1,
    pageSize: 20,
  });

  // Refs
  //const classesReqIdRef = useRef(0);
  const hasBootstrappedRef = useRef(false);

  // Update state helper
  const updateState = (updates: Partial<FaceManagementState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Fetch AI Status
  const fetchAIStatus = async (): Promise<AIStatus | null> => {
    try {
      const statusResponse = await fetch(`${API_BASE_URL}/ai/status`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        updateState({ aiStatus: statusData.data });
        return statusData.data;
      }
    } catch (error) {
      logger.error('Error fetching AI status:', error);
    }
    return null;
  };

  // Bootstrap face management
  const faceBootstrap = async (params: FaceManagementParams = {}) => {
    try {
      updateState({
        bootstrapLoading: true,
        classesLoading: true,
        loading: true,
      });

      const searchParams = new URLSearchParams();
      if (params.year) searchParams.set('academic_year', params.year);
      if (params.className) searchParams.set('class_name', params.className);

      const url = `/homeroom/face/bootstrap${
        searchParams.toString() ? `?${searchParams.toString()}` : ''
      }`;

      const resp = (await ApiService.request(url)) as FaceBootstrapResponse;

      if (resp.success && resp.data) {
        const {
          academic_years,
          year: resolvedYear,
          classes,
          selected_class,
          students: stu,
        } = resp.data;

        if (Array.isArray(academic_years))
          updateState({ academicYears: academic_years });

        if (!state.selectedAcademicYear && resolvedYear)
          updateState({ selectedAcademicYear: resolvedYear });

        updateState({ homeroomClasses: Array.isArray(classes) ? classes : [] });

        const classNames = (classes || [])
          .map((c) => c.class_name)
          .filter(Boolean)
          .sort();

        updateState({ availableClasses: classNames });

        const exists =
          selected_class?.class_name &&
          classNames.includes(selected_class.class_name);

        updateState({
          selectedClass:
            exists ? selected_class.class_name : classNames[0] || 'all',
        });

        updateState({ students: Array.isArray(stu) ? stu : [] });
      }
    } catch (e) {
      logger.error('Face bootstrap error', e);
    } finally {
      updateState({
        classesLoading: false,
        bootstrapLoading: false,
        loading: false,
      });
    }
  };

  // Fetch students data
  const fetchStudentsData = async () => {
    try {
      updateState({ loading: true, error: null });

      // If homeroom teacher but no class selected, don't fetch
      if (
        isHomeroomTeacher() &&
        (!state.selectedClass || state.selectedClass === 'all')
      ) {
        logger.debug(
          '🚫 No class selected for homeroom teacher, skipping face management students fetch'
        );
        updateState({ students: [], loading: false });
        return;
      }

      let studentsResponse;

      if (isHomeroomTeacher()) {
        // If homeroom teacher, get only their homeroom students by class/year
        const found = state.homeroomClasses.find(
          (c) => c.class_name === state.selectedClass
        );
        const classId = found?.id;
        studentsResponse = await ApiService.request(
          classId
            ? `/homeroom/students?class_id=${classId}`
            : `/homeroom/students?class_name=${encodeURIComponent(
                state.selectedClass
              )}&academic_year=${encodeURIComponent(state.selectedAcademicYear)}`
        );
      } else {
        // If admin or other roles, get all students
        studentsResponse = await ApiService.getStudents({});
      }

      // Handle students response properly
      if (studentsResponse.success && studentsResponse.data) {
        let studentsData = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : [];

        // Apply class filter for non-homeroom users
        if (
          !isHomeroomTeacher() &&
          state.selectedClass &&
          state.selectedClass !== 'all'
        ) {
          studentsData = studentsData.filter(
            (student: Student) => student.class_name === state.selectedClass
          );
        }

        // Filter chỉ hiển thị học sinh đang hoạt động (is_active !== false)
        studentsData = studentsData.filter(
          (student: Student) => student.is_active !== false
        );

        // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
        studentsData = studentsData.sort((a: Student, b: Student) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        updateState({ students: studentsData });
      } else {
        updateState({ students: [] });
      }

      logger.debug('Face Management Students data:', studentsResponse);
    } catch (error) {
      logger.error('Error fetching students data:', error);
      updateState({
        error: 'Không thể tải thông tin học sinh',
        students: [],
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Delete face encoding
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
      const response = await fetch(
        `${API_BASE_URL}/ai/student/${studentId}/encoding`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Xóa khuôn mặt thành công!');
        await fetchData();
        return true;
      } else {
        alert(`Lỗi: ${result.message}`);
        return false;
      }
    } catch (error) {
      logger.error('Error deleting face encoding:', error);
      alert('Có lỗi xảy ra khi xóa khuôn mặt');
      return false;
    }
  };

  // Reload models
  const reloadModels = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/reload-models`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        alert('Reload models thành công!');
        await fetchData();
        return true;
      } else {
        alert(`Lỗi: ${result.message}`);
        return false;
      }
    } catch (error) {
      logger.error('Error reloading models:', error);
      alert('Có lỗi xảy ra khi reload models');
      return false;
    }
  };

  // Combined fetch data
  const fetchData = async () => {
    await Promise.all([
      fetchAIStatus(),
      faceBootstrap({
        year: state.selectedAcademicYear,
        className: state.selectedClass,
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

  // Reload classes when academic year changes
  useEffect(() => {
    if (isHomeroomTeacher()) {
      faceBootstrap({ year: state.selectedAcademicYear });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedAcademicYear]);

  // Reset pagination when class changes
  useEffect(() => {
    updateState({ currentPage: 1 });
  }, [state.selectedClass]);

  // Bootstrap when user changes
  useEffect(() => {
    if (!state.bootstrapLoading) {
      faceBootstrap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Pagination helpers
  const getTotalPages = (): number => {
    return Math.ceil(state.students.length / state.pageSize);
  };

  const getPaginatedStudents = (): Student[] => {
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return state.students.slice(startIndex, endIndex);
  };

  return {
    // State
    ...state,
    // Actions
    updateState,
    faceBootstrap,
    fetchStudentsData,
    fetchAIStatus,
    deleteFaceEncoding,
    reloadModels,
    fetchData,
    // Helpers
    getTotalPages,
    getPaginatedStudents,
    isHomeroomTeacher,
  };
};
