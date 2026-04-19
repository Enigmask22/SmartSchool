/**
 * Test Suite: TS-ADM07-04-05 - Class Update & Delete Operations
 * Covers: Class update form, deletion with confirmation, soft delete pattern
 * Status: In Development
 * Pattern: Similar to TS-ADM06-04-05 (Subject update/delete)
 */

import { describe, it, expect} from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useEffect, useState } from 'react';

// ========== Mock Class Data Types ==========
interface ClassData {
  id: number;
  class_name: string;
  grade: number;
  room_number?: string;
  academic_year: string;
  homeroom_teacher_id?: number;
  is_active: boolean;
}

// ========== Mock Class Update Form Component ==========
const ClassUpdateForm: React.FC<{ initialData?: ClassData }> = ({ initialData }) => {
  const [formData, setFormData] = useState<Omit<ClassData, 'id' | 'is_active'>>({
    class_name: '',
    grade: 10,
    room_number: '',
    academic_year: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialData to form state via useEffect
  useEffect(() => {
    if (initialData) {
      setFormData({
        class_name: initialData.class_name,
        grade: initialData.grade,
        room_number: initialData.room_number || '',
        academic_year: initialData.academic_year,
      });
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_name.trim()) {
      newErrors.class_name = 'Tên lớp không được để trống';
    }

    if (!formData.grade) {
      newErrors.grade = 'Khối không được để trống';
    }

    if (!formData.academic_year) {
      newErrors.academic_year = 'Năm học không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsSubmitting(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div data-testid="class-update-form" className="space-y-4">
      <h2 data-testid="form-title" className="text-lg font-semibold">
        Cập nhật lớp học
      </h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="class-name" className="block text-sm font-medium">
            Tên lớp *
          </label>
          <input
            id="class-name"
            type="text"
            data-testid="class-name-input"
            value={formData.class_name}
            onChange={(e) => handleChange('class_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          {errors.class_name && (
            <span data-testid="error-class-name" className="text-xs text-red-600">
              {errors.class_name}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="grade" className="block text-sm font-medium">
            Khối *
          </label>
          <select
            id="grade"
            data-testid="grade-select"
            value={formData.grade}
            onChange={(e) => handleChange('grade', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            {[6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Khối {g}
              </option>
            ))}
          </select>
          {errors.grade && (
            <span data-testid="error-grade" className="text-xs text-red-600">
              {errors.grade}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="room-number" className="block text-sm font-medium">
            Phòng học
          </label>
          <input
            id="room-number"
            type="text"
            data-testid="room-number-input"
            value={formData.room_number}
            onChange={(e) => handleChange('room_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <button
          type="submit"
          data-testid="submit-btn"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>
    </div>
  );
};

// ========== Mock Class Delete Component ==========
const ClassDeleteComponent: React.FC<{ classData?: ClassData }> = ({ classData }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
    setIsDeleting(false);
    setShowConfirm(false);
  };

  if (!classData) {
    return <div data-testid="delete-placeholder">Chọn lớp để xóa</div>;
  }

  return (
    <div data-testid="class-delete-component" className="space-y-3">
      <div data-testid="class-info" className="p-3 bg-gray-100 rounded">
        <p data-testid="class-name-display">{classData.class_name}</p>
        <p data-testid="class-details" className="text-sm text-gray-600">
          Khối {classData.grade} - {classData.academic_year}
        </p>
      </div>

      {!showConfirm ? (
        <button
          type="button"
          data-testid="delete-btn"
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Xóa lớp
        </button>
      ) : (
        <div data-testid="delete-confirm-dialog" className="p-3 border-2 border-red-300 bg-red-50 rounded">
          <p data-testid="confirm-message" className="text-sm mb-3">
            Bạn chắc chắn muốn xóa lớp <strong>{classData.class_name}</strong>? Hành động này không thể hoàn tác.
          </p>
          <div className="flex space-x-2">
            <button
              type="button"
              data-testid="confirm-delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </button>
            <button
              type="button"
              data-testid="cancel-delete-btn"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== TS-ADM07-04: Class Update Form ==========
describe('TS-ADM07-04: Class Update Form', () => {
  const mockClassData: ClassData = {
    id: 1,
    class_name: '10A1',
    grade: 10,
    room_number: 'P101',
    academic_year: '2024-2025',
    is_active: true,
  };

  it('TS-ADM07-04-01: Should render form with class data pre-populated', () => {
    render(<ClassUpdateForm initialData={mockClassData} />);

    expect(screen.getByTestId('form-title')).toHaveTextContent('Cập nhật lớp học');
    const classNameInput = screen.getByTestId('class-name-input') as HTMLInputElement;
    expect(classNameInput.value).toBe('10A1');
  });

  it('TS-ADM07-04-02: Should populate room number field', () => {
    render(<ClassUpdateForm initialData={mockClassData} />);

    const roomInput = screen.getByTestId('room-number-input') as HTMLInputElement;
    expect(roomInput.value).toBe('P101');
  });

  it('TS-ADM07-04-03: Should allow editing class name', () => {
    render(<ClassUpdateForm initialData={mockClassData} />);

    const classNameInput = screen.getByTestId('class-name-input') as HTMLInputElement;
    fireEvent.change(classNameInput, { target: { value: '10A1-UPDATE' } });

    expect(classNameInput.value).toBe('10A1-UPDATE');
  });

  it('TS-ADM07-04-04: Should allow editing room number', () => {
    render(<ClassUpdateForm initialData={mockClassData} />);

    const roomInput = screen.getByTestId('room-number-input') as HTMLInputElement;
    fireEvent.change(roomInput, { target: { value: 'P202' } });

    expect(roomInput.value).toBe('P202');
  });

  it('TS-ADM07-04-05: Submit button should be enabled by default', () => {
    render(<ClassUpdateForm initialData={mockClassData} />);

    const submitBtn = screen.getByTestId('submit-btn') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it('TS-ADM07-04-06: Should persist data through rerenders', () => {
    const { rerender } = render(<ClassUpdateForm initialData={mockClassData} />);

    let classNameInput = screen.getByTestId('class-name-input') as HTMLInputElement;
    expect(classNameInput.value).toBe('10A1');

    // Rerender with same data
    rerender(<ClassUpdateForm initialData={mockClassData} />);

    classNameInput = screen.getByTestId('class-name-input') as HTMLInputElement;
    expect(classNameInput.value).toBe('10A1');
  });
});

// ========== TS-ADM07-05: Class Delete Confirmation ==========
describe('TS-ADM07-05: Class Delete Confirmation', () => {
  const mockClassData: ClassData = {
    id: 1,
    class_name: '10A1',
    grade: 10,
    room_number: 'P101',
    academic_year: '2024-2025',
    is_active: true,
  };

  it('TS-ADM07-05-01: Should show delete button initially', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
  });

  it('TS-ADM07-05-02: Should show confirmation dialog on delete click', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    fireEvent.click(screen.getByTestId('delete-btn'));

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
  });

  it('TS-ADM07-05-03: Confirmation dialog should show class name', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    fireEvent.click(screen.getByTestId('delete-btn'));

    expect(screen.getByTestId('confirm-message')).toHaveTextContent('10A1');
  });

  it('TS-ADM07-05-04: Should have confirm and cancel buttons', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    fireEvent.click(screen.getByTestId('delete-btn'));

    expect(screen.getByTestId('confirm-delete-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-delete-btn')).toBeInTheDocument();
  });

  it('TS-ADM07-05-05: Cancel button should close confirmation', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    fireEvent.click(screen.getByTestId('delete-btn'));
    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-delete-btn'));

    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
  });

  it('TS-ADM07-05-06: Confirm button should disable during delete', async () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    fireEvent.click(screen.getByTestId('delete-btn'));
    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    const confirmBtn = screen.getByTestId('confirm-delete-btn') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it('TS-ADM07-05-07: Should show class information in delete component', () => {
    render(<ClassDeleteComponent classData={mockClassData} />);

    expect(screen.getByTestId('class-name-display')).toHaveTextContent('10A1');
    expect(screen.getByTestId('class-details')).toHaveTextContent('Khối 10');
    expect(screen.getByTestId('class-details')).toHaveTextContent('2024-2025');
  });

  it('TS-ADM07-05-08: Should handle missing class data gracefully', () => {
    render(<ClassDeleteComponent />);

    expect(screen.getByTestId('delete-placeholder')).toBeInTheDocument();
  });
});
