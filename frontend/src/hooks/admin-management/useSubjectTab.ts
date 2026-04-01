import { useState, useCallback } from 'react';
import api from '@/utils/api';
import { toast } from 'sonner';

export function useSubjectTab() {
  const [scoreColumns, setScoreColumns] = useState<any[]>([]);
  const [editingColumnKey, setEditingColumnKey] = useState<any>(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnFormData, setColumnFormData] = useState<Record<string, any>>({
    key: '',
    label: '',
    he_so: 1,
    hasSubColumns: false,
    subColumns: [],
  });

  // Fetch score settings for a subject
  const fetchSubjectScoreSettings = useCallback(async (subjectId: number) => {
    try {
      const res = await api.getScoreConfigBySubject(subjectId);
      if (res && res.success && res.data && res.data.score_column_config) {
        const sc = res.data.score_column_config as Record<string, any>;
        const columnsArray = Object.entries(sc).map(([key, value]) => ({
          key,
          label: value.label as string,
          he_so: value.he_so as number,
          data: (value.data as any) || null,
        }));
        setScoreColumns(columnsArray);
      }
    } catch (e) {
      // Silent fallback
    }
  }, []);

  // Create subject
  const handleCreate = useCallback(async (formData, scoreColumnConfig, onSuccess: () => void) => {
    try {
      const payload = {
        subject_code: formData.subject_code,
        subject_name: formData.subject_name,
        description: formData.description ?? null,
        is_mandatory: formData.is_mandatory ?? false,
        is_active: true,
      };

      const response = await api.request('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        if (scoreColumnConfig) {
          try {
            const subjectId = response.data?.id;
            if (subjectId) {
              let existing: any = null;
              try {
                const getRes = await api.getScoreConfigBySubject(subjectId);
                if (getRes.success) existing = getRes.data;
              } catch (e) {
                existing = null;
              }

              if (existing && existing.id) {
                await api.updateGradeSettings(existing.id, {
                  score_column_config: scoreColumnConfig,
                  is_active: true,
                });
              } else {
                await api.createGradeSettings({
                  subject_id: subjectId,
                  score_column_config: scoreColumnConfig,
                  is_active: true,
                });
              }
            }
          } catch (e) {
            console.error('Sync grade settings failed:', e);
          }
        }
        onSuccess();
        toast.success('Tạo thành công!');
      } else {
        throw new Error(response.message || 'Không thể tạo bản ghi');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(errMsg);
      throw err;
    }
  }, []);

  // Update subject
  const handleUpdate = useCallback(
    async (id: number, formData, scoreColumnConfig, onSuccess: () => void) => {
      try {
        const updatePayload = {
          subject_code: formData.subject_code,
          subject_name: formData.subject_name,
          description: formData.description ?? null,
          is_mandatory: formData.is_mandatory ?? false,
          is_active: formData.is_active ?? true,
        };

        const response = await api.request(`/admin/subjects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        });

        if (response.success) {
          if (scoreColumnConfig) {
            try {
              let existing: any = null;
              try {
                const getRes = await api.getScoreConfigBySubject(id);
                if (getRes.success) existing = getRes.data;
              } catch (e) {
                existing = null;
              }
              if (existing && existing.id) {
                await api.updateScoreSettings(id, {
                  score_column_config: scoreColumnConfig,
                  is_active: true,
                });
              } else {
                await api.createScoreSettings({
                  subject_id: id,
                  score_column_config: scoreColumnConfig,
                  is_active: true,
                });
              }
            } catch (e) {
              console.error('Sync grade settings failed:', e);
            }
          }
          onSuccess();
          toast.success('Cập nhật thành công!');
        } else {
          throw new Error(response.message || 'Không thể cập nhật');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast.error(errMsg);
        throw err;
      }
    },
    []
  );

  const resetScoreColumns = useCallback(() => {
    setScoreColumns([]);
    setEditingColumnKey(null);
    setShowColumnForm(false);
    setColumnFormData({
      key: '',
      label: '',
      he_so: 1,
      hasSubColumns: false,
      subColumns: [],
    });
  }, []);

  return {
    scoreColumns,
    setScoreColumns,
    editingColumnKey,
    setEditingColumnKey,
    showColumnForm,
    setShowColumnForm,
    columnFormData,
    setColumnFormData,
    fetchSubjectScoreSettings,
    handleCreate,
    handleUpdate,
    resetScoreColumns,
  };
}
