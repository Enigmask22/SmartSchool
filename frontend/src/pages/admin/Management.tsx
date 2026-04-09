import { useMemo, useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAdminManagement } from '@/hooks/admin-management/useAdminManagement';
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useAdminFilters } from '@/hooks/admin-management/useAdminFilters';
import { useTabCrud } from '@/hooks/admin-management/useTabCrud';
import { useAdminImport } from '@/hooks/admin-management/useAdminImport';
import { useTeacherSubjectManagement } from '@/hooks/admin-management/useTeacherSubjectManagement';
import { useScoreColumnManagement } from '@/hooks/admin-management/useScoreColumnManagement';
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
import SystemSettings from '@/components/admin-management/SystemSettings';
import CameraManagement from '@/components/admin-management/CameraManagement';

const AdminManagement = () => {
  const hook = useAdminManagement();
  const search = useAdminSearch();
  const filters = useAdminFilters();
  const tabCrud = useTabCrud(hook.activeTab, search.showDeleted);
  const importHook = useAdminImport(() => hook.loadData());
  const teacherSubjectHook = useTeacherSubjectManagement(tabCrud.editingItem, tabCrud.showAddForm, hook.activeTab);
  const scoreColumnHook = useScoreColumnManagement();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleTabClick = (tabId: string) => {
    hook.setActiveTab(tabId);
    // Reset form and search states when switching tabs
    tabCrud.setShowAddForm(false);
    tabCrud.setEditingItem(null);
    search.setSearchTerm('');
    search.setShowDeleted(false);
  };

  const handleAddNew = () => {
    tabCrud.setShowAddForm(true);
    if (hook.activeTab === 'teachers') {
      hook.setFormData({ gender: 'Nam' });
    } else if (hook.activeTab === 'score_settings' || hook.activeTab === 'subjects') {
      hook.setFormData({});
      scoreColumnHook.setScoreColumns([]);
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

      // Remove duplicates by ID and sort by ID
      const uniqueMap = new Map<number, any>();
      result.forEach((item: any) => {
        if (item.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      const dedupedSorted = Array.from(uniqueMap.values()).sort((a: any, b: any) => a.id - b.id);

      // Debug logging
      // console.log(`[Management] filteredDataMemo for tab ${hook.activeTab}:`, {
      //   totalData: hook.data.length,
      //   afterFilter: result.length,
      //   afterDedup: dedupedSorted.length,
      //   ids: dedupedSorted.map((item: any) => item.id),
      //   data: dedupedSorted,
      // });

      return dedupedSorted;
    },
    [hook.filteredData, hook.data, search.searchTerm, filters.selectedAcademicYear, filters.selectedGrade, filters.selectedClassId, filters.classes, search.showDeleted]
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

  return (
    <div className="min-h-screen p-6 bg-background space-y-6">
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
                  <CardDescription>Quản lý và cấu hình dữ liệu hệ thống</CardDescription>
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
              />
            </CardHeader>

            {/* Add Form Section */}
            {tabCrud.showAddForm && (
              <CardContent className="border-y bg-muted/30 py-6 mb-3">
                <div className="mb-4">
                  <h3 className="mb-2 text-lg font-semibold">Thông tin mới</h3>
                  <p className="text-sm text-muted-foreground">Nhập thông tin để tạo bản ghi mới</p>
                </div>
                <AdminManagementForm 
                  hook={hook} 
                  teacherSubjectHook={teacherSubjectHook}
                  scoreColumnHook={scoreColumnHook}
                  isEdit={false}
                  onCancel={() => {
                    tabCrud.setShowAddForm(false);
                    tabCrud.setEditingItem(null);
                    teacherSubjectHook.setSelectedSubjects([]);
                    scoreColumnHook.setScoreColumns([]);
                  }}
                />
              </CardContent>
            )}

            {/* Data Table */}
            <CardContent>
              <AdminTable
                hook={hook}
                filteredData={paginatedData}
                isLoading={hook.loading}
                error={hook.error}
                onRetry={hook.loadData}
                scoreColumnHook={scoreColumnHook}
                searchTerm={search.searchTerm}
                search={search}
              />
            </CardContent>
          </Card>

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