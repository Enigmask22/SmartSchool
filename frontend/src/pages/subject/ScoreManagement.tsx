import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useScoreManagement, SEMESTERS } from '@/hooks/score-management/useScoreManagement';
import { useScoreManagementAPI } from '@/hooks/score-management/useScoreManagementAPI';
import { useScoreManagementFilters } from '@/hooks/score-management/useScoreManagementFilters';
import { useScoreEditForm } from '@/hooks/score-management/useScoreEditForm';
import { useScoreConfigForm } from '@/hooks/score-management/useScoreConfigForm';
import { useScoreImportForm } from '@/hooks/score-management/useScoreImportForm';
import {
  ScoreManagementHeader,
  ClassSelector,
  ScoreTableHeader,
  ConfigEditorModal,
  AddColumnModal,
  ScoreTable,
  ScoreEditModal,
  ImportPreviewModal,
  NoScoreConfigState,
  ClassSelectorSkeleton,
  ScoreTableSkeleton,
} from '@/components/score-management';
import { exportToExcel } from '@/utils/excelScoreExport';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';

export default function ScoreManagement() {
  // Use new hooks for data layer and UI state
  const api = useScoreManagementAPI();
  const filters = useScoreManagementFilters();
  const editForm = useScoreEditForm();
  const configForm = useScoreConfigForm();
  const importForm = useScoreImportForm();

  const [selectedClassSubject, setSelectedClassSubject] = useState<any>(null);

  const gradeEditLocked = api.teacherInfo?.grade_edit_locked === true;

  // Keep minimal hook for confirm dialog and template download
  const {
    confirmState,
    closeConfirm,
    openConfirm,
    handleDownloadTemplate: downloadTemplateRaw,
  } = useScoreManagement(selectedClassSubject?.id);

  const handleDownloadTemplate = () => {
    if (gradeEditLocked) {
      toast.error('Đã quá hạn chỉnh sửa bảng điểm. Liên hệ quản trị nếu cần ngoại lệ.');
      return;
    }
    downloadTemplateRaw();
  };

  // Refetch teacher info when academic year or semester changes
  useEffect(() => {
    api.fetchTeacherInfo(filters.academicYear, filters.semester);
  }, [filters.academicYear, filters.semester]);

  // Wrap API class select to handle filters
  const handleClassSubjectSelect = async (classSubject: any) => {
    setSelectedClassSubject(classSubject);
    filters.resetPagination();
    await api.handleClassSubjectSelect(classSubject, filters.academicYear, filters.semester);
  };

  // Handle export
  const handleExportToExcelClick = async () => {
    if (!selectedClassSubject || !api.scoreConfig) {
      toast.error('Vui lòng chọn lớp và có cấu hình điểm!');
      return;
    }

    await exportToExcel(
      api.students,
      api.scoreConfig,
      selectedClassSubject,
      filters.academicYear,
      filters.semester,
      api.getDisplayColumns,
    );
  };

  // Handle file upload - connect to import form
  const handleFileUploadWithForm = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (gradeEditLocked) {
      toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
      event.target.value = '';
      return;
    }
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
    if (gradeEditLocked) {
      toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
      return;
    }
    await api.handleConfirmImport(
      selectedClassSubject,
      filters.academicYear,
      filters.semester,
      importForm.importedData,
      async () => {
        await api.handleClassSubjectSelect(selectedClassSubject, filters.academicYear, filters.semester);
        importForm.resetImportForm();
      }
    );
  };

  // Paginate students based on current page/pageSize
  const paginatedStudents = api.students.slice(
    (filters.currentPage - 1) * filters.pageSize,
    filters.currentPage * filters.pageSize
  );

  // Error state - only block if teacher info fails to load
  if (!api.loading && !api.teacherInfo) {
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
    <div className="min-h-screen p-6 space-y-6">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card - Always visible, with loading skeleton controls if needed */}
        <ScoreManagementHeader
          academicYear={filters.academicYear}
          semester={filters.semester}
          ACADEMIC_YEARS={ACADEMIC_YEAR_OPTIONS}
          SEMESTERS={SEMESTERS}
          onAcademicYearChange={filters.setAcademicYear}
          onSemesterChange={filters.setSemester}
          loading={api.loading && !api.teacherInfo}
          isFilterLocked={!!selectedClassSubject}
        />

        {/* Class Selector - Skeleton on init, content when ready */}
        {api.loading && api.students.length === 0 && !selectedClassSubject ? (
          <ClassSelectorSkeleton />
        ) : !selectedClassSubject ? (
          <ClassSelector
            assignedClasses={api.teacherInfo?.assigned_classes || []}
            academicYear={filters.academicYear}
            onSelect={handleClassSubjectSelect}
          />
        ) : (
          <div className="space-y-6">
            {gradeEditLocked && (
              <Alert className="border-amber-200 bg-amber-50">
                <Lock className="h-4 w-4 text-amber-800" />
                <AlertDescription className="text-amber-900">
                  Bảng điểm đang khóa sửa (đã quá hạn theo cấu hình hệ thống hoặc bạn chưa được cấp quyền). Bạn vẫn có thể xem và xuất Excel.
                </AlertDescription>
              </Alert>
            )}
            {/* Score Table Header */}
            <ScoreTableHeader
              selectedClassSubject={selectedClassSubject}
              academicYear={filters.academicYear}
              semester={filters.semester}
              hasScoreConfig={!!api.scoreConfig}
              gradeEditLocked={gradeEditLocked}
              onBack={() => setSelectedClassSubject(null)}
              onDownloadTemplate={handleDownloadTemplate}
              onFileUpload={handleFileUploadWithForm}
              onExportToExcel={handleExportToExcelClick}
              onImportSuccess={() => handleClassSubjectSelect(selectedClassSubject)}
            />

            {/* Config Editor Modal */}
            <ConfigEditorModal
              open={configForm.showConfigEditor}
              onOpenChange={(open) => {
                if (open && gradeEditLocked) {
                  toast.error('Đã quá hạn chỉnh sửa cấu hình cột điểm.');
                  return;
                }
                configForm.setShowConfigEditor(open);
              }}
              configForm={configForm.configForm}
              onConfigInputChange={(columnName, field, value) =>
                configForm.updateConfigField(columnName, field, value)
              }
              onAddColumn={() => {
                if (gradeEditLocked) {
                  toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
                  return;
                }
                configForm.setShowAddColumnModal(true);
                configForm.resetNewColumnForm();
              }}
              onRemoveColumn={(columnName) => {
                if (gradeEditLocked) {
                  toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
                  return;
                }
                if (Object.keys(configForm.configForm).length <= 1) {
                  toast.error('Phải có ít nhất một cột điểm!');
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
                if (gradeEditLocked) {
                  toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
                  return;
                }
                if (Object.keys(configForm.configForm).length === 0) {
                  toast.error('Phải có ít nhất một cột điểm!');
                  return;
                }

                const invalidColumns = Object.keys(configForm.configForm).filter(
                  (columnName) => {
                    const column = configForm.configForm[columnName];
                    return !column.label || !column.he_so || column.he_so < 1 || column.he_so > 10;
                  }
                );

                if (invalidColumns.length > 0) {
                  toast.error('Vui lòng điền đầy đủ thông tin cho tất cả các cột điểm.');
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
                    api.handleClassSubjectSelect(selectedClassSubject, filters.academicYear, filters.semester);
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
                if (gradeEditLocked) {
                  toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
                  return;
                }
                if (configForm.newColumnForm.name && configForm.newColumnForm.label) {
                  const validName = configForm.newColumnForm.name
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '');

                  if (!validName) {
                    toast.error(
                      'Tên cột không hợp lệ. Chỉ được sử dụng chữ cái, số và dấu gạch dưới.'
                    );
                    return;
                  }

                  if (configForm.configForm[validName]) {
                    toast.error('Cột điểm này đã tồn tại!');
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
                  toast.error('Vui lòng điền đầy đủ thông tin!');
                }
              }}
            />

            {/* Score Table or Skeleton */}
            {api.loading && api.students.length === 0 ? (
              <ScoreTableSkeleton />
            ) : api.scoreConfig ? (
              <ScoreTable
                students={paginatedStudents}
                totalStudents={api.students.length}
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
                gradeEditLocked={gradeEditLocked}
              />
            ) : (
              <NoScoreConfigState
                gradeEditLocked={gradeEditLocked}
                onCreateConfig={() => {
                  if (gradeEditLocked) {
                    toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
                    return;
                  }
                  configForm.initializeConfigEditor(api.scoreConfig?.score_column_config);
                }}
              />
            )}
          </div>
        )}

        {/* Score Edit Modal */}
        <ScoreEditModal
          open={!!editForm.editingStudent}
          onOpenChange={() => editForm.resetForm()}
          editingStudent={editForm.editingStudent}
          scoreConfig={api.scoreConfig}
          scoreForm={editForm.scoreForm}
          onScoreInputChange={(columnName, value) => editForm.updateScoreField(columnName, value, api.scoreConfig?.score_column_config?.is_char === "TRUE" || api.scoreConfig?.score_column_config?.is_char === true)}
          isChar={api.scoreConfig?.score_column_config?.is_char === "TRUE" || api.scoreConfig?.score_column_config?.is_char === true}
          onSaveScore={() => {
            if (gradeEditLocked) {
              toast.error('Đã quá hạn chỉnh sửa bảng điểm.');
              return;
            }
            api.handleSaveScore(
              editForm.editingStudent,
              selectedClassSubject,
              filters.academicYear,
              filters.semester,
              editForm.scoreForm,
              () => {
                api.handleClassSubjectSelect(selectedClassSubject, filters.academicYear, filters.semester);
                editForm.resetForm();
              }
            );
          }}
          getDisplayColumns={api.getDisplayColumns}
          readOnly={gradeEditLocked}
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
