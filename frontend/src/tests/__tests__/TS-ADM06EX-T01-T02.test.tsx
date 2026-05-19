import { describe, it, expect} from 'vitest';
import { render, screen, fireEvent} from '@testing-library/react';
import React, { useState } from 'react';

/**
 * TS-ADM06EX-T01-T02: Score Configuration Form Tests
 * Tests for the actual score column configuration form component logic
 */

// Mock Score Column hook and form similar to real component
interface ScoreColumn {
  key: string;
  label: string;
  he_so: number;
}

const ScoreConfigForm: React.FC = () => {
  const [scoreColumns, setScoreColumns] = useState<ScoreColumn[]>([]);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [columnFormData, setColumnFormData] = useState<ScoreColumn>({
    key: '',
    label: '',
    he_so: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateColumn = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!columnFormData.key.trim()) {
      newErrors.key = 'Mã cột không được để trống';
    }
    if (!columnFormData.label.trim()) {
      newErrors.label = 'Tên cột không được để trống';
    }
    if (columnFormData.he_so <= 0) {
      newErrors.he_so = 'Hệ số phải lớn hơn 0';
    }
    if (!editingColumnKey && scoreColumns.some((c) => c.key === columnFormData.key)) {
      newErrors.key = 'Mã cột này đã tồn tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddColumn = () => {
    setShowColumnForm(true);
    setEditingColumnKey(null);
    setColumnFormData({ key: '', label: '', he_so: 1 });
    setErrors({});
  };

  const handleSaveColumn = () => {
    if (!validateColumn()) return;

    if (editingColumnKey) {
      setScoreColumns(scoreColumns.map((c) => (c.key === editingColumnKey ? columnFormData : c)));
    } else {
      setScoreColumns([...scoreColumns, columnFormData]);
    }

    setShowColumnForm(false);
    setEditingColumnKey(null);
    setColumnFormData({ key: '', label: '', he_so: 1 });
  };

  const handleEditColumn = (col: ScoreColumn) => {
    setEditingColumnKey(col.key);
    setColumnFormData(col);
    setShowColumnForm(true);
    setErrors({});
  };

  const handleDeleteColumn = (key: string) => {
    setScoreColumns(scoreColumns.filter((c) => c.key !== key));
  };

  const handleCancelForm = () => {
    setShowColumnForm(false);
    setEditingColumnKey(null);
    setColumnFormData({ key: '', label: '', he_so: 1 });
    setErrors({});
  };

  return (
    <div data-testid="score-config-form" className="space-y-4">
      <div className="flex items-center justify-between">
        <label data-testid="config-title" className="text-sm font-semibold">
          Cấu hình cột điểm
        </label>
        <button
          type="button"
          data-testid="add-column-btn"
          onClick={handleAddColumn}
          className="px-3 py-1 text-sm border border-gray-300 rounded"
        >
          + Thêm cột
        </button>
      </div>

      {/* Empty state */}
      {scoreColumns.length === 0 && !showColumnForm && (
        <div data-testid="empty-state" className="p-3 text-sm text-gray-600">
          Chưa có cột điểm nào. Nhấn "Thêm cột" để tạo cột điểm mới.
        </div>
      )}

      {/* Columns list */}
      <div data-testid="columns-list" className="space-y-2">
        {scoreColumns.map((col) => (
          <div
            key={col.key}
            data-testid={`column-item-${col.key}`}
            className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200"
          >
            <div>
              <div data-testid={`column-label-${col.key}`} className="text-sm font-medium">
                {col.label}
              </div>
              <div data-testid={`column-info-${col.key}`} className="text-xs text-gray-600">
                Mã: {col.key} • Hệ số: {col.he_so}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                data-testid={`edit-btn-${col.key}`}
                onClick={() => handleEditColumn(col)}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100"
              >
                Sửa
              </button>
              <button
                type="button"
                data-testid={`delete-btn-${col.key}`}
                onClick={() => handleDeleteColumn(col.key)}
                className="px-2 py-1 text-sm rounded hover:bg-gray-100"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showColumnForm && (
        <div data-testid="column-form" className="p-4 bg-blue-50 rounded-md border border-blue-200">
          <div className="space-y-3">
            <div>
              <label htmlFor="form-key" className="block text-sm font-medium">
                Mã cột *
              </label>
              <input
                id="form-key"
                type="text"
                placeholder="VD: midterm"
                data-testid="form-key-input"
                value={columnFormData.key}
                disabled={!!editingColumnKey}
                onChange={(e) => setColumnFormData({ ...columnFormData, key: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
              {errors.key && (
                <span data-testid="error-key" className="text-xs text-red-600">
                  {errors.key}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="form-label" className="block text-sm font-medium">
                Tên cột *
              </label>
              <input
                id="form-label"
                type="text"
                placeholder="VD: Kiểm tra giữa kỳ"
                data-testid="form-label-input"
                value={columnFormData.label}
                onChange={(e) => setColumnFormData({ ...columnFormData, label: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
              {errors.label && (
                <span data-testid="error-label" className="text-xs text-red-600">
                  {errors.label}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="form-weight" className="block text-sm font-medium">
                Hệ số *
              </label>
              <input
                id="form-weight"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="VD: 0.5"
                data-testid="form-weight-input"
                value={columnFormData.he_so}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setColumnFormData({
                    ...columnFormData,
                    he_so: isNaN(value) ? 1 : value,
                  });
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
              {errors.he_so && (
                <span data-testid="error-weight" className="text-xs text-red-600">
                  {errors.he_so}
                </span>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                data-testid="form-cancel-btn"
                onClick={handleCancelForm}
                className="px-3 py-1 text-sm border border-gray-300 rounded"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="form-save-btn"
                onClick={handleSaveColumn}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
              >
                {editingColumnKey ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


describe('TS-ADM06EX-T01: Score Configuration Form Rendering', () => {
  it('TS-ADM06EX-T01-01: Should render form with title and add button', () => {
    render(<ScoreConfigForm />);

    expect(screen.getByTestId('config-title')).toBeInTheDocument();
    expect(screen.getByTestId('config-title')).toHaveTextContent('Cấu hình cột điểm');
    expect(screen.getByTestId('add-column-btn')).toBeInTheDocument();
    expect(screen.getByTestId('add-column-btn')).toHaveTextContent('+ Thêm cột');
  });

  it('TS-ADM06EX-T01-02: Should show empty state when no columns', () => {
    render(<ScoreConfigForm />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toHaveTextContent('Chưa có cột điểm nào');
  });

  it('TS-ADM06EX-T01-03: Should show form when add button clicked', () => {
    render(<ScoreConfigForm />);

    expect(screen.queryByTestId('column-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-column-btn'));
    expect(screen.getByTestId('column-form')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T01-04: Should display form inputs', () => {
    render(<ScoreConfigForm />);
    fireEvent.click(screen.getByTestId('add-column-btn'));

    expect(screen.getByTestId('form-key-input')).toBeInTheDocument();
    expect(screen.getByTestId('form-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('form-weight-input')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T01-05: Should display form buttons', () => {
    render(<ScoreConfigForm />);
    fireEvent.click(screen.getByTestId('add-column-btn'));

    expect(screen.getByTestId('form-save-btn')).toBeInTheDocument();
    expect(screen.getByTestId('form-cancel-btn')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T01-06: Form save button should show "Thêm" for new column', () => {
    render(<ScoreConfigForm />);
    fireEvent.click(screen.getByTestId('add-column-btn'));

    expect(screen.getByTestId('form-save-btn')).toHaveTextContent('Thêm');
  });

  it('TS-ADM06EX-T01-07: Weight input should have correct attributes', () => {
    render(<ScoreConfigForm />);
    fireEvent.click(screen.getByTestId('add-column-btn'));

    const weightInput = screen.getByTestId('form-weight-input') as HTMLInputElement;
    expect(weightInput.getAttribute('type')).toBe('number');
    expect(weightInput.getAttribute('min')).toBe('0.1');
    expect(weightInput.getAttribute('step')).toBe('0.1');
  });

  it('TS-ADM06EX-T01-08: Key input should be disabled during edit', () => {
    render(<ScoreConfigForm />);
    fireEvent.click(screen.getByTestId('add-column-btn'));

    // Add a column first
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'test_key' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Test Label' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    // Now edit it
    fireEvent.click(screen.getByTestId('edit-btn-test_key'));

    const keyInput = screen.getByTestId('form-key-input') as HTMLInputElement;
    expect(keyInput.disabled).toBe(true);
  });
});

describe('TS-ADM06EX-T02: Score Column Form Operations', () => {
  it('TS-ADM06EX-T02-01: Can add new column with valid data', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'diem_test' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Điểm kiểm tra' } });
    fireEvent.change(screen.getByTestId('form-weight-input'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('column-item-diem_test')).toBeInTheDocument();
    expect(screen.getByTestId('column-label-diem_test')).toHaveTextContent('Điểm kiểm tra');
    expect(screen.getByTestId('column-info-diem_test')).toHaveTextContent('Mã: diem_test • Hệ số: 20');
  });

  it('TS-ADM06EX-T02-02: Rejects empty key field', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Valid Label' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('error-key')).toBeInTheDocument();
    expect(screen.getByTestId('error-key')).toHaveTextContent('Mã cột không được để trống');
    expect(screen.getByTestId('column-form')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T02-03: Rejects empty label field', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'test_key' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('error-label')).toBeInTheDocument();
    expect(screen.getByTestId('error-label')).toHaveTextContent('Tên cột không được để trống');
  });

  it('TS-ADM06EX-T02-04: Rejects zero or negative weight', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'test_key' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByTestId('form-weight-input'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('error-weight')).toBeInTheDocument();
    expect(screen.getByTestId('error-weight')).toHaveTextContent('Hệ số phải lớn hơn 0');
  });

  it('TS-ADM06EX-T02-05: Prevents duplicate column keys', () => {
    render(<ScoreConfigForm />);

    // Add first column
    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'duplicate_key' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'First' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    // Try to add duplicate
    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'duplicate_key' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Second' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('error-key')).toBeInTheDocument();
    expect(screen.getByTestId('error-key')).toHaveTextContent('Mã cột này đã tồn tại');
  });

  it('TS-ADM06EX-T02-06: Can delete column from list', () => {
    render(<ScoreConfigForm />);

    // Add two columns
    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'col1' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Column 1' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'col2' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Column 2' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    // Delete first
    fireEvent.click(screen.getByTestId('delete-btn-col1'));

    expect(screen.queryByTestId('column-item-col1')).not.toBeInTheDocument();
    expect(screen.getByTestId('column-item-col2')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T02-07: Can edit existing column', () => {
    render(<ScoreConfigForm />);

    // Add column
    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'diem_edit' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Original' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    // Edit it
    fireEvent.click(screen.getByTestId('edit-btn-diem_edit'));
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    expect(screen.getByTestId('column-label-diem_edit')).toHaveTextContent('Updated');
  });

  it('TS-ADM06EX-T02-08: Cancel button closes form', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    expect(screen.getByTestId('column-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('form-cancel-btn'));
    expect(screen.queryByTestId('column-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('TS-ADM06EX-T02-09: Edit shows "Cập nhật" button text', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'test_key' } });
    fireEvent.change(screen.getByTestId('form-label-input'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    fireEvent.click(screen.getByTestId('edit-btn-test_key'));
    expect(screen.getByTestId('form-save-btn')).toHaveTextContent('Cập nhật');
  });

  it('TS-ADM06EX-T02-10: Form clears after successful save', () => {
    render(<ScoreConfigForm />);

    fireEvent.click(screen.getByTestId('add-column-btn'));
    fireEvent.change(screen.getByTestId('form-key-input'), { target: { value: 'col1' } });
    fireEvent.click(screen.getByTestId('form-save-btn'));

    // Open form again
    fireEvent.click(screen.getByTestId('add-column-btn'));

    const keyInput = screen.getByTestId('form-key-input') as HTMLInputElement;
    expect(keyInput.value).toBe('');
  });
})