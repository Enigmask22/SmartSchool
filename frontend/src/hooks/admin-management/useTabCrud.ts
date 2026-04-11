import { useState, useCallback } from 'react';
import api from '@/utils/api';
import { toast } from 'sonner';

export const TAB_CONFIG = {
  users: {
    title: 'Quản lý người dùng',
    fields: ['username', 'email', 'full_name', 'password', 'role'],
    displayFields: ['id', 'username', 'email', 'full_name', 'role'], //is_active 
    endpoint: '/admin/users',
  },
  teachers: {
    title: 'Quản lý giáo viên',
    fields: ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender'],
    displayFields: ['id', 'teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'subjects'], //is_active
    endpoint: '/admin/teachers',
  },
  subjects: {
    title: 'Quản lý môn học',
    fields: ['subject_code', 'subject_name', 'description', 'is_mandatory'],
    displayFields: ['id', 'subject_code', 'subject_name', 'description', 'is_mandatory', 'score_column_config'], //is_active
    endpoint: '/admin/subjects',
  },
  classes: {
    title: 'Quản lý lớp học',
    fields: ['class_name', 'grade', 'homeroom_teacher_id', 'room_number', 'academic_year'],
    displayFields: ['id', 'class_name', 'grade', 'homeroom_teacher', 'room_number', 'academic_year', 'total_students'],
    endpoint: '/admin/classes',
  },
  // subject_teachers: {
  //   title: 'Quản lý giáo viên - môn học',
  //   fields: ['teacher_id', 'subject_id'],
  //   displayFields: ['id', 'teacher_name', 'subject_name', 'is_active'],
  //   endpoint: '/admin/subject-teachers',
  // },
  class_subjects: {
    title: 'Quản lý phân công giảng dạy',
    fields: ['subject_id', 'teacher_id', 'class_id', 'academic_year', 'semester'],
    displayFields: ['id', 'subject_name', 'teacher_name', 'classes', 'academic_year', 'semester'], //is_active
    endpoint: '/admin/class-subjects',
  },
  // score_settings: {
  //   title: 'Cấu hình cột điểm',
  //   fields: ['subject_id', 'score_column_config'],
  //   displayFields: ['id', 'subject_name', 'score_column_config', 'is_active'],
  //   endpoint: '/score-settings',
  // },
};

export function useTabCrud(activeTab: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmState, setConfirmState] = useState<Record<string, any>>({ open: false });

  const currentConfig = TAB_CONFIG[activeTab];

  // Confirm Dialog
  const openConfirm = useCallback(
    (config) =>
      setConfirmState({
        open: true,
        variant: 'destructive',
        confirmText: 'Xác nhận',
        ...config,
      }),
    []
  );

  const closeConfirm = useCallback(
    () => setConfirmState((prev) => ({ ...prev, open: false })),
    []
  );

  // Load data
  const loadData = useCallback(async () => {
    if (!currentConfig?.endpoint) return;

    setLoading(true);
    setError(null);
    try {
      let endpoint = currentConfig.endpoint;
      // Don't add show_deleted parameter - get all data from backend
      // Let Management.tsx handle filtering based on showDeleted flag
      
      const response = await api.request(endpoint);
      if (response.success) {
        let items = response.data || [];

        if (activeTab === 'subjects') {
          items = items.map((s) => ({
            ...s,
            score_column_config: s.score_column_config || null,
          }));
        }

        if (activeTab === 'score_settings') {
          items = items.map((item) => ({
            ...item,
            subject_name: item.subjects?.subject_name || '-',
            subject_code: item.subjects?.subject_code || '-',
          }));
        }

        // Don't filter here - let Management.tsx filter based on showDeleted flag
        // This keeps all filtering logic in one place
        setData(items);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint, activeTab]);

  // Restore item
  const handleRestore = useCallback(
    (id: number | number[]) => {
      if (!currentConfig?.endpoint) return;

      // For class_subjects with grouped records
      const ids = Array.isArray(id) ? id : [id];
      const isMultiple = ids.length > 1;

      openConfirm({
        title: 'Khôi phục bản ghi',
        description: isMultiple
          ? `Bạn có chắc muốn khôi phục ${ids.length} phân công này?`
          : 'Bạn có chắc muốn khôi phục bản ghi này?',
        confirmText: 'Khôi phục',
        variant: 'default',
        onConfirm: async () => {
          closeConfirm();
          try {
            // Restore each record
            let successCount = 0;
            for (const idToRestore of ids) {
              try {
                const response = await api.request(`${currentConfig.endpoint}/${idToRestore}/restore`, {
                  method: 'POST',
                });
                if (response.success) {
                  successCount++;
                }
              } catch (err) {
                // Continue with next record even if one fails
                console.warn(`Failed to restore record ${idToRestore}:`, err);
              }
            }
            
            if (successCount > 0) {
              loadData();
              toast.success(isMultiple ? `Khôi phục ${successCount}/${ids.length} bản ghi thành công!` : 'Khôi phục thành công!');
            } else {
              toast.error('Không thể khôi phục');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            toast.error('Lỗi khi khôi phục: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, loadData, openConfirm, closeConfirm]
  );

  // Delete item (soft delete)
  const handleDelete = useCallback(
    (id: number | number[]) => {
      if (!currentConfig?.endpoint) return;

      // For class_subjects with grouped records (id is actually an array of recordIds)
      const ids = Array.isArray(id) ? id : [id];
      const isMultiple = ids.length > 1;

      openConfirm({
        title: 'Xóa tạm thời bản ghi',
        description: isMultiple 
          ? `Bạn có chắc muốn xóa tạm thời ${ids.length} phân công này?\nBạn có thể khôi phục lại trong tab "Đã xóa tạm thời".`
          : 'Bạn có chắc muốn xóa tạm thời bản ghi này?\nBạn có thể khôi phục lại trong tab "Đã xóa tạm thời".',
        confirmText: 'Xóa tạm thời',
        onConfirm: async () => {
          closeConfirm();
          try {
            // Delete each record
            let successCount = 0;
            for (const idToDelete of ids) {
              try {
                const response = await api.request(`${currentConfig.endpoint}/${idToDelete}`, {
                  method: 'DELETE',
                });
                if (response.success) {
                  successCount++;
                }
              } catch (err) {
                // Continue with next record even if one fails
                console.warn(`Failed to delete record ${idToDelete}:`, err);
              }
            }
            
            if (successCount > 0) {
              loadData();
              if (isMultiple) {
                toast.success(`Xóa tạm thời ${successCount}/${ids.length} bản ghi thành công! Bạn có thể khôi phục trong tab "Đã xóa tạm thời".`);
              } else {
                toast.success('Xóa tạm thời thành công! Bạn có thể khôi phục trong tab "Đã xóa tạm thời".');
              }
            } else {
              toast.error('Không thể xóa');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            toast.error('Lỗi khi xóa: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, loadData, openConfirm, closeConfirm]
  );

  // Permanent delete
  const handlePermanentDelete = useCallback(
    (id: number | number[]) => {
      if (!currentConfig?.endpoint) return;

      // For class_subjects with grouped records
      const ids = Array.isArray(id) ? id : [id];
      const isMultiple = ids.length > 1;

      openConfirm({
        title: '⚠️ Xóa vĩnh viễn bản ghi',
        description: isMultiple
          ? `Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN ${ids.length} phân công này?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`
          : 'Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN bản ghi này?\n\nHành động này KHÔNG THỂ HOÀN TÁC!',
        confirmText: 'Xóa vĩnh viễn',
        onConfirm: async () => {
          closeConfirm();
          try {
            // Permanent delete each record
            let successCount = 0;
            for (const idToDelete of ids) {
              try {
                const response = await api.request(`${currentConfig.endpoint}/${idToDelete}/permanent`, {
                  method: 'DELETE',
                });
                if (response.success) {
                  successCount++;
                }
              } catch (err) {
                // Continue with next record even if one fails
                console.warn(`Failed to permanently delete record ${idToDelete}:`, err);
              }
            }
            
            if (successCount > 0) {
              loadData();
              toast.success(isMultiple ? `Xóa vĩnh viễn ${successCount}/${ids.length} bản ghi thành công!` : 'Xóa vĩnh viễn thành công!');
            } else {
              toast.error('Không thể xóa vĩnh viễn');
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            toast.error('Lỗi khi xóa vĩnh viễn: ' + errMsg);
          }
        },
      });
    },
    [currentConfig?.endpoint, loadData, openConfirm, closeConfirm]
  );

  // Filter data based on search term
  const filteredData = useCallback((items = data, searchTerm = '') => {
    return items.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return Object.values(item).some((value) => String(value).toLowerCase().includes(searchLower));
    });
  }, [data]);

  return {
    data,
    setData,
    loading,
    error,
    editingItem,
    setEditingItem,
    showAddForm,
    setShowAddForm,
    currentConfig,
    loadData,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    filteredData,
    confirmState,
    openConfirm,
    closeConfirm,
  };
}
