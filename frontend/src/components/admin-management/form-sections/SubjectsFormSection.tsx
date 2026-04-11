import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommonFormFields } from './CommonFormFields';

interface SubjectsFormSectionProps {
  hook: any;
  form: any;
  scoreColumnHook: any;
  isEdit?: boolean;
  item?: any;
}

export const SubjectsFormSection: React.FC<SubjectsFormSectionProps> = ({
  hook,
  form,
  scoreColumnHook,
  isEdit = false,
  item = null,
}) => {
  return (
    <div className="space-y-4">
      {/* Common fields for subjects tab - exclude score_column_config */}
      <CommonFormFields
        hook={hook}
        form={form}
        isEdit={isEdit}
        item={item}
        filteredFields={['score_column_config']}
      />

      {/* Score Column Configuration */}
      {isEdit && scoreColumnHook && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-800">
              Cấu hình cột điểm
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                scoreColumnHook.setShowColumnForm(true);
                scoreColumnHook.setEditingColumnKey(null);
                scoreColumnHook.setColumnFormData({
                  key: '',
                  label: '',
                  he_so: 1,
                  hasSubColumns: false,
                  subColumns: [],
                });
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              + Thêm cột
            </Button>
          </div>
          <p className="mb-3 text-xs text-gray-600">
            Cấu hình các cột điểm cho môn học này
          </p>

          {/* Existing Score Columns List */}
          {scoreColumnHook.scoreColumns.length > 0 && (
            <div className="mb-4 space-y-2">
              {scoreColumnHook.scoreColumns.map((col: any, idx: number) => (
                <div
                  key={col.key || idx}
                  className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{col.label}</div>
                    <div className="text-xs text-gray-600">
                      Mã: {col.key} • Hệ số: {col.he_so}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        scoreColumnHook.setEditingColumnKey(col.key);
                        scoreColumnHook.setColumnFormData(col);
                        scoreColumnHook.setShowColumnForm(true);
                      }}
                      className="text-primary hover:text-primary/90"
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        scoreColumnHook.setScoreColumns(
                          scoreColumnHook.scoreColumns.filter(
                            (c: any) => c.key !== col.key
                          )
                        );
                      }}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Score Column Form */}
          {scoreColumnHook.showColumnForm && (
            <div className="p-4 bg-blue-50 rounded-md border border-blue-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Mã cột *
                  </label>
                  <Input
                    type="text"
                    placeholder="VD: midterm"
                    value={scoreColumnHook.columnFormData.key || ''}
                    onChange={(e) =>
                      scoreColumnHook.setColumnFormData({
                        ...scoreColumnHook.columnFormData,
                        key: e.target.value,
                      })
                    }
                    disabled={!!scoreColumnHook.editingColumnKey}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Tên cột *
                  </label>
                  <Input
                    type="text"
                    placeholder="VD: Kiểm tra giữa kỳ"
                    value={scoreColumnHook.columnFormData.label || ''}
                    onChange={(e) =>
                      scoreColumnHook.setColumnFormData({
                        ...scoreColumnHook.columnFormData,
                        label: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Hệ số *
                </label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="VD: 0.5"
                  value={scoreColumnHook.columnFormData.he_so || 1}
                  onChange={(e) =>
                    scoreColumnHook.setColumnFormData({
                      ...scoreColumnHook.columnFormData,
                      he_so: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    scoreColumnHook.setShowColumnForm(false);
                    scoreColumnHook.setEditingColumnKey(null);
                    scoreColumnHook.setColumnFormData({
                      key: '',
                      label: '',
                      he_so: 1,
                      hasSubColumns: false,
                      subColumns: [],
                    });
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const { key, label, he_so } = scoreColumnHook.columnFormData;
                    if (!key || !label) {
                      alert('Vui lòng nhập đầy đủ thông tin');
                      return;
                    }

                    if (scoreColumnHook.editingColumnKey) {
                      // Update existing column
                      scoreColumnHook.setScoreColumns(
                        scoreColumnHook.scoreColumns.map((col: any) =>
                          col.key === scoreColumnHook.editingColumnKey
                            ? { ...col, key, label, he_so }
                            : col
                        )
                      );
                    } else {
                      // Add new column
                      if (
                        scoreColumnHook.scoreColumns.some((col: any) => col.key === key)
                      ) {
                        alert('Mã cột này đã tồn tại');
                        return;
                      }
                      scoreColumnHook.setScoreColumns([
                        ...scoreColumnHook.scoreColumns,
                        { key, label, he_so },
                      ]);
                    }

                    // Reset form
                    scoreColumnHook.setShowColumnForm(false);
                    scoreColumnHook.setEditingColumnKey(null);
                    scoreColumnHook.setColumnFormData({
                      key: '',
                      label: '',
                      he_so: 1,
                      hasSubColumns: false,
                      subColumns: [],
                    });
                  }}
                >
                  {scoreColumnHook.editingColumnKey ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </div>
          )}

          {scoreColumnHook.scoreColumns.length === 0 && !scoreColumnHook.showColumnForm && (
            <div className="p-3 text-sm text-gray-600 text-center bg-gray-50 rounded-md border border-gray-200">
              Chưa có cột điểm nào. Nhấn "Thêm cột" để tạo cột điểm mới.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
