import { GraduationCap } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useClassManagement } from '@/hooks/useClassManagement';
import {
  ClassFilterCard,
  HomeroomTeacherCard,
  StudentsTableCard,
  AddStudentModal,
  ImportModal,
  EditStudentModal,
  MoveClassModal,
} from '@/components/class-management';

const ClassManagement = () => {
  const {
    selectedClassForManagement,
    setSelectedClassForManagement,
    showInactiveStudents,
    setShowInactiveStudents,
    homeroomTeacher,
    loadingClassData,
    restoreLoading,
    searchTerm,
    setSearchTerm,
    confirmState,
    showEditModal,
    setShowEditModal,
    selectedStudentForEdit,
    editForm,
    editLoading,
    showAddStudentModal,
    setShowAddStudentModal,
    studentFormData,
    studentFormErrors,
    studentFormLoading,
    currentPage,
    setCurrentPage,
    classManagementPageSize,
    setClassManagementPageSize,
    showImportModal,
    setShowImportModal,
    importedData,
    importErrors,
    importLoading,
    classes,
    error,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedGrade,
    setSelectedGrade,
    showMoveModal,
    setShowMoveModal,
    selectedStudentIds,
    setSelectedStudentIds,
    moveYear,
    setMoveYear,
    moveClasses,
    setMoveClasses,
    moveTargetClassId,
    setMoveTargetClassId,
    moveLoading,
    closeConfirm,
    loadClassStudents,
    handleStudentFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    addParentContactRowEdit,
    removeParentContactRowEdit,
    updateParentContactFieldEdit,
    handleSubmitStudentForm,
    handleCloseAddStudentModal,
    downloadStudentTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleCloseImportModal,
    handleDeleteStudent,
    handlePermanentDeleteStudent,
    handleEditStudent,
    handleEditFormChange,
    submitEditForm,
    closeEditModal,
    handleRestore,
    filteredStudents,
    totalStudents,
    totalPages,
    paginatedStudents,
  } = useClassManagement();

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold">Quản lý học sinh</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Quản lý học sinh và lớp học trong hệ thống
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Class Filter */}
      <ClassFilterCard
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        selectedClassForManagement={selectedClassForManagement}
        setSelectedClassForManagement={setSelectedClassForManagement}
        showInactiveStudents={showInactiveStudents}
        setShowInactiveStudents={setShowInactiveStudents}
        academicYears={academicYears}
        classes={classes}
      />

      {/* Homeroom Teacher Info */}
      <HomeroomTeacherCard
        homeroomTeacher={homeroomTeacher}
        selectedClassForManagement={selectedClassForManagement}
      />

      {/* Students Table */}
      <StudentsTableCard
        selectedClassForManagement={selectedClassForManagement}
        loadingClassData={loadingClassData}
        error={error}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        paginatedStudents={paginatedStudents}
        totalStudents={totalStudents}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        classManagementPageSize={classManagementPageSize}
        setClassManagementPageSize={setClassManagementPageSize}
        totalPages={totalPages}
        selectedStudentIds={selectedStudentIds}
        setSelectedStudentIds={setSelectedStudentIds}
        restoreLoading={restoreLoading}
        downloadStudentTemplate={downloadStudentTemplate}
        handleFileUpload={handleFileUpload}
        onAddStudent={() => setShowAddStudentModal(true)}
        onMoveClass={() => {
          setShowMoveModal(true);
          setMoveYear(selectedAcademicYear || '');
          setMoveTargetClassId('');
        }}
        loadClassStudents={loadClassStudents}
        handleEditStudent={handleEditStudent}
        handleDeleteStudent={handleDeleteStudent}
        handleRestore={handleRestore}
        handlePermanentDeleteStudent={handlePermanentDeleteStudent}
      />

      {/* Add Student Modal */}
      <AddStudentModal
        open={showAddStudentModal}
        onOpenChange={setShowAddStudentModal}
        studentFormData={studentFormData}
        studentFormErrors={studentFormErrors}
        studentFormLoading={studentFormLoading}
        onFormChange={handleStudentFormChange}
        addParentContactRow={addParentContactRow}
        removeParentContactRow={removeParentContactRow}
        updateParentContactField={updateParentContactField}
        onSubmit={handleSubmitStudentForm}
        onClose={handleCloseAddStudentModal}
      />

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        importedData={importedData}
        importErrors={importErrors}
        importLoading={importLoading}
        onConfirmImport={handleConfirmImport}
        onClose={handleCloseImportModal}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        selectedStudentForEdit={selectedStudentForEdit}
        editForm={editForm}
        editLoading={editLoading}
        onFormChange={handleEditFormChange}
        addParentContactRowEdit={addParentContactRowEdit}
        removeParentContactRowEdit={removeParentContactRowEdit}
        updateParentContactFieldEdit={updateParentContactFieldEdit}
        onSubmit={submitEditForm}
        onClose={closeEditModal}
      />

      {/* Move Class Modal */}
      <MoveClassModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        moveYear={moveYear}
        setMoveYear={setMoveYear}
        moveClasses={moveClasses}
        moveTargetClassId={moveTargetClassId}
        setMoveTargetClassId={setMoveTargetClassId}
        moveLoading={moveLoading}
        academicYears={academicYears}
        classes={classes}
        selectedStudentIds={selectedStudentIds}
        onConfirm={async () => {
          setShowMoveModal(false);
          setSelectedStudentIds([]);
          await loadClassStudents();
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title || ''}
        description={confirmState.description}
        confirmText={confirmState.confirmText || 'Xác nhận'}
        variant={confirmState.variant || 'default'}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default ClassManagement;
