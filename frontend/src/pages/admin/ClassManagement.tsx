import { GraduationCap } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { useClassManagementData } from '@/hooks/class-management/useClassManagementData';
import { useClassManagementStudentOps } from '@/hooks/class-management/useClassManagementStudentOps';
import { useClassManagementDialog } from '@/hooks/class-management/useClassManagementDialog';
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
  // ===== Hooks for domain logic =====
  const dataHook = useClassManagementData();
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
  } = useClassManagementStudentOps();
  const { confirmState, openConfirm, closeConfirm } = useClassManagementDialog();

  // ===== Component-level UI State =====
  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClassForManagement, setSelectedClassForManagement] = useState('');
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [classManagementPageSize, setClassManagementPageSize] = useState(10);

  // Student data
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [homeroomTeacher, setHomeroomTeacher] = useState<any>(null);
  const [loadingClassData, setLoadingClassData] = useState(false);

  // Modal visibility
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Move class state
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [moveYear, setMoveYear] = useState('');
  const [moveTargetClassId, setMoveTargetClassId] = useState('');
  const [moveLoading] = useState(false);

  // Edit modal state
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null);

  // Helper to close edit modal and reset form
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

  // Wrapper functions to adapt hook signatures to component prop expectations
  const handleDeleteStudent = (id: number) => {
    hookHandleDeleteStudent(id, openConfirm);
  };

  const handlePermanentDeleteStudent = (id: number, name: string) => {
    hookHandleDeletePermanent(id, name, openConfirm);
  };

  const submitEditForm = () => {
    return hookSubmitEditForm(() => {
      closeEditModal();
      loadClassStudents();
    });
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitStudentForm(() => {
      setShowAddStudentModal(false);
      loadClassStudents();
    });
  };

  // ===== Load filters data on mount =====
  useEffect(() => {
    dataHook.loadClasses(selectedAcademicYear, selectedGrade);
  }, [selectedAcademicYear, selectedGrade, dataHook]);

  // ===== Load class students =====
  const loadClassStudents = useCallback(async () => {
    if (!selectedClassForManagement) return;

    setLoadingClassData(true);
    setCurrentPage(1);

    try {
      const response = await api.request(
        `/admin/classes/${selectedClassForManagement}/students`,
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

        const classData = dataHook.classes.find(
          (c) => c.id === parseInt(selectedClassForManagement),
        );
        if (classData?.teachers) {
          setHomeroomTeacher(classData.teachers);
        }
      }
    } catch (err) {
      logger.error('Error loading class students:', err);
    } finally {
      setLoadingClassData(false);
    }
  }, [selectedClassForManagement, showInactiveStudents, dataHook.classes]);

  useEffect(() => {
    if (selectedClassForManagement) {
      loadClassStudents();
      const cls = dataHook.classes.find(
        (c) => c.id === parseInt(selectedClassForManagement),
      );
      if (cls) {
        setStudentFormData((prev) => ({
          ...prev,
          class_name: cls.class_name || '',
          grade: String(cls.grade || ''),
          class_id: cls.id,
        }));
      }
    }
  }, [selectedClassForManagement, dataHook.classes, setStudentFormData, loadClassStudents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ===== Computed Values =====
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
  const totalPages = Math.ceil(totalStudents / classManagementPageSize);
  const startIndex = (currentPage - 1) * classManagementPageSize;
  const endIndex = startIndex + classManagementPageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

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
        academicYears={dataHook.academicYears}
        classes={dataHook.classes}
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
        error={dataHook.error}
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
        moveClasses={dataHook.classes.filter((c) => String(c.academic_year) === moveYear)}
        moveTargetClassId={moveTargetClassId}
        setMoveTargetClassId={setMoveTargetClassId}
        moveLoading={moveLoading}
        academicYears={dataHook.academicYears}
        classes={dataHook.classes}
        selectedStudentIds={selectedStudentIds}
        onConfirm={() => {
          setShowMoveModal(false);
          setSelectedStudentIds([]);
          loadClassStudents();
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
