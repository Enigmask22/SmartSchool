import React, { useState } from 'react';
import { Edit, Trash2, Save, FileX, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useAdminForm } from '@/hooks/admin-management/useAdminForm';
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useTeacherSubjectManagement } from '@/hooks/admin-management/useTeacherSubjectManagement';
import { useScoreColumnManagement } from '@/hooks/admin-management/useScoreColumnManagement';
import { FILTER_CONFIGS } from '@/hooks/admin-management/useTableFilters';
import { renderFieldHeader, renderTableCell } from './tableHelpers';
import { AdminManagementForm } from './AdminManagementForm';
import logger from '@/utils/logger';

interface AdminTableProps {
  hook: any;
  tabCrud: any;
  filteredData: any[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  scoreColumnHook?: any;
  classSelectionHook?: any;
  searchTerm?: string;
  search?: ReturnType<typeof useAdminSearch>;
  currentPage?: number;
  pageSize?: number;
  sorting?: any;
}

export function AdminTable({
  hook,
  tabCrud: tabCrudProp,
  filteredData,
  isLoading = false,
  error = null,
  onRetry,
  searchTerm = '',
  search,
  classSelectionHook,
  currentPage = 1,
  pageSize = 10,
  sorting,
} : AdminTableProps) {
  // Use search from props or fallback to hook
  const searchState = search || useAdminSearch();
  const tabCrud = tabCrudProp; // Use tabCrud from props, not creating new instance
  const form = useAdminForm();
  const totalItems = filteredData.length;
  // Dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingItemForDialog, setEditingItemForDialog] = useState<any>(null);

  // Pass hook.teacherSubjects so the form can pre-populate currently assigned subjects
  const teacherSubjectHook = useTeacherSubjectManagement(
    tabCrud.editingItem,
    false,
    hook.activeTab,
    hook.teacherSubjects
  );
  const scoreColumnHookLocal = useScoreColumnManagement();

  const renderForm = (isEdit = false, item = null) => {
    return (
      <AdminManagementForm
        hook={hook}
        teacherSubjectHook={teacherSubjectHook}
        scoreColumnHook={scoreColumnHookLocal}
        classSelectionHook={classSelectionHook}
        isEdit={isEdit}
        item={item}
        onCancel={() => {
          setIsFormDialogOpen(false);
          setEditingItemForDialog(null);
          tabCrud.setEditingItem(null);
          teacherSubjectHook.setSelectedSubjects([]);
          scoreColumnHookLocal.setScoreColumns([]);
          classSelectionHook?.setSelectedClasses([]);
        }}
      />
    );
  };

  const handleEdit = (item: any) => {
    tabCrud.setEditingItem(item.id);
    setEditingItemForDialog(item);
    setIsFormDialogOpen(true);

    if (hook.activeTab === 'teachers') {
      logger.debug('>>> EDIT TEACHER CLICKED');
      logger.debug('>>> Original item:', item);
      const initData = {
        ...item,
        gender: item.gender || 'Nam',
        date_of_birth: item.date_of_birth || '',
      };
      form.setFormData(initData);
    } else if (hook.activeTab === 'score_settings') {
      form.setFormData(item);
      if (item.score_column_config) {
        const columnsArray = Object.entries(item.score_column_config as Record<string, any>).map(
          ([key, value]) => ({
            key,
            label: value.label as string,
            he_so: value.he_so as number,
            data: (value.data as any) || null,
          })
        );
        scoreColumnHookLocal?.setScoreColumns(columnsArray);
      } else {
        scoreColumnHookLocal?.setScoreColumns([]);
      }
    } else if (hook.activeTab === 'subjects') {
      form.setFormData(item);
      hook.fetchSubjectScoreSettings(item.id);
      if (item.score_column_config) {
        const sc = item.score_column_config as Record<string, any>;
        const columnsArray = Object.entries(sc).map(([key, value]) => ({
          key,
          label: value.label as string,
          he_so: value.he_so as number,
          data: (value.data as any) || null,
        }));
        scoreColumnHookLocal?.setScoreColumns(columnsArray);
      } else {
        scoreColumnHookLocal?.setScoreColumns([]);
      }
    } else if (hook.activeTab === 'class_subjects' && item.subject_id) {
      // For class_subjects: explicitly set form data with all required fields from item
      const formInitData = {
        subject_id: item.subject_id,
        teacher_id: item.teacher_id,
        academic_year: item.academic_year,
        semester: item.semester,
      };
      form.setFormData(formInitData);
      
      // Filter teachers for this subject
      const teachersForSubject = hook.subjectTeachersData
        .filter(
          (st: any) =>
            st.subject_id === item.subject_id && st.is_active !== false
        )
        .map((st: any) => st.teacher_id);
      const filtered = hook.teachers.filter((t: any) =>
        teachersForSubject.includes(t.id)
      );
      hook.setFilteredTeachers(filtered);

      // Initialize selected classes for editing
      if (classSelectionHook && item.class_ids) {
        classSelectionHook.setSelectedClasses(item.class_ids);
      }
    } else {
      form.setFormData(item);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg" style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <Table>
          <TableHeader>
            <TableRow>
              {hook.currentConfig?.displayFields?.map((field: string) => (
                <TableHead key={field} className="text-center relative py-3">
                  {renderFieldHeader(field)}
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
              ))}
              <TableHead className="text-center relative py-3">TÙY CHỌN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {hook.currentConfig?.displayFields?.map((field: string) => (
                  <TableCell key={field} className="relative">
                    <div className="h-4 rounded animate-pulse bg-muted"></div>
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                  </TableCell>
                ))}
                <TableCell className="relative flex justify-center">
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 rounded animate-pulse bg-muted"></div>
                    <div className="w-8 h-8 rounded animate-pulse bg-muted"></div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <p className="mb-6 font-medium text-destructive">{error}</p>
        <Button onClick={onRetry} variant="default">
          Thử lại
        </Button>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
          <FileX className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg" style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <Table>
        <TableHeader>
          <TableRow>
            {hook.currentConfig?.displayFields?.map((field: string) => {
              const isSortable = sorting && FILTER_CONFIGS[hook.activeTab]?.sortableFields?.includes(field);
              const isSorted = sorting?.sortState.field === field;
              const sortDirection = isSorted ? sorting.sortState.direction : null;
              
              return (
                <TableHead
                  key={field}
                  className={`text-center relative py-3 ${isSortable ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
                  onClick={() => isSortable && sorting?.setSortField(field)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{renderFieldHeader(field)}</span>
                    {isSorted && (
                      <>
                        {sortDirection === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-primary" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-primary" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                </TableHead>
              );
            })}
            <TableHead className="text-center">TÙY CHỌN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((item: any, index: number) => (
            <React.Fragment key={item.id}>
              <TableRow className={index % 2 === 0 ? 'bg-background' : 'bg-blue-50/50'}>
                {hook.currentConfig?.displayFields?.map((field: string) => (
                  <TableCell key={field} className="relative">
                    {renderTableCell(field, item, hook, searchTerm, index, currentPage, pageSize, sorting, totalItems)}
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex space-x-2 justify-center">
                    {searchState.showDeleted ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // For class_subjects, use recordIds array; for others use id
                            const restoreId = hook.activeTab === 'class_subjects' && item.recordIds 
                              ? item.recordIds 
                              : item.id;
                            tabCrud.handleRestore(restoreId);
                          }}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          title="Khôi phục"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // For class_subjects, use recordIds array; for others use id
                            const deleteId = hook.activeTab === 'class_subjects' && item.recordIds 
                              ? item.recordIds 
                              : item.id;
                            tabCrud.handlePermanentDelete(deleteId);
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="text-primary hover:bg-primary/10"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // For class_subjects, use recordIds array; for others use id
                            const deleteId = hook.activeTab === 'class_subjects' && item.recordIds 
                              ? item.recordIds 
                              : item.id;
                            tabCrud.handleDelete(deleteId);
                          }}
                          className="text-destructive hover:bg-destructive/10"
                          title="Xóa tạm thời"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {/* Form is now rendered in Dialog instead of inline */}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Dialog for form submission */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItemForDialog ? 'Chỉnh sửa thông tin' : 'Tạo mới'}
            </DialogTitle>
            <DialogDescription>
              {editingItemForDialog 
                ? 'Cập nhật thông tin cho bản ghi này'
                : 'Tạo một bản ghi mới'}
            </DialogDescription>
          </DialogHeader>
          {renderForm(!!editingItemForDialog, editingItemForDialog)}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog for delete/restore operations */}
      {tabCrud.confirmState.open && (
        <ConfirmDialog
          open={true}
          title={tabCrud.confirmState.title || ''}
          description={tabCrud.confirmState.description}
          variant={tabCrud.confirmState.variant}
          confirmText={tabCrud.confirmState.confirmText}
          cancelText={tabCrud.confirmState.cancelText}
          onCancel={tabCrud.closeConfirm}
          onConfirm={tabCrud.confirmState.onConfirm || (() => { })}
        />
      )}
    </div>
  );
};