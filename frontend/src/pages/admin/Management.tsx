import { useMemo } from 'react';
import { useAdminManagement } from '@/hooks/useAdminManagement';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { AdminManagementForm } from '../../components/admin-management/AdminManagementForm';
import { TabNavigation } from '../../components/admin-management/TabNavigation';
import { SearchAndFilters } from '../../components/admin-management/SearchAndFilters';
import { ActionButtons } from '../../components/admin-management/ActionButtons';
import { AdminTable } from '../../components/admin-management/AdminTable';
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

  const handleTabClick = (tabId: string) => {
    hook.setActiveTab(tabId);
  };

  const handleAddNew = () => {
    hook.setShowAddForm(true);
    if (hook.activeTab === 'teachers') {
      hook.setFormData({ gender: 'Nam' });
    } else if (hook.activeTab === 'score_settings' || hook.activeTab === 'subjects') {
      hook.setFormData({});
      hook.setScoreColumns([]);
    } else {
      hook.setFormData({});
    }
  };

  const handleImportTeachers = () => {
    hook.setShowImportModal(true);
    hook.loadAvailableUsers();
  };

  const filteredDataMemo = useMemo(
    () => hook.filteredData(hook.data),
    [hook.filteredData, hook.data]
  );

  return (
    <div className="min-h-screen p-6 bg-background">
      {/* Header Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-primary">Quản lý hệ thống</CardTitle>
            <CardDescription className="text-lg">
              Quản lý người dùng, lớp học, môn học và cấu hình hệ thống
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

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
          <Card>
            {/* Header with Title and Action Buttons */}
            <CardHeader className="bg-muted/50">
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
                  showInitializeButton={hook.activeTab === 'class_subjects' && !!hook.selectedClassId}
                />
              </div>

              {/* Search and Filters */}
              <SearchAndFilters
                activeTab={hook.activeTab}
                searchTerm={hook.searchTerm}
                onSearchChange={hook.setSearchTerm}
                showDeleted={hook.showDeleted}
                onShowDeletedChange={hook.setShowDeleted}
                selectedAcademicYear={hook.selectedAcademicYear}
                onAcademicYearChange={hook.setSelectedAcademicYear}
                academicYears={hook.academicYears}
                selectedGrade={hook.selectedGrade}
                onGradeChange={hook.setSelectedGrade}
                selectedClassId={hook.selectedClassId}
                onClassIdChange={hook.setSelectedClassId}
                filteredClasses={hook.filteredClasses}
                isClassSelectDisabled={!hook.selectedAcademicYear && !hook.selectedGrade}
              />
            </CardHeader>

            {/* Add Form Section */}
            {hook.showAddForm && (
              <CardContent className="border-b bg-muted/30">
                <div className="mb-4">
                  <h3 className="mb-2 text-lg font-semibold">Thông tin mới</h3>
                  <p className="text-sm text-muted-foreground">Nhập thông tin để tạo bản ghi mới</p>
                </div>
                <AdminManagementForm hook={hook} isEdit={false} />
              </CardContent>
            )}

            {/* Data Table */}
            <CardContent>
              <AdminTable
                hook={hook}
                filteredData={filteredDataMemo}
                isLoading={hook.loading}
                error={hook.error}
                onRetry={hook.loadData}
              />
            </CardContent>
          </Card>

          {/* Import Teachers Modal */}
          <ImportTeachersModal
            open={hook.showImportModal}
            onOpenChange={hook.setShowImportModal}
            availableUsers={hook.availableUsers}
            selectedUserIds={hook.selectedUserIds}
            onUserSelect={hook.handleUserSelect}
            onImport={hook.handleImportTeachers}
            isLoading={hook.importLoading}
          />
        </>
      )}

      {/* Confirm Dialog */}
      {hook.confirmState.open && (
        <ConfirmDialog
          open={true}
          title={(hook.confirmState as any).title || ''}
          description={(hook.confirmState as any).description}
          variant={(hook.confirmState as any).variant}
          confirmText={(hook.confirmState as any).confirmText}
          cancelText={(hook.confirmState as any).cancelText}
          onCancel={hook.closeConfirm}
          onConfirm={(hook.confirmState as any).onConfirm || (() => {})}
        />
      )}
    </div>
  );
};

export default AdminManagement;
