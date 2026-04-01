import { useState, useCallback } from 'react';
import api from '@/utils/api';
import { toast } from 'sonner';

export const TAB_CONFIG = {
  users: {
    title: 'Quản lý người dùng',
    fields: ['email', 'username', 'full_name', 'password', 'role'],
    displayFields: ['id', 'email', 'username', 'full_name', 'role', 'is_active'],
    endpoint: '/admin/users',
  },
  teachers: {
    title: 'Quản lý giáo viên',
    fields: ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender'],
    displayFields: ['id', 'teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'subjects', 'is_active'],
    endpoint: '/admin/teachers',
  },
  subjects: {
    title: 'Quản lý môn học',
    fields: ['subject_code', 'subject_name', 'description', 'is_mandatory'],
    displayFields: ['id', 'subject_code', 'subject_name', 'description', 'is_mandatory', 'score_column_config', 'is_active'],
    endpoint: '/admin/subjects',
  },
  classes: {
    title: 'Quản lý lớp học',
    fields: ['class_name', 'grade', 'homeroom_teacher_id', 'room_number', 'academic_year'],
    displayFields: ['id', 'class_name', 'grade', 'homeroom_teacher', 'room_number', 'academic_year', 'total_students'],
    endpoint: '/admin/classes',
  },
  subject_teachers: {
    title: 'Quản lý giáo viên - môn học',
    fields: ['teacher_id', 'subject_id'],
    displayFields: ['id', 'teacher_name', 'subject_name', 'is_active'],
    endpoint: '/admin/subject-teachers',
  },
  class_subjects: {
    title: 'Quản lý lớp - môn học',
    fields: ['class_id', 'subject_id', 'teacher_id', 'academic_year', 'semester'],
    displayFields: ['id', 'class_name', 'subject_name', 'teacher_name', 'academic_year', 'semester', 'is_active'],
    endpoint: '/admin/class-subjects',
  },
  score_settings: {
    title: 'Cấu hình cột điểm',
    fields: ['subject_id', 'score_column_config'],
    displayFields: ['id', 'subject_name', 'score_column_config', 'is_active'],
    endpoint: '/score-settings',
  },
};

export function useTabCrud(activeTab: string, showDeleted: boolean) {
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
      const tabsWithServerFiltering = ['subjects', 'subject_teachers', 'class_subjects'];

      if (tabsWithServerFiltering.includes(activeTab) && showDeleted) {
        endpoint = `${endpoint}?show_deleted=true`;
      }

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

        if (tabsWithServerFiltering.includes(activeTab)) {
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        } else {
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        }

        setData(items);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint, activeTab, showDeleted]);

  // Restore item
  const handleRestore = useCallback(
    (id: number) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: 'Khôi phục bản ghi',
        description: 'Bạn có chắc muốn khôi phục bản ghi này?',
        confirmText: 'Khôi phục',
        variant: 'default',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}/restore`, {
              method: 'POST',
            });
            if (response.success) {
              loadData();
              toast.success('Khôi phục thành công!');
            } else {
              toast.error(response.message || 'Không thể khôi phục');
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
    (id: number) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: 'Xóa tạm thời bản ghi',
        description: 'Bạn có chắc muốn xóa tạm thời bản ghi này?\nBạn có thể khôi phục lại trong tab "Đã xóa tạm thời".',
        confirmText: 'Xóa tạm thời',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}`, {
              method: 'DELETE',
            });
            if (response.success) {
              loadData();
              toast.success('Xóa tạm thời thành công! Bạn có thể khôi phục trong tab "Đã xóa tạm thời".');
            } else {
              toast.error(response.message || 'Không thể xóa');
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
    (id: number) => {
      if (!currentConfig?.endpoint) return;

      openConfirm({
        title: '⚠️ Xóa vĩnh viễn bản ghi',
        description: 'Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN bản ghi này?\n\nHành động này KHÔNG THỂ HOÀN TÁC!',
        confirmText: 'Xóa vĩnh viễn',
        onConfirm: async () => {
          closeConfirm();
          try {
            const response = await api.request(`${currentConfig.endpoint}/${id}/permanent`, {
              method: 'DELETE',
            });
            if (response.success) {
              loadData();
              toast.success('Xóa vĩnh viễn thành công!');
            } else {
              toast.error(response.message || 'Không thể xóa vĩnh viễn');
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
