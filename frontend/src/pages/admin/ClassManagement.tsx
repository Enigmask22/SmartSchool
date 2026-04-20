import { useState, useEffect, useCallback } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';
import { useClassManagementAPI, type ClassInfo } from '@/hooks/class-management/useClassManagementAPI';
import { useClassManagementStudentOps } from '@/hooks/class-management/useClassManagementStudentOps';
import { useClassManagementDialog } from '@/hooks/class-management/useClassManagementDialog';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import Header from '@/components/class-management/Header';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import {
  ClassManagementSelector,
  StudentsTableCard,
  AddStudentModal,
  ImportModal,
  EditStudentModal,
  MoveClassModal,
} from '@/components/class-management';

const ClassManagement = () => {
  // ===== State Management =====
  // Filters - use default academic year from settings
  const { settings } = useSystemSettings();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');

  // Set academic year from settings when they load
  useEffect(() => {
    if (settings?.academic_year) {
      setSelectedAcademicYear(settings.academic_year);
    }
  }, [settings?.academic_year]);

  const [selectedGrade, setSelectedGrade] = useState<string>('10');
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

  // Student data
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  // Modal visibility
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Move class state
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [moveYear, setMoveYear] = useState('');
  const [moveGrade, setMoveGrade] = useState('');
  const [moveTargetClassId, setMoveTargetClassId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveYearClasses, setMoveYearClasses] = useState<ClassInfo[]>([]);

  // Edit modal state
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null);

  // ===== API & Dialog Hooks =====
  const apiHook = useClassManagementAPI();
  const {
    studentFormData,
    setStudentFormData,
    studentFormErrors,
    studentFormLoading,
    handleStudentFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    handleSubmitStudentForm,
    handleCloseAddStudentModal,
    editForm,
    setEditForm,
    editLoading,
    handleEditFormChange,
    addParentContactRowEdit,
    removeParentContactRowEdit,
    updateParentContactFieldEdit,
    handleEditStudent,
    submitEditForm: hookSubmitEditForm,
    handleDeleteStudent: hookHandleDeleteStudent,
    handlePermanentDeleteStudent: hookHandleDeletePermanent,
    handleRestore,
    restoreLoading,
    importedData,
    importErrors,
    importLoading,
    downloadStudentTemplate,
    handleFileUpload,
    handleConfirmImport,
    handleCloseImportModal,
  } = useClassManagementStudentOps(selectedAcademicYear, selectedClass?.id);
  const { confirmState, openConfirm, closeConfirm } = useClassManagementDialog();

  // ===== Initialize data on mount =====
  useEffect(() => {
    apiHook.fetchAcademicYears();
  }, []);

  // ===== Fetch classes when academic year changes =====
  useEffect(() => {
    if (selectedAcademicYear) {
      apiHook.fetchClasses(selectedAcademicYear);
      setSelectedClass(null);
      setClassStudents([]);
      setCurrentPage(1);
    }
  }, [selectedAcademicYear]);

  // ===== Fetch classes for move modal when moveYear changes =====
  useEffect(() => {
    if (moveYear && moveYear !== selectedAcademicYear) {
      const fetchMoveYearClasses = async () => {
        try {
          const response = await api.request(
            `/admin/classes?academic_year=${encodeURIComponent(moveYear)}`
          );
          if (response.success && response.data) {
            setMoveYearClasses(response.data);
          }
        } catch (err) {
          logger.error(`Error fetching classes for move year ${moveYear}:`, err);
          setMoveYearClasses([]);
        }
      };
      fetchMoveYearClasses();
    } else if (moveYear === selectedAcademicYear) {
      // Use main classes if same year
      setMoveYearClasses(apiHook.classes);
    } else {
      setMoveYearClasses([]);
    }
  }, [moveYear, selectedAcademicYear, apiHook.classes]);

  // ===== Update academic year when settings load =====
  useEffect(() => {
    // Update to settings value whenever it becomes available (loaded from context)
    if (settings?.defaultAcademicYear) {
      logger.debug('ClassManagement - Updating to settings default:', settings.defaultAcademicYear);
      setSelectedAcademicYear(settings.defaultAcademicYear);
    }
  }, [settings?.defaultAcademicYear]);

  // ===== Load class students =====
  const loadClassStudents = useCallback(async () => {
    if (!selectedClass) return;

    setLoadingClassStudents(true);
    setCurrentPage(1);

    try {
      const response = await api.request(
        `/admin/classes/${selectedClass.id}/students`,
      );
      if (response.success) {
        let students = response.data || [];

        if (showInactiveStudents) {
          students = students.filter((student: any) => student.is_active === false);
        } else {
          students = students.filter((student: any) => student.is_active !== false);
        }

        students = students.sort((a: any, b: any) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        setClassStudents(students);

        // Update student form data
        setStudentFormData((prev) => ({
          ...prev,
          class_name: selectedClass.class_name || '',
          grade: String(selectedClass.grade || ''),
          class_id: selectedClass.id,
        }));
      }
    } catch (err) {
      logger.error('Error loading class students:', err);
    } finally {
      setLoadingClassStudents(false);
    }
  }, [selectedClass, showInactiveStudents, setStudentFormData]);

  // ===== Auto-open import modal when data is imported =====
  useEffect(() => {
    if (importedData.length > 0) {
      setShowImportModal(true);
    }
  }, [importedData.length]);

  // ===== Handle import confirmation =====
  const handleImportConfirmation = () => {
    handleConfirmImport(() => {
      setShowImportModal(false);
      loadClassStudents();
    });
  };

  // ===== Load students when class is selected =====
  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
    }
  }, [selectedClass, loadClassStudents]);

  // ===== Reset pagination on search change =====
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ===== Handle class selection =====
  const handleClassSelect = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
  };

  // ===== Handle go back to class selector =====
  const handleBackToClassSelector = () => {
    setSelectedClass(null);
    setClassStudents([]);
    setSelectedStudentIds([]);
    setSearchTerm('');
    setCurrentPage(1);
  };

  // ===== Wrapper functions for delete operations =====
  const handleDeleteStudentWrapper = (id: number) => {
    hookHandleDeleteStudent(id, openConfirm, closeConfirm, loadClassStudents);
  };

  const handlePermanentDeleteStudentWrapper = (id: number, name: string) => {
    hookHandleDeletePermanent(id, name, openConfirm, closeConfirm, loadClassStudents);
  };

  // ===== Submit edit form =====
  const submitEditFormWrapper = () => {
    return hookSubmitEditForm(() => {
      closeEditModal();
      setShowEditModal(false);
      setSelectedStudentForEdit(null);
      setEditForm({});
      loadClassStudents();
    });
  };

  // ===== Handle add student submit =====
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitStudentForm(() => {
      setShowAddStudentModal(false);
      loadClassStudents();
    }, selectedAcademicYear);
  };

  // ===== Close edit modal =====
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

  // ===== Computed values =====
  const filteredStudents = classStudents.filter((student) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.student_id?.toLowerCase().includes(searchLower) ||
      student.class_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // ===== Get displayed classes by grade =====
  const displayedClasses = apiHook.filterClassesByGrade(selectedGrade);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header with Filters */}
      <Header
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        academicYears={ACADEMIC_YEAR_OPTIONS}
        loading={apiHook.academicYears.length === 0}
      />

      {/* Main Content */}
      {selectedClass ? (
        // Class Selected - Show Students Management
        <div className="space-y-6">
          {/* Back Button & Class Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToClassSelector}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Quay lại
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedClass.class_name} - Khối {selectedClass.grade}
                </h2>
                {selectedClass.teachers && (
                  <p className="text-sm text-gray-600">
                    Chủ nhiệm: {selectedClass.teachers.full_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Students Table */}
          <StudentsTableCard
            selectedClassForManagement={String(selectedClass.id)}
            loadingClassData={loadingClassStudents}
            error={null}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            paginatedStudents={paginatedStudents}
            totalStudents={totalStudents}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            classManagementPageSize={pageSize}
            setClassManagementPageSize={setPageSize}
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
            onEditStudent={() => setShowEditModal(true)}
            handleDeleteStudent={handleDeleteStudentWrapper}
            handleRestore={handleRestore}
            handlePermanentDeleteStudent={handlePermanentDeleteStudentWrapper}
            showInactiveStudents={showInactiveStudents}
            setShowInactiveStudents={setShowInactiveStudents}
          />
        </div>
      ) : (
        // Class Not Selected - Show Class Selector
        <ClassManagementSelector
          classes={displayedClasses}
          selectedGrade={selectedGrade}
          academicYear={selectedAcademicYear}
          onSelect={handleClassSelect}
          loading={apiHook.loading}
          downloadStudentTemplate={downloadStudentTemplate}
          handleFileUpload={handleFileUpload}
          onAddStudent={() => setShowAddStudentModal(true)}
        />
      )}

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
        onSubmit={handleAddStudentSubmit}
        onClose={handleCloseAddStudentModal}
      />

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        importedData={importedData}
        importErrors={importErrors}
        importLoading={importLoading}
        onConfirmImport={handleImportConfirmation}
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
        onSubmit={submitEditFormWrapper}
        onClose={() => {
          setShowEditModal(false);
          setSelectedStudentForEdit(null);
          setEditForm({});
        }}
      />

      {/* Move Class Modal */}
      <MoveClassModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        moveYear={moveYear}
        setMoveYear={setMoveYear}
        moveGrade={moveGrade}
        setMoveGrade={setMoveGrade}
        moveTargetClassId={moveTargetClassId}
        setMoveTargetClassId={setMoveTargetClassId}
        moveLoading={moveLoading}
        academicYears={apiHook.academicYears}
        moveYearClasses={moveYearClasses}
        selectedStudentIds={selectedStudentIds}
        onConfirm={async () => {
          if (!moveTargetClassId || !selectedClass || selectedStudentIds.length === 0) return;

          setMoveLoading(true);
          try {
            await api.moveStudentsClass(
              selectedStudentIds,
              selectedClass.id,
              parseInt(moveTargetClassId),
            );
            
            toast.success(`Chuyển lớp thành công (${selectedStudentIds.length} học sinh)`);
            
            setShowMoveModal(false);
            setSelectedStudentIds([]);
            setMoveYear('');
            setMoveGrade('');
            setMoveTargetClassId('');
            loadClassStudents();
          } catch (err) {
            const message = (err as any)?.detail || 'Lỗi khi chuyển lớp';
            toast.error(`Lỗi chuyển lớp: ${message}`);
          } finally {
            setMoveLoading(false);
          }
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
