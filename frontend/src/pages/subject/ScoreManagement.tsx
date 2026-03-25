import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { useScoreManagement, ACADEMIC_YEARS, SEMESTERS } from '@/hooks/score-management/useScoreManagement';
import { useScoreManagementAPI } from '@/hooks/score-management/useScoreManagementAPI';
import { useScoreManagementFilters } from '@/hooks/score-management/useScoreManagementFilters';
import { useScoreEditForm } from '@/hooks/score-management/useScoreEditForm';
import { useScoreConfigForm } from '@/hooks/score-management/useScoreConfigForm';
import { useScoreImportForm } from '@/hooks/score-management/useScoreImportForm';
import {
  ScoreManagementHeader,
  ClassSelector,
  GradeTableHeader,
  ConfigEditorModal,
  AddColumnModal,
  GradesTable,
  ScoreEditModal,
  ImportPreviewModal,
  NoScoreConfigState,
  TeacherHeaderSkeleton,
  ClassSelectorSkeleton,
  GradeTableSkeleton,
} from '@/components/score-management';
import { exportToExcel } from '@/utils/excelGradeExport';

export default function ScoreManagement() {
  // Use new hooks for data layer and UI state
  const api = useScoreManagementAPI();
  const filters = useScoreManagementFilters();
  const editForm = useScoreEditForm();
  const configForm = useScoreConfigForm();
  const importForm = useScoreImportForm();

  // Keep old hook for needed handlers and confirm dialog
  const { confirmState, closeConfirm, openConfirm, handleDownloadTemplate } = useScoreManagement();

  const [selectedClassSubject, setSelectedClassSubject] = useState<any>(null);

  // Wrap API class select to handle filters
  const handleClassSubjectSelect = async (classSubject: any) => {
    setSelectedClassSubject(classSubject);
    filters.resetPagination();
    await api.handleClassSubjectSelect(classSubject);
  };

  // Handle export
  const handleExportToExcelClick = async () => {
    if (!selectedClassSubject || !api.scoreConfig) {
      alert('Vui lòng chọn lớp và có cấu hình điểm!');
      return;
    }

    await exportToExcel(
      api.students,
      api.scoreConfig,
      selectedClassSubject,
      filters.academicYear,
      filters.semester,
      api.getDisplayColumns,
      calculateFinalGradeWrapper
    );
  };

  // Handle file upload - connect to import form
  const handleFileUploadWithForm = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await api.handleFileUpload(event, api.scoreConfig, (data, errors) => {
      importForm.setImportedData(data);
      importForm.setImportErrors(errors);
      if (data.length > 0 && errors.length === 0) {
        importForm.setShowImportModal(true);
      }
    });
  };

  // Handle confirm import - refetch after success
  const handleConfirmImportWithRefresh = async () => {
    await api.handleConfirmImport(
      selectedClassSubject,
      filters.academicYear,
      filters.semester,
      importForm.importedData,
      async () => {
        await api.handleClassSubjectSelect(selectedClassSubject);
        importForm.resetImportForm();
      }
    );
  };

  // Paginate students based on current page/pageSize
  const paginatedStudents = api.students.slice(
    (filters.currentPage - 1) * filters.pageSize,
    filters.currentPage * filters.pageSize
  );

  // Wrapper function to adapt calculateFinalGrade for components expecting single-argument function
  const calculateFinalGradeWrapper = (scoreData: any) => {
    return api.calculateFinalGrade(scoreData, api.scoreConfig?.score_column_config || {});
  };

  // Show initial loading
  if (api.loading && !api.teacherInfo) {
    return (
      <div className="min-h-screen p-6 space-y-6 bg-gray-50">
        <div className="mx-auto space-y-6 max-w-7xl">
          <TeacherHeaderSkeleton />
          <ClassSelectorSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (!api.teacherInfo) {
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
        {/* Header Card - Always visible */}
        <ScoreManagementHeader
          teacherName={api.teacherInfo.teacher.full_name}
          academicYear={filters.academicYear}
          semester={filters.semester}
          ACADEMIC_YEARS={ACADEMIC_YEARS}
          SEMESTERS={SEMESTERS}
          onAcademicYearChange={filters.setAcademicYear}
          onSemesterChange={filters.setSemester}
        />

        {/* Class Selector - Skeleton on init, content when ready */}
        {api.loading && api.students.length === 0 && !selectedClassSubject ? (
          <ClassSelectorSkeleton />
        ) : !selectedClassSubject ? (
          <ClassSelector
            assignedClasses={api.teacherInfo.assigned_classes}
            academicYear={filters.academicYear}
            onSelect={handleClassSubjectSelect}
          />
        ) : (
          <div className="space-y-6">
            {/* Grade Table Header */}
            <GradeTableHeader
              selectedClassSubject={selectedClassSubject}
              academicYear={filters.academicYear}
              semester={filters.semester}
              hasScoreConfig={!!api.scoreConfig}
              onBack={() => setSelectedClassSubject(null)}
              onDownloadTemplate={handleDownloadTemplate}
              onFileUpload={handleFileUploadWithForm}
              onExportToExcel={handleExportToExcelClick}
              onImportSuccess={() => handleClassSubjectSelect(selectedClassSubject)}
            />

            {/* Config Editor Modal */}
            <ConfigEditorModal
              open={configForm.showConfigEditor}
              onOpenChange={configForm.setShowConfigEditor}
              configForm={configForm.configForm}
              onConfigInputChange={(columnName, field, value) =>
                configForm.updateConfigField(columnName, field, value)
              }
              onAddColumn={() => {
                configForm.setShowAddColumnModal(true);
                configForm.resetNewColumnForm();
              }}
              onRemoveColumn={(columnName) => {
                if (Object.keys(configForm.configForm).length <= 1) {
                  alert('Phải có ít nhất một cột điểm!');
                  return;
                }
                openConfirm({
                  title: 'Xóa cột điểm',
                  description: `Bạn có chắc muốn xóa cột "${configForm.configForm[columnName]?.label || columnName}"?`,
                  confirmText: 'Xóa cột',
                  onConfirm: () => {
                    closeConfirm();
                    configForm.removeConfigColumn(columnName);
                  },
                });
              }}
              onSaveConfig={() => {
                if (Object.keys(configForm.configForm).length === 0) {
                  alert('Phải có ít nhất một cột điểm!');
                  return;
                }

                const invalidColumns = Object.keys(configForm.configForm).filter(
                  (columnName) => {
                    const column = configForm.configForm[columnName];
                    return !column.label || !column.he_so || column.he_so < 1 || column.he_so > 10;
                  }
                );

                if (invalidColumns.length > 0) {
                  alert('Vui lòng điền đầy đủ thông tin cho tất cả các cột điểm.');
                  return;
                }

                api.handleSaveConfig(
                  selectedClassSubject,
                  filters.academicYear,
                  filters.semester,
                  configForm.configForm,
                  () => {
                    configForm.setShowConfigEditor(false);
                    // Force reload
                    api.handleClassSubjectSelect(selectedClassSubject);
                  }
                );
              }}
              getSortedColumnNames={(config) => api.getSortedColumnNames(config)}
            />

            {/* Add Column Modal */}
            <AddColumnModal
              open={configForm.showAddColumnModal}
              onOpenChange={configForm.setShowAddColumnModal}
              newColumnForm={configForm.newColumnForm}
              onFormChange={(updates) =>
                configForm.setNewColumnForm({ ...configForm.newColumnForm, ...updates })
              }
              onConfirm={() => {
                if (configForm.newColumnForm.name && configForm.newColumnForm.label) {
                  const validName = configForm.newColumnForm.name
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '');

                  if (!validName) {
                    alert(
                      'Tên cột không hợp lệ. Chỉ được sử dụng chữ cái, số và dấu gạch dưới.'
                    );
                    return;
                  }

                  if (configForm.configForm[validName]) {
                    alert('Cột điểm này đã tồn tại!');
                    return;
                  }

                  configForm.setConfigForm({
                    ...configForm.configForm,
                    [validName]: {
                      he_so: parseInt(String(configForm.newColumnForm.he_so)) || 1,
                      label: configForm.newColumnForm.label,
                    },
                  });

                  configForm.setShowAddColumnModal(false);
                  configForm.resetNewColumnForm();
                } else {
                  alert('Vui lòng điền đầy đủ thông tin!');
                }
              }}
            />

            {/* Grade Table or Skeleton */}
            {api.loading && api.students.length === 0 ? (
              <GradeTableSkeleton />
            ) : api.scoreConfig ? (
              <GradesTable
                students={paginatedStudents}
                scoreConfig={api.scoreConfig}
                currentPage={filters.currentPage}
                pageSize={filters.pageSize}
                onPageChange={filters.setCurrentPage}
                onPageSizeChange={(newSize) => {
                  filters.setPageSize(newSize);
                  filters.resetPagination();
                }}
                onEditScore={(student) => {
                  editForm.setEditingStudent(student);
                  const form = api.initializeScoreForm(student.student, student.score || null);
                  editForm.setScoreForm(form);
                }}
                getDisplayColumns={api.getDisplayColumns}
                calculateFinalGrade={calculateFinalGradeWrapper}
              />
            ) : (
              <NoScoreConfigState
                onCreateConfig={() => {
                  configForm.initializeConfigEditor(api.scoreConfig?.score_column_config);
                }}
              />
            )}
          </div>
        )}

        {/* Grade Edit Modal */}
        <ScoreEditModal
          open={!!editForm.editingStudent}
          onOpenChange={() => editForm.resetForm()}
          editingStudent={editForm.editingStudent}
          scoreConfig={api.scoreConfig}
          scoreForm={editForm.scoreForm}
          onScoreInputChange={(columnName, value) => editForm.updateScoreField(columnName, value)}
          onSaveScore={() => {
            api.handleSaveScore(
              editForm.editingStudent,
              selectedClassSubject,
              filters.academicYear,
              filters.semester,
              editForm.scoreForm,
              () => {
                api.handleClassSubjectSelect(selectedClassSubject);
                editForm.resetForm();
              }
            );
          }}
          getDisplayColumns={api.getDisplayColumns}
        />

        {/* Import Preview Modal */}
        <ImportPreviewModal
          open={importForm.showImportModal}
          onOpenChange={importForm.setShowImportModal}
          importedData={importForm.importedData}
          importErrors={importForm.importErrors}
          scoreConfig={api.scoreConfig}
          onConfirmImport={handleConfirmImportWithRefresh}
          onCancel={() => importForm.resetImportForm()}
          flattenScoreColumns={api.flattenScoreColumns}
        />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        {...confirmState}
        title={confirmState.title || ''}
        onConfirm={confirmState.onConfirm || (() => {})}
        onCancel={closeConfirm}
      />
    </div>
  );
}
