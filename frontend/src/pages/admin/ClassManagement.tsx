import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Users, ChevronLeft } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import api from '@/utils/api';
import logger from '@/utils/logger';
import { toast } from 'sonner';
import { useClassManagementAPI, type ClassInfo } from '@/hooks/class-management/useClassManagementAPI';
import { useClassManagementStudentOps } from '@/hooks/class-management/useClassManagementStudentOps';
import { useClassManagementDialog } from '@/hooks/class-management/useClassManagementDialog';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { PageHeader } from '@/components/common/PageHeader';
import { ACADEMIC_YEAR_OPTIONS } from '@/utils/constants';
import {
  ClassManagementSelector,
  StudentsTableCard,
  AddStudentModal,
  ImportModal,
  EditStudentModal,
  MoveClassModal,
  ClassManagementTabNavigation,
  AssignToClassModal,
} from '@/components/class-management';

export default function ClassManagement() {
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
  const selectedClassRef = useRef<ClassInfo | null>(null);

  // Keep refs in sync with state to avoid stale closure issues
  useEffect(() => {
    selectedClassRef.current = selectedClass;
  }, [selectedClass]);

  // Student data
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);

  // Ref for showInactive to avoid stale closure
  const showInactiveRef = useRef(showInactiveStudents);
  useEffect(() => {
    showInactiveRef.current = showInactiveStudents;
  }, [showInactiveStudents]);

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

  // ===== Tab State (NEW) =====
  const [activeTab, setActiveTab] = useState<'profiles' | 'distribution'>('distribution');

  // ===== Tab 1 (Profiles) State (NEW) =====
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);
  const [sortState, setSortState] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'student_id',
    direction: 'asc',
  });
  const [profilesFilters, setProfilesFilters] = useState({
    grade: '',
    status: 'active', // 'active', 'inactive', 'all'
  });
  const [assignToClassModalOpen, setAssignToClassModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState<any>(null);
  const [profilesPage, setProfilesPage] = useState(1);
  const [profilesPageSize, setProfilesPageSize] = useState(10);

  // ===== Add Student Modal - Available Classes State (NEW) =====
  const [addStudentAvailableClasses, setAddStudentAvailableClasses] = useState<ClassInfo[]>([]);
  const [addStudentLoadingClasses, setAddStudentLoadingClasses] = useState(false);

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
    handleRemoveFromClass: hookHandleRemoveFromClass,
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
    loadAllStudents: hookLoadAllStudents,
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

  // ===== Fetch classes for Add Student Modal when academic_year or grade changes =====
  useEffect(() => {
    const fetchAddStudentClasses = async () => {
      if (!studentFormData.academic_year) {
        setAddStudentAvailableClasses([]);
        return;
      }

      setAddStudentLoadingClasses(true);
      try {
        const response = await api.request(
          `/admin/classes?academic_year=${encodeURIComponent(studentFormData.academic_year)}`
        );
        if (response.success && response.data) {
          setAddStudentAvailableClasses(response.data);
        } else {
          setAddStudentAvailableClasses([]);
        }
      } catch (err) {
        logger.error('Error fetching classes for add student modal:', err);
        setAddStudentAvailableClasses([]);
      } finally {
        setAddStudentLoadingClasses(false);
      }
    };

    fetchAddStudentClasses();
  }, [studentFormData.academic_year]);

  // ===== Initialize academic_year when add student modal opens =====
  useEffect(() => {
    if (showAddStudentModal && !studentFormData.academic_year && settings?.academic_year) {
      handleStudentFormChange('academic_year', settings.academic_year);
    }
  }, [showAddStudentModal]);

  // ===== Load class students =====
  // Using refs to avoid stale closure issues when called from dialog callbacks
  const loadClassStudents = useCallback(async () => {
    const currentClass = selectedClassRef.current;
    const showInactive = showInactiveRef.current;
    logger.debug('[loadClassStudents] Called, selectedClass:', currentClass?.id, 'showInactive:', showInactive);
    if (!currentClass) {
      logger.debug('[loadClassStudents] No class selected, returning early');
      return;
    }

    setLoadingClassStudents(true);
    setCurrentPage(1);

    try {
      const response = await api.request(
        `/admin/classes/${currentClass.id}/students`,
      );
      logger.debug('[loadClassStudents] API response:', response.success, 'data count:', response.data?.length);
      if (response.success) {
        let students = response.data || [];
        logger.debug('[loadClassStudents] Before filter - total students:', students.length);

        if (showInactive) {
          students = students.filter((student: any) => student.is_active === false);
        } else {
          students = students.filter((student: any) => student.is_active !== false);
        }
        logger.debug('[loadClassStudents] After filter - active students:', students.length);

        students = students.sort((a: any, b: any) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });

        logger.debug('[loadClassStudents] Setting classStudents state with', students.length, 'students');
        setClassStudents(students);

        // Update student form data
        setStudentFormData((prev) => ({
          ...prev,
          class_name: currentClass.class_name || '',
          grade: String(currentClass.grade || ''),
          class_id: currentClass.id,
        }));
      }
    } catch (err) {
      logger.error('Error loading class students:', err);
    } finally {
      setLoadingClassStudents(false);
    }
  // Empty deps - function never recreates, always reads latest values from refs
  }, []);

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
      // Reload appropriate table based on active tab
      if (activeTab === 'profiles') {
        loadAllStudents();
      } else {
        loadClassStudents();
      }
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

  // ===== Reset profiles pagination on search/filter change (Tab 1) =====
  useEffect(() => {
    setProfilesPage(1);
  }, [searchTerm, profilesFilters]);

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

  // (Wrapper functions moved after loadAllStudents definition)

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
      // Call appropriate reload function based on active tab
      if (activeTab === 'profiles') {
        loadAllStudents();
      } else {
        loadClassStudents();
      }
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

  // ===== Tab 1 (Profiles) Methods (NEW) =====
  const loadAllStudents = useCallback(async () => {
    setLoadingAllStudents(true);
    try {
      const students = await hookLoadAllStudents();
      setAllStudents(students);
    } finally {
      setLoadingAllStudents(false);
    }
  }, [hookLoadAllStudents]);

  // ===== Wrapper functions for delete operations =====
  // Using useCallback with empty deps since loadClassStudents is stable (reads from refs)
  const handleDeleteStudentWrapper = useCallback((id: number) => {
    logger.debug('[handleDeleteStudentWrapper] Called, activeTab:', activeTab, 'selectedClassRef.current:', selectedClassRef.current?.id);
    hookHandleDeleteStudent(id, openConfirm, closeConfirm, () => {
      logger.debug('[handleDeleteStudentWrapper] onSuccess callback invoked, activeTab:', activeTab);
      // Call the appropriate reload function based on which tab is active
      if (activeTab === 'profiles') {
        logger.debug('[handleDeleteStudentWrapper] Profiles tab - calling loadAllStudents');
        loadAllStudents();
      } else if (activeTab === 'distribution' && selectedClassRef.current) {
        logger.debug('[handleDeleteStudentWrapper] Distribution tab - calling loadClassStudents');
        loadClassStudents();
      }
    });
  }, [hookHandleDeleteStudent, openConfirm, closeConfirm, loadClassStudents, loadAllStudents, activeTab]);

  const handleRemoveFromClassWrapper = useCallback((id: number) => {
    const currentClass = selectedClassRef.current;
    if (!currentClass) return;
    hookHandleRemoveFromClass(id, currentClass.id, openConfirm, closeConfirm, loadClassStudents);
  }, [hookHandleRemoveFromClass, openConfirm, closeConfirm, loadClassStudents]);

  const handlePermanentDeleteStudentWrapper = useCallback((id: number, name: string) => {
    logger.debug('[handlePermanentDeleteStudentWrapper] Called, activeTab:', activeTab, 'selectedClassRef.current:', selectedClassRef.current?.id);
    hookHandleDeletePermanent(id, name, openConfirm, closeConfirm, () => {
      logger.debug('[handlePermanentDeleteStudentWrapper] onSuccess callback invoked, activeTab:', activeTab);
      // Call the appropriate reload function based on which tab is active
      if (activeTab === 'profiles') {
        logger.debug('[handlePermanentDeleteStudentWrapper] Profiles tab - calling loadAllStudents');
        loadAllStudents();
      } else if (activeTab === 'distribution' && selectedClassRef.current) {
        logger.debug('[handlePermanentDeleteStudentWrapper] Distribution tab - calling loadClassStudents');
        loadClassStudents();
      }
    });
  }, [hookHandleDeletePermanent, openConfirm, closeConfirm, loadClassStudents, loadAllStudents, activeTab]);

  // Filter and sort students for Tab 1
  const filteredProfilesStudents = useMemo(() => {
    let filtered = allStudents;

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.student_id?.toLowerCase().includes(searchLower) ||
          s.full_name?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower) ||
          s.phone?.toLowerCase().includes(searchLower)
      );
    }

    // Apply grade filter
    if (profilesFilters.grade) {
      filtered = filtered.filter((s) => String(s.grade) === String(profilesFilters.grade));
    }

    // Apply status filter
    if (profilesFilters.status === 'active') {
      filtered = filtered.filter((s) => s.is_active !== false);
    } else if (profilesFilters.status === 'inactive') {
      filtered = filtered.filter((s) => s.is_active === false);
    }

    // Apply sorting
    if (sortState.field) {
      filtered.sort((a, b) => {
        let aVal = a[sortState.field] || '';
        let bVal = b[sortState.field] || '';

        // Handle numeric fields
        if (sortState.field === 'student_id') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        } else if (sortState.field === 'grade') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        } else {
          // String comparison
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allStudents, searchTerm, profilesFilters, sortState]);

  // Paginate profiles students
  const profilesTotalPages = Math.ceil(filteredProfilesStudents.length / profilesPageSize);
  const profilesStartIndex = (profilesPage - 1) * profilesPageSize;
  const profilesEndIndex = profilesStartIndex + profilesPageSize;
  const paginatedProfilesStudents = filteredProfilesStudents.slice(
    profilesStartIndex,
    profilesEndIndex
  );

  // Handle tab switch
  const handleTabSwitch = (tab: 'profiles' | 'distribution') => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
    setProfilesPage(1);

    if (tab === 'profiles') {
      // Load all students when switching to profiles tab
      if (allStudents.length === 0) {
        loadAllStudents();
      }
    } else {
      // Reset distribution tab state
      setSelectedClass(null);
      setClassStudents([]);
      setSelectedStudentIds([]);
    }
  };

  // Handle sort
  const handleSort = (field: string) => {
    setSortState((prev) => {
      if (prev.field === field) {
        // Toggle direction if same field
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // New field, default to asc
      return { field, direction: 'asc' };
    });
  };

  // Handle profiles filter change
  const handleProfilesFilterChange = (filterName: string, value: any) => {
    setProfilesFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setProfilesPage(1); // Reset to first page when filter changes
  };

  // Handle assign to class
  const handleOpenAssignModal = (student: any) => {
    setSelectedStudentForAssign(student);
    setAssignToClassModalOpen(true);
  };

  // Callback after successful assignment
  const handleAssignSuccess = () => {
    // Reload all students to refresh class_name
    loadAllStudents();
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50 space-y-6" style={{ overflow: 'visible' }}>
      {/* Page Header */}
      <PageHeader
        title="Quản lý học sinh"
        description="Quản lý thông tin học sinh và phân bổ các lớp học"
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-amber-500 flex-shrink-0">
            <Users className="w-8 h-8 text-white" />
          </div>
        }
      />

      <div className="space-y-6">
      {/* Tab Navigation */}
      <ClassManagementTabNavigation activeTab={activeTab} onTabClick={handleTabSwitch} />

      {/* Tab 1: Student Profiles */}
      {activeTab === 'profiles' ? (
        <StudentsTableCard
          selectedClassForManagement={null}
          loadingClassData={loadingAllStudents}
          error={null}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          paginatedStudents={paginatedProfilesStudents}
          totalStudents={filteredProfilesStudents.length}
          currentPage={profilesPage}
          setCurrentPage={setProfilesPage}
          classManagementPageSize={profilesPageSize}
          setClassManagementPageSize={setProfilesPageSize}
          totalPages={profilesTotalPages}
          selectedStudentIds={selectedStudentIds}
          setSelectedStudentIds={setSelectedStudentIds}
          restoreLoading={restoreLoading}
          downloadStudentTemplate={downloadStudentTemplate}
          handleFileUpload={handleFileUpload}
          onAddStudent={() => setShowAddStudentModal(true)}
          onMoveClass={() => {}}
          loadClassStudents={loadAllStudents}
          handleEditStudent={handleEditStudent}
          onEditStudent={() => setShowEditModal(true)}
          handleDeleteStudent={handleDeleteStudentWrapper}
          handleRemoveFromClass={undefined}
          handleRestore={handleRestore}
          handlePermanentDeleteStudent={handlePermanentDeleteStudentWrapper}
          showInactiveStudents={profilesFilters.status !== 'active'}
          setShowInactiveStudents={(show) => {
            handleProfilesFilterChange('status', show ? 'all' : 'active');
          }}
          initialLoading={false}
          tabMode="profiles"
          sortState={sortState}
          onSort={handleSort}
          onAssignToClass={handleOpenAssignModal}
          profilesGradeFilter={profilesFilters.grade}
          onProfilesGradeFilterChange={(value) => handleProfilesFilterChange('grade', value)}
          onProfilesClearFilters={() => {
            handleProfilesFilterChange('grade', '');
            handleProfilesFilterChange('status', 'active');
            setSearchTerm('');
          }}
          profilesFilterStatus={profilesFilters.status as 'active' | 'inactive' | 'all'}
          onProfilesFilterStatusChange={(status) => handleProfilesFilterChange('status', status)}
        />
      ) : selectedClass ? (
        // Tab 2: Class Selected - Show Students Management
        <div className="space-y-4">
          {/* Back Button & Class Info */}
          <div className="flex items-center gap-3 p-4 border bg-white rounded-lg shadow-md">
            <button
              onClick={handleBackToClassSelector}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="inline-block w-4 h-4" />
              Quay lại
            </button>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {selectedClass.class_name} - Khối {selectedClass.grade}
              </h3>
              {selectedClass.teachers && (
                <p className="text-xs text-gray-600">
                  Chủ nhiệm: {selectedClass.teachers.full_name}
                </p>
              )}
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
                  handleRemoveFromClass={handleRemoveFromClassWrapper}
                  handleRestore={handleRestore}
                  handlePermanentDeleteStudent={handlePermanentDeleteStudentWrapper}
                  showInactiveStudents={showInactiveStudents}
                  setShowInactiveStudents={setShowInactiveStudents}
            tabMode="distribution"
          />
        </div>
      ) : (
        // Tab 2: Class Not Selected - Show Class Selector
        <ClassManagementSelector
          classes={displayedClasses}
          selectedGrade={selectedGrade}
          academicYear={selectedAcademicYear}
          onSelect={handleClassSelect}
          loading={apiHook.loading}
          academicYearOptions={ACADEMIC_YEAR_OPTIONS}
          onAcademicYearChange={setSelectedAcademicYear}
          onGradeChange={setSelectedGrade}
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
        academicYearOptions={ACADEMIC_YEAR_OPTIONS}
        availableClasses={addStudentAvailableClasses}
        loadingClasses={addStudentLoadingClasses}
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
        currentClass={selectedClass}
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
            // Refetch classes to update student counts in ClassManagementSelector
            apiHook.fetchClasses(selectedAcademicYear);
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

        {/* Assign To Class Modal (NEW) */}
        <AssignToClassModal
          open={assignToClassModalOpen}
          onOpenChange={setAssignToClassModalOpen}
          student={selectedStudentForAssign}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </div>
  );
};
