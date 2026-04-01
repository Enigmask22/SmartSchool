import React from 'react';
import { Edit, Trash2, Save, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useTabCrud } from '@/hooks/admin-management/useTabCrud';
import { useAdminForm } from '@/hooks/admin-management/useAdminForm';
import { useAdminSearch } from '@/hooks/admin-management/useAdminSearch';
import { useTeacherSubjectManagement } from '@/hooks/admin-management/useTeacherSubjectManagement';
import { useScoreColumnManagement } from '@/hooks/admin-management/useScoreColumnManagement';
import { renderFieldHeader, renderTableCell } from './tableHelpers';
import { AdminManagementForm } from './AdminManagementForm';
import logger from '@/utils/logger';

interface AdminTableProps {
  hook: any;
  filteredData: any[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  scoreColumnHook?: any;
}

export const AdminTable: React.FC<AdminTableProps> = ({
  hook,
  filteredData,
  isLoading = false,
  error = null,
  onRetry,
  scoreColumnHook,
}) => {
  // Use refactored hooks directly for independent state management
  const search = useAdminSearch();
  const tabCrud = useTabCrud(hook.activeTab, search.showDeleted);
  const form = useAdminForm();
  const teacherSubjectHook = useTeacherSubjectManagement(tabCrud.editingItem, false, hook.activeTab);
  const scoreColumnHookLocal = useScoreColumnManagement();

  const renderForm = (isEdit = false, item = null) => {
    return (
      <AdminManagementForm 
        hook={hook} 
        teacherSubjectHook={teacherSubjectHook}
        scoreColumnHook={scoreColumnHookLocal}
        isEdit={isEdit} 
        item={item}
        onCancel={() => {
          tabCrud.setEditingItem(null);
          teacherSubjectHook.setSelectedSubjects([]);
          scoreColumnHookLocal.setScoreColumns([]);
        }}
      />
    );
  };

  const handleEdit = (item: any) => {
    tabCrud.setEditingItem(item.id);
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
        scoreColumnHook?.setScoreColumns(columnsArray);
      } else {
        scoreColumnHook?.setScoreColumns([]);
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
        scoreColumnHook?.setScoreColumns(columnsArray);
      } else {
        scoreColumnHook?.setScoreColumns([]);
      }
    } else {
      form.setFormData(item);
    }

    if (hook.activeTab === 'class_subjects' && item.subject_id) {
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
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {hook.currentConfig?.displayFields?.map((field: string) => (
                <TableHead key={field}>{renderFieldHeader(field)}</TableHead>
              ))}
              <TableHead>THAO TÁC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {hook.currentConfig?.displayFields?.map((field: string) => (
                  <TableCell key={field}>
                    <div className="h-4 rounded animate-pulse bg-muted"></div>
                  </TableCell>
                ))}
                <TableCell>
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
          <span className="text-2xl text-destructive">⚠️</span>
        </div>
        <p className="mb-4 font-medium text-destructive">{error}</p>
        <Button onClick={onRetry}>Thử lại</Button>
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
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {hook.currentConfig?.displayFields?.map((field: string) => (
              <TableHead key={field}>{renderFieldHeader(field)}</TableHead>
            ))}
            <TableHead>THAO TÁC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((item: any, index: number) => (
            <React.Fragment key={item.id}>
              <TableRow className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                {hook.currentConfig?.displayFields?.map((field: string) => (
                  <TableCell key={field}>{renderTableCell(field, item, hook)}</TableCell>
                ))}
                <TableCell>
                  <div className="flex space-x-2">
                    {search.showDeleted ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => tabCrud.handleRestore(item.id)}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          title="Khôi phục"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => tabCrud.handlePermanentDelete(item.id)}
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
                          onClick={() => tabCrud.handleDelete(item.id)}
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
              {tabCrud.editingItem === item.id && (
                <TableRow>
                  <TableCell
                    colSpan={(hook.currentConfig?.displayFields?.length || 0) + 1}
                    className="bg-muted/30"
                  >
                    <div className="mb-4">
                      <h3 className="mb-2 text-lg font-semibold">Chỉnh sửa thông tin</h3>
                      <p className="text-sm text-muted-foreground">
                        Cập nhật thông tin cho bản ghi này
                      </p>
                    </div>
                    {renderForm(true, item)}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

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
          onConfirm={tabCrud.confirmState.onConfirm || (() => {})}
        />
      )}
    </div>
  );
};