import { Camera, AlertCircle } from 'lucide-react';
import { useFaceManagement } from '@/hooks/useFaceManagement';
import {
  AIStatusCard,
  FilterSection,
  StudentsTable,
  Instructions,
  LoadingState,
} from '@/components/face-management';

interface FaceManagementProps {
  isHomeroom?: boolean;
}

export default function FaceManagement({ isHomeroom = false }: FaceManagementProps) {
  const {
    aiStatus,
    students,
    loading,
    error,
    selectedClass,
    availableClasses,
    academicYears,
    selectedAcademicYear,
    classesLoading,
    currentPage,
    pageSize,
    updateState,
    faceBootstrap,
    deleteFaceEncoding,
    reloadModels,
    fetchData,
    getTotalPages,
    isHomeroomTeacher,
  } = useFaceManagement();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="space-y-2">
        <h2 className="flex items-center space-x-2 text-3xl font-bold text-gray-900">
          <Camera className="w-8 h-8 text-primary" />
          <span>Quản lý khuôn mặt AI</span>
        </h2>
        <p className="text-gray-600">
          Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký
        </p>
        {error && (
          <div className="flex items-center p-3 mt-2 space-x-2 text-red-700 bg-red-100 border border-red-400 rounded">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* AI Status Card */}
      <AIStatusCard
        aiStatus={aiStatus}
        onReloadModels={reloadModels}
        onRefresh={fetchData}
      />

      {/* Filter Section */}
      <FilterSection
        selectedClass={selectedClass}
        availableClasses={availableClasses}
        classesLoading={classesLoading}
        selectedAcademicYear={selectedAcademicYear}
        academicYears={academicYears}
        isHomeroomTeacher={isHomeroomTeacher()}
        onClassChange={(value) => {
          updateState({ selectedClass: value });
          faceBootstrap({
            year: selectedAcademicYear,
            className: value,
          });
        }}
        onYearChange={(v) => {
          updateState({ selectedAcademicYear: v });
          faceBootstrap({ year: v });
        }}
        onRefresh={() => {
          fetchData();
        }}
      />

      {/* Students Table */}
      <StudentsTable
        students={students}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedClass={selectedClass}
        isHomeroomTeacher={isHomeroomTeacher()}
        totalPages={getTotalPages()}
        onDeleteFace={deleteFaceEncoding}
        onPageChange={(page) => updateState({ currentPage: page })}
        onPageSizeChange={(size) => {
          updateState({ pageSize: size, currentPage: 1 });
        }}
      />

      {/* Instructions */}
      <Instructions />
    </div>
  );
}
