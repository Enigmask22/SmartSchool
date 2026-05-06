import { useMemo, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAdminManagement } from '@/hooks/admin-management/useAdminManagement';
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useAdminFilters } from '@/hooks/admin-management/useAdminFilters';
import { useTabCrud } from '@/hooks/admin-management/useTabCrud';
import { useSorting } from '@/hooks/admin-management/useSorting';
import { applyFilters } from '@/hooks/admin-management/useTableFilters';
import { useSystemSettings } from '@/contexts/useSystemSettings';
import { useAdminImport } from '@/hooks/admin-management/useAdminImport';
import { useTeacherSubjectManagement } from '@/hooks/admin-management/useTeacherSubjectManagement';
import { useScoreColumnManagement } from '@/hooks/admin-management/useScoreColumnManagement';
import { useClassSelection } from '@/hooks/admin-management/useClassSelection';
import { PageHeader } from '@/components/common/PageHeader';
import { AdminManagementForm } from '../../components/admin-management/AdminManagementForm';
import { TabNavigation } from '../../components/admin-management/TabNavigation';
import { SearchAndFilters } from '../../components/admin-management/SearchAndFilters';
import { ActionButtons } from '../../components/admin-management/ActionButtons';
import { AdminTable } from '../../components/admin-management/AdminTable';
import { AdminPagination } from '../../components/admin-management/AdminPagination';
import { ImportTeachersModal } from '../../components/admin-management/ImportTeachersModal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SystemSettings from '@/components/admin-management/SystemSettings';
import CameraManagement from '@/components/admin-management/CameraManagement';

const AdminManagement = () => {
  const hook = useAdminManagement();
  const search = useAdminSearch();
  const filters = useAdminFilters();
  const tabCrud = useTabCrud(hook.activeTab, hook.loadData);
  const importHook = useAdminImport(() => hook.loadData());
  // Pass hook.teacherSubjects so editing mode can pre-populate current subjects
  const teacherSubjectHook = useTeacherSubjectManagement(
    tabCrud.editingItem,
    tabCrud.showAddForm,
    hook.activeTab,
    hook.teacherSubjects
  );
  const scoreColumnHook = useScoreColumnManagement();
  const classSelectionHook = useClassSelection(
    tabCrud.editingItem,
    tabCrud.showAddForm,
    hook.activeTab
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Create form dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Sorting state
  const sorting = useSorting();

  // System settings for filter defaults
  const { settings } = useSystemSettings();
  const defaultAcademicYear = settings?.academic_year || '';
  const defaultSemester = settings?.semester || 'HK1';

  // Nested filter state - per tab
  const [tabFilters, setTabFilters] = useState(() => ({
    users: {},
    teachers: {},
    subjects: {},
    classes: { academic_year: defaultAcademicYear || '' },
    class_subjects: { academic_year: defaultAcademicYear || '', semester: defaultSemester || 'HK1' },
  }));

  const handleTabFiltersChange = (fieldName: string, value: any) => {
    setTabFilters((prev) => ({
      ...prev,
      [hook.activeTab]: {
        ...prev[hook.activeTab as keyof typeof prev],
        [fieldName]: value === 'none' || value === '' ? null : value,
      },
    }));
  };

  // const resetTabFilters = () => {
  //   setTabFilters((prev) => ({
  //     ...prev,
  //     [hook.activeTab]: {},
  //   }));
  // };

  const handleTabClick = (tabId: string) => {
    hook.setActiveTab(tabId);
    // Reset form and search states when switching tabs
    setIsCreateDialogOpen(false);
    tabCrud.setShowAddForm(false);
    tabCrud.setEditingItem(null);
    search.setSearchTerm('');
    search.setShowDeleted(false);
    // Reset sorting only, preserve tab filters with their defaults
    sorting.resetSort();
    // Reset pagination to page 1 when switching tabs
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setIsCreateDialogOpen(true);
    if (hook.activeTab === 'teachers') {
      hook.setFormData({ gender: 'Nam' });
    } else if (hook.activeTab === 'score_settings' || hook.activeTab === 'subjects') {
      hook.setFormData({});
      scoreColumnHook.setScoreColumns([]);
    } else if (hook.activeTab === 'class_subjects') {
      hook.setFormData({});
      classSelectionHook.setSelectedClasses([]);
    } else {
      hook.setFormData({});
    }
  };

  const handleImportTeachers = () => {
    importHook.setShowImportModal(true);
    importHook.loadAvailableUsers();
  };

  const filteredDataMemo = useMemo(
    () => {
      const allFiltered = hook.filteredData(hook.data, search.searchTerm, {
        academicYear: filters.selectedAcademicYear,
        grade: filters.selectedGrade,
        classId: filters.selectedClassId,
        classes: filters.classes,
      });

      // Additional filter for deleted items
      let result;
      if (search.showDeleted) {
        // Show only deleted items
        result = allFiltered.filter((item: any) => item.is_active === false);
      } else {
        // Show only active items
        result = allFiltered.filter((item: any) => item.is_active !== false);
      }

      // Remove duplicates by ID
      const uniqueMap = new Map<number, any>();
      result.forEach((item: any) => {
        if (item.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      let dedupedData = Array.from(uniqueMap.values());

      // Enrich data with related objects for filtering
      // Teachers tab: add full subject objects
      if (hook.activeTab === 'teachers') {
        if (hook.teacherSubjects && hook.subjects?.length > 0) {
          dedupedData = dedupedData.map((teacher: any) => {
            const subjectIds = hook.teacherSubjects[teacher.id] || [];
            const enrichedSubjects = subjectIds
              .map((subjectId: number) => hook.subjects.find((s: any) => s.id === subjectId))
              .filter((s: any) => s !== undefined && s !== null);
            
            return {
              ...teacher,
              subjects: enrichedSubjects,
            };
          });
        }
      }

      // Class_subjects tab: enrich with grades from classes
      if (hook.activeTab === 'class_subjects' && hook.classes?.length > 0) {
        dedupedData = dedupedData.map((item: any) => {
          // Get all class objects for this class_subject's class_ids array
          const classObjects = (item.class_ids || [])
            .map((classId: number) => hook.classes.find((c: any) => c.id === classId))
            .filter(Boolean);
          
          // Extract all grades from the classes - keep as array for multi-value filtering
          const grades = classObjects
            .map((c: any) => c.grade)
            .filter((g: any) => g !== null && g !== undefined);
          
          return {
            ...item,
            // Store as array for multi-value filtering (like subjects/classes)
            grade: grades.length > 0 ? grades : null,
          };
        });
        
        // Debug: log grade values
        // console.log('[Management] Class_subjects enrichment - Sample data with grade:', {
        //   firstItem: dedupedData[0],
        //   firstItemGrade: dedupedData[0]?.grade,
        //   firstItemGradeType: typeof dedupedData[0]?.grade,
        //   sampleGrades: dedupedData.slice(0, 5).map((item: any) => ({ 
        //     id: item.id, 
        //     class_ids: item.class_ids,
        //     grade: item.grade,
        //     gradeType: typeof item.grade
        //   })),
        // });
      }

      // Apply unified tab-specific filters
      const currentTabFilters = tabFilters[hook.activeTab as keyof typeof tabFilters];
      dedupedData = applyFilters(dedupedData, currentTabFilters, hook.activeTab);

      // Apply sorting
      dedupedData = sorting.applySorting(dedupedData);

      return dedupedData;
    },
    [hook.filteredData, hook.data, search.searchTerm, filters.selectedAcademicYear, filters.selectedGrade, filters.selectedClassId, filters.classes, search.showDeleted, tabFilters, hook.activeTab, sorting, hook.classes, hook.teacherSubjects, hook.subjects]
  );

  // Pagination calculations
  const totalItems = filteredDataMemo.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredDataMemo.slice(startIndex, endIndex);

  // Debug pagination
  // console.log(`[Management] Pagination - Page ${currentPage}:`, {
  //   totalItems,
  //   pageSize,
  //   startIndex,
  //   endIndex,
  //   paginatedDataIds: paginatedData.map((item: any) => item.id),
  // });

  // Reset to page 1 when filtered data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search.searchTerm, filters.selectedAcademicYear, filters.selectedGrade, filters.selectedClassId]);

  // Note: Academic years are now loaded from ACADEMIC_YEAR_OPTIONS constant in SearchAndFilters


  return (
    <div className="min-h-screen p-6 bg-background space-y-6 bg-gray-50" style={{ overflow: 'visible' }}>
      {/* Header Section with PageHeader */}
      <PageHeader
        title="Quản lý hệ thống"
        description="Quản lý người dùng, lớp học, môn học và cấu hình hệ thống"
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-purple-600 flex-shrink-0">
            <Settings className="w-8 h-8 text-white" />
          </div>
        }
      >
      </PageHeader>

      {/* Tab Navigation */}
      <TabNavigation activeTab={hook.activeTab} onTabClick={handleTabClick} />

      {/* Conditional Content */}
      {hook.activeTab === 'system_settings' ? (
        <SystemSettings />
      ) : hook.activeTab === 'cameras' ? (
        <CameraManagement />
      ) : (
        <>
          {/* Main Content Card */}
          <Card className="shadow-md">
            {/* Header with Title and Action Buttons */}
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle className="text-2xl font-bold mb-1">
                    {hook.currentConfig?.title || 'Quản lý'}
                  </CardTitle>
                  <CardDescription>Quản lý tài khoản người dùng trong hệ thống</CardDescription>
                </div>
                <ActionButtons
                  activeTab={hook.activeTab}
                  onAddClick={handleAddNew}
                  onImportClick={handleImportTeachers}
                  onInitializeClick={hook.handleInitializeClassSubjects}
                  showInitializeButton={hook.activeTab === 'class_subjects' && !!filters.selectedClassId}
                />
              </div>

              {/* Search and Filters */}
              <SearchAndFilters
                activeTab={hook.activeTab}
                search={search}
                filters={filters}
                tabFilters={tabFilters[hook.activeTab as keyof typeof tabFilters]}
                onTabFiltersChange={handleTabFiltersChange}
                allData={filteredDataMemo}
                subjects={hook.subjects}
                classes={hook.classes}
              />
            </CardHeader>

            {/* Data Table */}
            <CardContent>
              <AdminTable
                hook={hook}
                tabCrud={tabCrud}
                filteredData={paginatedData}
                isLoading={hook.loading}
                error={hook.error}
                onRetry={hook.loadData}
                scoreColumnHook={scoreColumnHook}
                classSelectionHook={classSelectionHook}
                searchTerm={search.searchTerm}
                search={search}
                currentPage={currentPage}
                pageSize={pageSize}
                sorting={sorting}
              />
            </CardContent>
          </Card>

          {/* Create Form Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin để tạo bản ghi mới trong hệ thống
                </DialogDescription>
              </DialogHeader>
              <AdminManagementForm
                hook={hook}
                teacherSubjectHook={teacherSubjectHook}
                scoreColumnHook={scoreColumnHook}
                classSelectionHook={classSelectionHook}
                isEdit={false}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  tabCrud.setShowAddForm(false);
                  tabCrud.setEditingItem(null);
                  teacherSubjectHook.setSelectedSubjects([]);
                  scoreColumnHook.setScoreColumns([]);
                  classSelectionHook.setSelectedClasses([]);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Pagination */}
          <AdminPagination
            totalItems={totalItems}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            loading={hook.loading}
            searchTerm={search.searchTerm}
          />

          {/* Import Teachers Modal */}
          <ImportTeachersModal
            open={importHook.showImportModal}
            onOpenChange={importHook.setShowImportModal}
            availableUsers={importHook.availableUsers}
            selectedUserIds={importHook.selectedUserIds}
            onUserSelect={importHook.handleUserSelect}
            onImport={() => importHook.handleImportTeachers([])}
            isLoading={importHook.importLoading}
          />
        </>
      )}
    </div>
  );
};

export default AdminManagement;