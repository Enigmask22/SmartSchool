import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useGradeManagement, ACADEMIC_YEARS, SEMESTERS } from '@/hooks/useGradeManagement';
import {
  GradeManagementHeader,
  ClassSelector,
  GradeTableHeader,
  ConfigEditorModal,
  AddColumnModal,
  GradesTable,
  ScoreEditModal,
  ImportPreviewModal,
  NoScoreConfigState,
} from '@/components/grade-management';
import { exportToExcel } from '@/utils/excelGradeExport';

export default function GradeManagement() {
  const {
    loading,
    teacherInfo,
    selectedClassSubject,
    students,
    scoreConfig,
    editingStudent,
    scoreForm,
    showConfigEditor,
    configForm,
    showAddColumnModal,
    newColumnForm,
    showImportModal,
    importedData,
    importErrors,
    currentPage,
    pageSize,
    academicYear,
    semester,
    confirmState,
    setSelectedClassSubject,
    setEditingStudent,
    setScoreForm,
    setShowConfigEditor,
    setConfigForm,
    setShowAddColumnModal,
    setNewColumnForm,
    setShowImportModal,
    setImportedData,
    setImportErrors,
    setCurrentPage,
    setPageSize,
    setAcademicYear,
    setSemester,
    setConfirmState,
    fetchTeacherInfo,
    handleClassSubjectSelect,
    handleEditScore,
    handleScoreInputChange,
    handleSaveScore,
    handleShowConfigEditor,
    handleConfigInputChange,
    handleAddColumn,
    handleConfirmAddColumn,
    handleRemoveColumn,
    handleSaveConfig,
    handleDownloadTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleExportToExcel: triggerExport,
    openConfirm,
    closeConfirm,
    getDisplayColumns,
    flattenScoreColumns,
    initializeScoreForm,
    getSortedColumnNames,
    calculateFinalGrade,
  } = useGradeManagement();

  const handleExportToExcelClick = async () => {
    if (!selectedClassSubject || !scoreConfig) {
      alert('Vui lòng chọn lớp và có cấu hình điểm!');
      return;
    }

    await exportToExcel(
      students,
      scoreConfig,
      selectedClassSubject,
      academicYear,
      semester,
      getDisplayColumns,
      flattenScoreColumns,
      calculateFinalGrade
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center border bg-destructive/5 rounded-2xl border-destructive/20">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <p className="font-medium text-red-600">
            Không thể tải thông tin giáo viên. Vui lòng thử lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card */}
        <GradeManagementHeader
          teacherName={teacherInfo.teacher.full_name}
          academicYear={academicYear}
          semester={semester}
          ACADEMIC_YEARS={ACADEMIC_YEARS}
          SEMESTERS={SEMESTERS}
          onAcademicYearChange={setAcademicYear}
          onSemesterChange={setSemester}
        />

        {!selectedClassSubject ? (
          <ClassSelector
            assignedClasses={teacherInfo.assigned_classes}
            academicYear={academicYear}
            onSelect={handleClassSubjectSelect}
          />
        ) : (
          <div className="space-y-6">
            {/* Navigation and Header */}
            <GradeTableHeader
              selectedClassSubject={selectedClassSubject}
              academicYear={academicYear}
              semester={semester}
              hasScoreConfig={!!scoreConfig}
              onBack={() => setSelectedClassSubject(null)}
              onDownloadTemplate={handleDownloadTemplate}
              onFileUpload={handleFileUpload}
              onExportToExcel={handleExportToExcelClick}
              onImportSuccess={() =>
                handleClassSubjectSelect(selectedClassSubject)
              }
            />

            {/* Config Editor Modal */}
            <ConfigEditorModal
              open={showConfigEditor}
              onOpenChange={setShowConfigEditor}
              configForm={configForm}
              onConfigInputChange={handleConfigInputChange}
              onAddColumn={handleAddColumn}
              onRemoveColumn={handleRemoveColumn}
              onSaveConfig={handleSaveConfig}
              getSortedColumnNames={getSortedColumnNames}
            />

            {/* Add Column Modal */}
            <AddColumnModal
              open={showAddColumnModal}
              onOpenChange={setShowAddColumnModal}
              newColumnForm={newColumnForm}
              onFormChange={(updates) =>
                setNewColumnForm((prev) => ({
                  ...prev,
                  ...updates,
                }))
              }
              onConfirm={handleConfirmAddColumn}
            />

            {/* Students Grade Table */}
            {scoreConfig ? (
              <GradesTable
                students={students}
                scoreConfig={scoreConfig}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                onEditScore={handleEditScore}
                getDisplayColumns={getDisplayColumns}
                calculateFinalGrade={calculateFinalGrade}
              />
            ) : (
              <NoScoreConfigState onCreateConfig={handleShowConfigEditor} />
            )}
          </div>
        )}

        {/* Grade Edit Modal */}
        <ScoreEditModal
          open={!!editingStudent}
          onOpenChange={() => setEditingStudent(null)}
          editingStudent={editingStudent}
          scoreConfig={scoreConfig}
          scoreForm={scoreForm}
          onScoreInputChange={handleScoreInputChange}
          onSaveScore={handleSaveScore}
          getDisplayColumns={getDisplayColumns}
        />

        {/* Import Preview Modal */}
        <ImportPreviewModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          importedData={importedData}
          importErrors={importErrors}
          scoreConfig={scoreConfig}
          onConfirmImport={handleConfirmImport}
          onCancel={() => {
            setShowImportModal(false);
            setImportedData([]);
            setImportErrors([]);
          }}
          flattenScoreColumns={flattenScoreColumns}
        />
      </div>

      <ConfirmDialog {...confirmState} title={confirmState.title || ''} onConfirm={confirmState.onConfirm || (() => {})} onCancel={closeConfirm} />
    </div>
  );
};
