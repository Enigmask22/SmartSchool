/**
 * Test Suite: TS-ADM07-02-03 - Class Creation Form & Validation
 * Covers: Class creation form rendering, field validation, duplicate prevention
 * Status: In Development
 * Pattern: Similar to TS-ADM06-02-03 (Subject creation)
 */

import { describe, it, expect} from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';

// ========== Mock Class Data Types ==========
interface ClassFormData {
  class_name: string;
  grade: number | '';
  room_number: string;
  academic_year: string;
  homeroom_teacher_id: number | '';
}

// ========== Mock Class Creation Form Component ==========
const ClassCreationForm: React.FC = () => {
  const [formData, setFormData] = useState<ClassFormData>({
    class_name: '',
    grade: '',
    room_number: '',
    academic_year: '',
    homeroom_teacher_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_name.trim()) {
      newErrors.class_name = 'Tên lớp không được để trống';
    }

    if (formData.grade === '' || formData.grade === 0) {
      newErrors.grade = 'Khối không được để trống';
    }

    if (!formData.academic_year) {
      newErrors.academic_year = 'Năm học không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setSubmitted(true);
      // Reset form
      setFormData({
        class_name: '',
        grade: '',
        room_number: '',
        academic_year: '',
        homeroom_teacher_id: '',
      });
      setErrors({});
    }
  };

  const handleChange = (field: keyof ClassFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field on change
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div data-testid="class-creation-form" className="space-y-4">
      <h2 data-testid="form-title" className="text-lg font-semibold">
        Tạo lớp học mới
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
            placeholder="VD: 10A1"
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
            onChange={(e) => handleChange('grade', parseInt(e.target.value) || '')}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">Chọn khối</option>
            <option value="6">Khối 6</option>
            <option value="7">Khối 7</option>
            <option value="8">Khối 8</option>
            <option value="9">Khối 9</option>
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
          {errors.grade && (
            <span data-testid="error-grade" className="text-xs text-red-600">
              {errors.grade}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="academic-year" className="block text-sm font-medium">
            Năm học *
          </label>
          <select
            id="academic-year"
            data-testid="academic-year-select"
            value={formData.academic_year}
            onChange={(e) => handleChange('academic_year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">Chọn năm học</option>
            <option value="2023-2024">2023-2024</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
          </select>
          {errors.academic_year && (
            <span data-testid="error-academic-year" className="text-xs text-red-600">
              {errors.academic_year}
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
            placeholder="VD: P101"
            value={formData.room_number}
            onChange={(e) => handleChange('room_number', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>

        <button
          type="submit"
          data-testid="submit-btn"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tạo lớp
        </button>
      </form>

      {submitted && (
        <div data-testid="success-message" className="p-3 bg-green-100 text-green-800 rounded">
          Tạo lớp thành công!
        </div>
      )}
    </div>
  );
};

// ========== TS-ADM07-02: Class Creation Form Rendering ==========
describe('TS-ADM07-02: Class Creation Form Rendering', () => {
  it('TS-ADM07-02-01: Should render form with title', () => {
    render(<ClassCreationForm />);

    expect(screen.getByTestId('form-title')).toHaveTextContent('Tạo lớp học mới');
  });

  it('TS-ADM07-02-02: Should render all required input fields', () => {
    render(<ClassCreationForm />);

    expect(screen.getByTestId('class-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('grade-select')).toBeInTheDocument();
    expect(screen.getByTestId('academic-year-select')).toBeInTheDocument();
  });

  it('TS-ADM07-02-03: Should render optional room number field', () => {
    render(<ClassCreationForm />);

    expect(screen.getByTestId('room-number-input')).toBeInTheDocument();
  });

  it('TS-ADM07-02-04: Should render submit button', () => {
    render(<ClassCreationForm />);

    expect(screen.getByTestId('submit-btn')).toHaveTextContent('Tạo lớp');
  });

  it('TS-ADM07-02-05: Grade select should have all grade options', () => {
    render(<ClassCreationForm />);

    const gradeSelect = screen.getByTestId('grade-select') as HTMLSelectElement;
    const options = Array.from(gradeSelect.options).map((opt) => opt.value);

    expect(options).toContain('6');
    expect(options).toContain('9');
    expect(options).toContain('12');
  });
});

// ========== TS-ADM07-03: Class Creation Validation ==========
describe('TS-ADM07-03: Class Creation Validation', () => {
  it('TS-ADM07-03-01: Should reject empty class name', () => {
    render(<ClassCreationForm />);

    fireEvent.change(screen.getByTestId('grade-select'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('academic-year-select'), {
      target: { value: '2024-2025' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(screen.getByTestId('error-class-name')).toBeInTheDocument();
    expect(screen.getByTestId('error-class-name')).toHaveTextContent(
      'Tên lớp không được để trống'
    );
  });

  it('TS-ADM07-03-02: Should reject empty grade', () => {
    render(<ClassCreationForm />);

    fireEvent.change(screen.getByTestId('class-name-input'), { target: { value: '10A1' } });
    fireEvent.change(screen.getByTestId('academic-year-select'), {
      target: { value: '2024-2025' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(screen.getByTestId('error-grade')).toBeInTheDocument();
    expect(screen.getByTestId('error-grade')).toHaveTextContent('Khối không được để trống');
  });

  it('TS-ADM07-03-03: Should reject empty academic year', () => {
    render(<ClassCreationForm />);

    fireEvent.change(screen.getByTestId('class-name-input'), { target: { value: '10A1' } });
    fireEvent.change(screen.getByTestId('grade-select'), { target: { value: '10' } });

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(screen.getByTestId('error-academic-year')).toBeInTheDocument();
    expect(screen.getByTestId('error-academic-year')).toHaveTextContent(
      'Năm học không được để trống'
    );
  });

  it('TS-ADM07-03-04: Should allow submission with valid data', () => {
    render(<ClassCreationForm />);

    fireEvent.change(screen.getByTestId('class-name-input'), { target: { value: '10A1' } });
    fireEvent.change(screen.getByTestId('grade-select'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('academic-year-select'), {
      target: { value: '2024-2025' },
    });

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(screen.getByTestId('success-message')).toBeInTheDocument();
    expect(screen.getByTestId('success-message')).toHaveTextContent('Tạo lớp thành công!');
  });

  it('TS-ADM07-03-05: Should allow optional room number field', () => {
    render(<ClassCreationForm />);

    const roomInput = screen.getByTestId('room-number-input') as HTMLInputElement;
    fireEvent.change(roomInput, { target: { value: 'P101' } });

    expect(roomInput.value).toBe('P101');
  });

  it('TS-ADM07-03-06: Should submit with room number included', () => {
    render(<ClassCreationForm />);

    fireEvent.change(screen.getByTestId('class-name-input'), { target: { value: '10A1' } });
    fireEvent.change(screen.getByTestId('grade-select'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('academic-year-select'), {
      target: { value: '2024-2025' },
    });
    fireEvent.change(screen.getByTestId('room-number-input'), { target: { value: 'P101' } });

    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(screen.getByTestId('success-message')).toBeInTheDocument();
  });
});
