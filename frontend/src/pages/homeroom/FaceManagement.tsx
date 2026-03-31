import { Camera } from 'lucide-react';
import { useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { useFaceManagementAPI } from '@/hooks/face-management/useFaceManagementAPI';
import { useFaceManagementFilters } from '@/hooks/face-management/useFaceManagementFilters';
import {
  AIStatusCard,
  FilterSection,
  StudentsTable,
  Instructions,
} from '@/components/face-management';
import {
  AIStatusCardSkeleton,
  StudentsTableSkeleton,
} from '@/components/face-management/FaceManagementSkeleton';

interface FaceManagementProps {
  isHomeroom?: boolean;
}

export default function FaceManagement({ isHomeroom: _isHomeroom = false }: FaceManagementProps) {
  const api = useFaceManagementAPI();
  const filters = useFaceManagementFilters(
    api.bootstrapData.resolvedClass,
    api.bootstrapData.resolvedYear
  );

  // Sync filters with bootstrap data updates
  useEffect(() => {
    if (api.bootstrapData.resolvedClass) {
      filters.setSelectedClass(api.bootstrapData.resolvedClass);
    }
    if (api.bootstrapData.resolvedYear) {
      filters.setSelectedAcademicYear(api.bootstrapData.resolvedYear);
    }
  }, [api.bootstrapData.resolvedYear, api.bootstrapData.resolvedClass]);

  // Handle class change
  const handleClassChange = async (value: string) => {
    filters.setSelectedClass(value);
    await api.faceBootstrap({
      year: filters.selectedAcademicYear,
      className: value,
    });
    await api.fetchStudentsData(value, filters.selectedAcademicYear, api.bootstrapData.homeroomClasses);
  };

  // Handle year change
  const handleYearChange = async (value: string) => {
    filters.setSelectedAcademicYear(value);
    await api.faceBootstrap({ year: value });
    await api.fetchStudentsData(filters.selectedClass, value, api.bootstrapData.homeroomClasses);
  };

  // Handle delete face encoding
  const handleDeleteFace = async (studentId: string, studentName: string): Promise<boolean> => {
    const success = await api.deleteFaceEncoding(studentId, studentName);
    if (success) {
      await api.fetchStudentsData(filters.selectedClass, filters.selectedAcademicYear, api.bootstrapData.homeroomClasses);
    }
    return success;
  };

  // Pagination
  const paginatedStudents = filters.getPaginatedStudents(
    api.students,
    filters.pageSize,
    filters.currentPage
  );
  const totalPages = filters.getTotalPages(api.students.length);

  // Display error
  const displayError = api.error;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header with PageHeader component */}
      <PageHeader
        title="Quản lý khuôn mặt AI"
        description="Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký"
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <Camera className="w-8 h-8 text-white" />
          </div>
        }
      />

      {/* Error display */}
      {displayError && (
        <div className="flex items-center p-4 space-x-2 text-red-700 bg-red-100 border border-red-400 rounded-lg">
          <span>{displayError}</span>
        </div>
      )}

      {/* AI Status and Filter Section - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Status Card - Skeleton on initial load */}
        {api.loading && !api.aiStatus ? (
          <AIStatusCardSkeleton />
        ) : (
          <AIStatusCard
            aiStatus={api.aiStatus}
            onReloadModels={api.reloadModels}
            onRefresh={() => api.fetchData(filters.selectedAcademicYear, filters.selectedClass)}
          />
        )}

        {/* Filter Section - always visible (no skeleton needed) */}
        <FilterSection
          selectedClass={filters.selectedClass}
          availableClasses={api.bootstrapData.availableClasses}
          classesLoading={api.loading}
          selectedAcademicYear={filters.selectedAcademicYear}
          academicYears={api.bootstrapData.academicYears}
          isHomeroomTeacher={api.isHomeroomTeacher()}
          onClassChange={handleClassChange}
          onYearChange={handleYearChange}
          onRefresh={() => api.fetchData(filters.selectedAcademicYear, filters.selectedClass)}
        />
      </div>

      {/* Students Table - Skeleton on initial load */}
      {api.loading && api.students.length === 0 ? (
        <StudentsTableSkeleton />
      ) : (
        <StudentsTable
          students={paginatedStudents}
          currentPage={filters.currentPage}
          pageSize={filters.pageSize}
          selectedClass={filters.selectedClass}
          isHomeroomTeacher={api.isHomeroomTeacher()}
          totalPages={totalPages}
          totalStudents={api.students.length}
          onDeleteFace={handleDeleteFace}
          onPageChange={filters.setCurrentPage}
          onPageSizeChange={filters.setPageSize}
        />
      )}

      {/* Instructions */}
      <Instructions />
    </div>
  );
}
