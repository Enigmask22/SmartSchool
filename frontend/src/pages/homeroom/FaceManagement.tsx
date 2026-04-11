import { Camera } from 'lucide-react';
import { useEffect, useContext } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageHeaderControls } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useFaceManagementAPI } from '@/hooks/face-management/useFaceManagementAPI';
import { useFaceManagementFilters } from '@/hooks/face-management/useFaceManagementFilters';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import { AuthContext } from '@/contexts/AuthContext';
import {
  AIStatusCard,
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
  const authContext = useContext(AuthContext);
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { settings } = useSystemSettings();

  const api = useFaceManagementAPI();
  const filters = useFaceManagementFilters();

  // Sync filters with bootstrap data updates
  useEffect(() => {
    if (api.bootstrapData.resolvedClass) {
      filters.setSelectedClass(api.bootstrapData.resolvedClass);
    }
    if (api.bootstrapData.resolvedYear) {
      filters.setSelectedAcademicYear(api.bootstrapData.resolvedYear);
    }
  }, [api.bootstrapData.resolvedYear, api.bootstrapData.resolvedClass]);

  // Initialize academic year with settings default on mount
  useEffect(() => {
    if (settings.academic_year && !filters.selectedAcademicYear) {
      filters.setSelectedAcademicYear(settings.academic_year);
    }
  }, [settings.academic_year, filters]);

  // Handle year change
  const handleYearChange = async (value: string) => {
    filters.setSelectedAcademicYear(value);
    await api.faceBootstrap({ year: value });
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
        description={
          isHomeroomTeacher?.() && api.bootstrapData.resolvedClass && api.bootstrapData.resolvedClass !== 'all' ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{api.bootstrapData.resolvedYear}</Badge>
              <Badge variant="secondary">{`Lớp ${api.bootstrapData.resolvedClass}`}</Badge>
            </div>
          ) : isHomeroomTeacher?.() ? (
            'Chưa được phân công chủ nhiệm'
          ) : (
            'Cho phép quản lý khuôn mặt AI cho tất cả lớp'
          )
        }
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
            <Camera className="w-8 h-8 text-white" />
          </div>
        }
      >
        {/* Academic Year Selector for homeroom teachers */}
        <PageHeaderControls spacing="lg">
          {api.loading ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm học</span>
              <Skeleton className="min-w-[120px] h-10 rounded-md" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700 whitespace-nowrap flex-shrink-0">Năm học</span>
              <Select value={filters.selectedAcademicYear || settings.academic_year || ''} onValueChange={handleYearChange} disabled={api.loading}>
                <SelectTrigger className="min-w-[120px] focus-visible:outline-none">
                  <SelectValue placeholder="Chọn năm học" />
                </SelectTrigger>
                <SelectContent className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {ACADEMIC_YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </PageHeaderControls>
      </PageHeader>

      {/* Error display */}
      {displayError && (
        <div className="flex items-center p-4 space-x-2 text-red-700 bg-red-100 border border-red-400 rounded-lg">
          <span>{displayError}</span>
        </div>
      )}

      {/* AI Status Card */}
      {api.loading && !api.aiStatus ? (
        <AIStatusCardSkeleton />
      ) : (
        <AIStatusCard
          aiStatus={api.aiStatus}
          onReloadModels={api.reloadModels}
          onRefresh={() => api.fetchData(filters.selectedAcademicYear, filters.selectedClass)}
        />
      )}

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
