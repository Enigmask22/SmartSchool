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

      {/* is_char toggle — loại môn học: điểm chữ hay điểm số */}
      <div className="pt-4 mt-4 border-t border-gray-200">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Loại điểm
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="is_char"
              value="FALSE"
              checked={form.score_column_config?.is_char !== "TRUE"}
              onChange={() => {
                form.setFieldValue("score_column_config", {
                  ...(form.score_column_config || {}),
                  is_char: "FALSE",
                });
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">Điểm số (0 - 10)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="is_char"
              value="TRUE"
              checked={form.score_column_config?.is_char === "TRUE"}
              onChange={() => {
                form.setFieldValue("score_column_config", {
                  ...(form.score_column_config || {}),
                  is_char: "TRUE",
                });
              }}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">Điểm chữ (Đ / KĐ)</span>
          </label>
        </div>
      </div>

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
                  className={`flex items-start justify-between p-3 rounded-md border ${
                    col.data ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium text-gray-900">{col.label}</div>
                      {col.data && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          📦 Có cột con
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      Mã: {col.key} • Hệ số: {col.he_so}
                    </div>
                    {col.data && Object.keys(col.data).length > 0 && (
                      <div className="text-xs text-amber-700 pl-2 border-l-2 border-amber-300 mt-1">
                        {Object.values(col.data).map((subCol: any, i: number) => (
                          <div key={i}>↳ {subCol.label || '(chưa đặt tên)'} (HS: {subCol.he_so})</div>
                        ))}
                      </div>
                    )}
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
                  min="0.5"
                  step="0.5"
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

              {/* Checkbox for hasSubColumns */}
              <div className="flex items-center space-x-2 p-2 bg-white rounded-md border border-gray-200">
                <input
                  type="checkbox"
                  id="hasSubColumns"
                  checked={scoreColumnHook.columnFormData.hasSubColumns || false}
                  onChange={(e) => {
                    scoreColumnHook.setColumnFormData({
                      ...scoreColumnHook.columnFormData,
                      hasSubColumns: e.target.checked,
                      data: e.target.checked ? (scoreColumnHook.columnFormData.data || {}) : undefined,
                    });
                  }}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="hasSubColumns" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Cột này có cột con (ví dụ: Điểm thường xuyên 1, 2, 3...)
                </label>
              </div>

              {/* Sub-columns management section */}
              {scoreColumnHook.columnFormData.hasSubColumns && (
                <div className="p-3 bg-amber-50 rounded-md border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-amber-900">Cột con</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSubCol = {
                          subKey: `sub_${Date.now()}`,
                          subLabel: '',
                          subHeSo: 1,
                        };
                        scoreColumnHook.setColumnFormData({
                          ...scoreColumnHook.columnFormData,
                          data: {
                            ...scoreColumnHook.columnFormData.data,
                            [newSubCol.subKey]: { label: '', he_so: 1 },
                          },
                        });
                      }}
                      className="text-xs h-7"
                    >
                      + Thêm cột con
                    </Button>
                  </div>

                  {/* List of sub-columns */}
                  {scoreColumnHook.columnFormData.data &&
                    Object.keys(scoreColumnHook.columnFormData.data).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(scoreColumnHook.columnFormData.data).map(([subKey, subValue]: any) => (
                          <div key={subKey} className="flex items-center gap-2 p-2 bg-white rounded border border-amber-100">
                            <Input
                              type="text"
                              placeholder="Tên cột con"
                              size="sm"
                              className="text-xs h-7 flex-1"
                              value={subValue.label || ''}
                              onChange={(e) => {
                                scoreColumnHook.setColumnFormData({
                                  ...scoreColumnHook.columnFormData,
                                  data: {
                                    ...scoreColumnHook.columnFormData.data,
                                    [subKey]: { ...subValue, label: e.target.value },
                                  },
                                });
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="HS"
                              size="sm"
                              className="text-xs h-7 w-16"
                              min="0.5"
                              step="0.5"
                              value={subValue.he_so || 1}
                              onChange={(e) => {
                                scoreColumnHook.setColumnFormData({
                                  ...scoreColumnHook.columnFormData,
                                  data: {
                                    ...scoreColumnHook.columnFormData.data,
                                    [subKey]: {
                                      ...subValue,
                                      he_so: parseFloat(e.target.value) || 1,
                                    },
                                  },
                                });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newData = { ...scoreColumnHook.columnFormData.data };
                                delete newData[subKey];
                                scoreColumnHook.setColumnFormData({
                                  ...scoreColumnHook.columnFormData,
                                  data: Object.keys(newData).length > 0 ? newData : {},
                                });
                              }}
                              className="text-destructive hover:text-destructive/90 h-7 px-2"
                            >
                              Xóa
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

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
                    const { key, label, he_so, hasSubColumns, data } = scoreColumnHook.columnFormData;
                    if (!key || !label) {
                      alert('Vui lòng nhập đầy đủ thông tin');
                      return;
                    }

                    // Validate sub-columns if parent has them
                    if (hasSubColumns && data && Object.keys(data).length > 0) {
                      for (const [subKey, subVal]: any of Object.entries(data)) {
                        if (!subVal.label) {
                          alert('Vui lòng nhập tên cho tất cả cột con');
                          return;
                        }
                      }
                    }

                    // Build the column object with proper structure
                    const newColumn: any = {
                      key,
                      label,
                      he_so,
                    };

                    // Add data (sub-columns) if this is a parent column
                    if (hasSubColumns && data && Object.keys(data).length > 0) {
                      newColumn.data = data;
                    }

                    if (scoreColumnHook.editingColumnKey) {
                      // Update existing column - preserve any existing data if not changing structure
                      scoreColumnHook.setScoreColumns(
                        scoreColumnHook.scoreColumns.map((col: any) =>
                          col.key === scoreColumnHook.editingColumnKey
                            ? { ...col, ...newColumn }
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
                        newColumn,
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
                      data: {},
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
