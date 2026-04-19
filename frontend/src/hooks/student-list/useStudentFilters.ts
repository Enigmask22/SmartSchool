import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import api from '@/utils/api';
import logger from '@/utils/logger';

export const useStudentFilters = () => {
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { settings } = useSystemSettings();

  // Search and class filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Academic year and semester - Initialize from settings
  const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(settings.academic_year || '');
  const [selectedSemester, setSelectedSemester] = useState(settings.semester || 'HK1');
  const [availableSemesters] = useState(['HK1', 'HK2', 'CN']);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [viewMode, setViewMode] = useState('grid');

  // Refs
  const classesReqIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  const previousYearRef = useRef<string | null>(null);

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
        // Reset selected class if it no longer exists in the new year
        if (selectedClass && selectedClass !== 'all' && !res.data.find((c: any) => c.class_name === selectedClass)) {
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

  // Unified bootstrap: fetch both homeroom classes and available classes for current year
  useEffect(() => {
    const loadClassesForYear = async () => {
      // Prevent concurrent requests
      if (isFetchingRef.current) {
        logger.debug('Class fetch already in progress, skipping duplicate');
        return;
      }

      try {
        isFetchingRef.current = true;

        // Fetch all classes to populate homeroom classes list (no year filter)
        // This gives us the complete list for filtering by year
        const allClassesRes = await api.request('/homeroom/classes');
        //logger.info('📡 Raw API response for /homeroom/classes:', allClassesRes);
        
        if (allClassesRes.success && Array.isArray(allClassesRes.data)) {
          // logger.info('🏫 Homeroom classes fetched:', {
          //   count: allClassesRes.data.length,
          //   rawData: allClassesRes.data,  // Raw array to see exact structure
          //   classes: allClassesRes.data.map((c: any) => ({
          //     id: c.id,
          //     class_name: c.class_name,
          //     academic_year: c.academic_year,
          //     grade: c.grade,
          //     allKeys: Object.keys(c),  // Show all keys in the object
          //   })),
          // });
          setHomeroomClasses(allClassesRes.data);
        } else {
          logger.warn('Failed to fetch all homeroom classes for list');
          logger.warn('Response structure:', {
            success: allClassesRes.success,
            data: allClassesRes.data,
            isArray: Array.isArray(allClassesRes.data),
          });
        }

        // Fetch classes filtered by current academic year for display
        if (selectedAcademicYear) {
          await fetchAvailableClasses(selectedAcademicYear);
        }
      } catch (err) {
        logger.error('Error loading class data:', err);
      } finally {
        isFetchingRef.current = false;
      }
    };

    loadClassesForYear();
  }, []); // Empty deps - only run once on mount

  // When academic year changes - fetch classes for new year
  useEffect(() => {
    if (!isHomeroomTeacher || !selectedAcademicYear) {
      logger.debug('Skipping class fetch - teacher or year not set');
      return;
    }

    // Only fetch if the year actually changed
    if (previousYearRef.current === selectedAcademicYear) {
      //logger.debug(`Year unchanged: ${selectedAcademicYear}, skipping fetch`);
      return;
    }

    previousYearRef.current = selectedAcademicYear;

    // Prevent concurrent requests
    if (isFetchingRef.current) {
      logger.debug(`Fetch in progress, deferring year change to ${selectedAcademicYear}`);
      return;
    }

    fetchAvailableClasses(selectedAcademicYear);
  }, [selectedAcademicYear, isHomeroomTeacher]);

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
    academicYears: ACADEMIC_YEAR_OPTIONS,  // Use constant year list, not fetched from API
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
