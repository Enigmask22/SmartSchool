import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import api from '@/utils/api';
import logger from '@/utils/logger';

export const useStudentFilters = () => {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { academicYear } = useSystemSettings();

  // Search and class filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Academic year and semester
  const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('HK1');
  const [availableSemesters] = useState(['HK1', 'HK2', 'CN']);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [viewMode, setViewMode] = useState('grid');

  // Refs
  const classesReqIdRef = useRef(0);

  // Calculate pagination
  const calculatePagination = (students: any[]) => {
    const totalStudents = students.length;
    const totalPages = Math.ceil(totalStudents / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return { totalStudents, totalPages, startIndex, endIndex };
  };

  // Fetch available classes
  const fetchAvailableClasses = async (yearOverride: string | null = null) => {
    const reqId = ++classesReqIdRef.current;
    setClassesLoading(true);
    try {
      const yearToUse = yearOverride || selectedAcademicYear;
      if (!yearToUse) {
        setAvailableClasses([]);
        return;
      }

      const res = await api.request(`/homeroom/classes?academic_year=${yearToUse}`);
      if (reqId !== classesReqIdRef.current) return;

      if (res.success && Array.isArray(res.data)) {
        setAvailableClasses(res.data);
        if (selectedClass && !res.data.find((c: any) => c.class_name === selectedClass)) {
          setSelectedClass('all');
        }
      } else {
        logger.error('Failed to fetch classes:', res);
        setAvailableClasses([]);
      }
    } catch (error) {
      if (reqId !== classesReqIdRef.current) return;
      logger.error('Error fetching available classes:', error);
      setAvailableClasses([]);
    } finally {
      if (reqId === classesReqIdRef.current) {
        setClassesLoading(false);
      }
    }
  };

  // Initial load via bootstrap
  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          api.request('/homeroom/academic-years'),
          api.request('/homeroom/classes'),
        ]);

        if (yearsRes.success && Array.isArray(yearsRes.data)) {
          setAcademicYears(yearsRes.data);
          const toSelect =
            yearsRes.data.includes(academicYear) && academicYear
              ? academicYear
              : yearsRes.data[yearsRes.data.length - 1] || '';
          if (toSelect) {
            setSelectedAcademicYear(toSelect);
            if (selectedSemester === 'HK1') {
              setSelectedSemester('HK1');
            }
          }
        } else {
          logger.error('Failed to fetch academic years:', yearsRes);
          setAcademicYears([]);
        }

        if (classesRes.success && Array.isArray(classesRes.data)) {
          setHomeroomClasses(classesRes.data);
        } else {
          logger.error('Failed to fetch homeroom classes:', classesRes);
        }
      } catch (err) {
        logger.error('Error loading bootstrap data:', err);
      }
    };

    loadBootstrap();
  }, []);

  // When academic year changes
  useEffect(() => {
    if (!isHomeroomTeacher) return;

    const run = async () => {
      try {
        const res = await api.request(
          `/homeroom/classes?academic_year=${selectedAcademicYear}`
        );
        if (res.success && Array.isArray(res.data)) {
          setAvailableClasses(res.data);
        } else {
          logger.error('Failed to fetch classes:', res);
          setAvailableClasses([]);
        }
      } catch (err) {
        logger.error('Error fetching classes:', err);
        setAvailableClasses([]);
      }
    };

    run();
  }, [selectedAcademicYear]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, showInactive]);

  return {
    // Search and filter
    searchTerm,
    setSearchTerm,
    selectedClass,
    setSelectedClass,
    availableClasses,
    classesLoading,
    showInactive,
    setShowInactive,

    // Academic year and semester
    homeroomClasses,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedSemester,
    setSelectedSemester,
    availableSemesters,

    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,

    // Functions
    fetchAvailableClasses,
    calculatePagination,
  };
};
