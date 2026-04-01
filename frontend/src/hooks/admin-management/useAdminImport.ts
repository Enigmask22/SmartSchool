import { useState, useCallback } from 'react';
import api from '@/utils/api';
import { toast } from 'sonner';

export function useAdminImport(onImportSuccess: () => void) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<any[]>([]);
  const [userSubjects, setUserSubjects] = useState<Record<string, any>>({});
  const [importLoading, setImportLoading] = useState(false);

  // Load available users for import
  const loadAvailableUsers = useCallback(async () => {
    try {
      const response = await api.request('/admin/users/teachers');
      if (response.success) {
        setAvailableUsers(response.data || []);
      } else {
        toast.error(response.message || 'Không thể tải danh sách users');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error('Lỗi khi tải danh sách users: ' + errMsg);
    }
  }, []);

  // Import teachers from selected users
  const handleImportTeachers = useCallback(
    async (_subjects: any[]) => {
      if (selectedUserIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất một user để tạo giáo viên');
        return;
      }

      setImportLoading(true);
      try {
        const response = await api.request('/admin/teachers/import-from-users', {
          method: 'POST',
          body: JSON.stringify(selectedUserIds),
        });

        if (response.success) {
          const createdTeachers = response.data;

          const subjectTeacherPromises: Promise<any>[] = [];

          createdTeachers.forEach((teacher) => {
            const subjectIds = userSubjects[teacher.user_id] || [];

            subjectIds.forEach((subjectId) => {
              subjectTeacherPromises.push(
                api.request('/admin/subject-teachers', {
                  method: 'POST',
                  body: JSON.stringify({
                    teacher_id: teacher.id,
                    subject_id: subjectId,
                    is_active: true,
                  }),
                })
              );
            });
          });

          if (subjectTeacherPromises.length > 0) {
            await Promise.all(subjectTeacherPromises);
          }

          setShowImportModal(false);
          setSelectedUserIds([]);
          setUserSubjects({});
          onImportSuccess();

          const totalSubjects = Object.values(userSubjects as Record<string, any[]>).reduce(
            (sum, subj) => sum + (subj as any[]).length,
            0
          );
          toast.success(
            `Tạo thành công ${createdTeachers.length} giáo viên${
              totalSubjects > 0 ? ` và phân công ${totalSubjects} môn học!` : '!'
            }`
          );
        } else {
          toast.error(response.message || 'Không thể tạo giáo viên');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast.error('Lỗi khi tạo giáo viên: ' + errMsg);
      } finally {
        setImportLoading(false);
      }
    },
    [selectedUserIds, userSubjects, onImportSuccess]
  );

  // Select single user
  const handleUserSelect = useCallback((userId) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }, []);

  // Select/deselect all users
  const handleSelectAllUsers = useCallback(() => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map((user) => user.id));
    }
  }, [selectedUserIds, availableUsers]);

  // Toggle subject for user
  const handleUserSubjectToggle = useCallback((userId, subjectId) => {
    setUserSubjects((prev) => {
      const currentSubjects = prev[userId] || [];
      const newSubjects = currentSubjects.includes(subjectId)
        ? currentSubjects.filter((id) => id !== subjectId)
        : [...currentSubjects, subjectId];

      return {
        ...prev,
        [userId]: newSubjects,
      };
    });
  }, []);

  const resetImport = useCallback(() => {
    setShowImportModal(false);
    setSelectedUserIds([]);
    setUserSubjects({});
  }, []);

  return {
    showImportModal,
    setShowImportModal,
    availableUsers,
    selectedUserIds,
    setSelectedUserIds,
    userSubjects,
    setUserSubjects,
    importLoading,
    loadAvailableUsers,
    handleImportTeachers,
    handleUserSelect,
    handleSelectAllUsers,
    handleUserSubjectToggle,
    resetImport,
  };
}
