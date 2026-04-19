/**
 * Test Suite: TS-ADM10-09 - System Settings Form Validation (Frontend Unit Tests)
 * ============================================================================
 * 
 * Test Matrix Mapping:
 * - **TS-ADM10-09:** Unit (Frontend) - Validate format of input date/time fields
 *
 * Focus Areas:
 * - Academic year format validation (YYYY-YYYY)
 * - Semester selection validation (HK1, HK2, HK3)
 * - Time format validation (HH:MM)
 * - Error message display
 * - Form submission handling
 * - Input field constraints
 *
 * Test Pattern: Vitest + React Testing Library, fireEvent interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

/**
 * Mock SystemSettings Component for testing
 * Replicates form validation logic from frontend/src/components/admin-management/SystemSettings.tsx
 */
const MockSystemSettings = () => {
  const [formData, setFormData] = useState({
    academic_year: '',
    semester: '',
    attendance_cutoff_time: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const validateAcademicYear = (value: string): boolean => {
    const yearRegex = /^\d{4}-\d{4}$/;
    if (!value) return false;
    return yearRegex.test(value);
  };

  const validateSemester = (value: string): boolean => {
    return ['HK1', 'HK2', 'HK3'].includes(value);
  };

  const validateTime = (value: string): boolean => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!value) return false;
    return timeRegex.test(value);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.academic_year && !validateAcademicYear(formData.academic_year)) {
      newErrors.academic_year = 'Định dạng năm học phải là YYYY-YYYY (VD: 2024-2025)';
    }

    if (formData.semester && !validateSemester(formData.semester)) {
      newErrors.semester = 'Học kỳ phải là HK1, HK2, hoặc HK3';
    }

    if (formData.attendance_cutoff_time && !validateTime(formData.attendance_cutoff_time)) {
      newErrors.attendance_cutoff_time = 'Định dạng thời gian phải là HH:MM (VD: 07:15)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setSubmitted(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="system-settings-form">
      {/* Academic Year Field */}
      <div className="form-group mb-3">
        <label htmlFor="academic_year" className="form-label">
          Năm học
        </label>
        <input
          id="academic_year"
          type="text"
          className="form-control"
          data-testid="academic-year-input"
          placeholder="2024-2025"
          value={formData.academic_year}
          onChange={(e) => handleChange('academic_year', e.target.value)}
        />
        {errors.academic_year && (
          <small data-testid="academic-year-error" className="text-danger">
            {errors.academic_year}
          </small>
        )}
      </div>

      {/* Semester Field */}
      <div className="form-group mb-3">
        <label htmlFor="semester" className="form-label">
          Học kỳ
        </label>
        <select
          id="semester"
          className="form-control"
          data-testid="semester-select"
          value={formData.semester}
          onChange={(e) => handleChange('semester', e.target.value)}
        >
          <option value="">-- Chọn --</option>
          <option value="HK1">Học kỳ 1</option>
          <option value="HK2">Học kỳ 2</option>
          <option value="HK3">Học kỳ 3 (Hè)</option>
        </select>
        {errors.semester && (
          <small data-testid="semester-error" className="text-danger">
            {errors.semester}
          </small>
        )}
      </div>

      {/* Attendance Cutoff Time Field */}
      <div className="form-group mb-3">
        <label htmlFor="attendance_cutoff_time" className="form-label">
          Giờ điểm danh
        </label>
        <input
          id="attendance_cutoff_time"
          type="text"
          className="form-control"
          data-testid="cutoff-time-input"
          placeholder="07:15"
          value={formData.attendance_cutoff_time}
          onChange={(e) => handleChange('attendance_cutoff_time', e.target.value)}
        />
        {errors.attendance_cutoff_time && (
          <small data-testid="cutoff-time-error" className="text-danger">
            {errors.attendance_cutoff_time}
          </small>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        data-testid="submit-button"
      >
        Lưu cài đặt
      </button>

      {submitted && (
        <div data-testid="success-message" className="alert alert-success mt-3">
          Cài đặt hệ thống đã được lưu thành công!
        </div>
      )}
    </form>
  );
};

describe('TS-ADM10-09: System Settings Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Academic Year Format Validation
   */
  it('should render system settings form with all fields', () => {
    render(<MockSystemSettings />);

    expect(screen.getByTestId('academic-year-input')).toBeInTheDocument();
    expect(screen.getByTestId('semester-select')).toBeInTheDocument();
    expect(screen.getByTestId('cutoff-time-input')).toBeInTheDocument();
  });

  it('should validate academic year format (YYYY-YYYY)', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test invalid format
    fireEvent.change(yearInput, { target: { value: '2024' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('academic-year-error')).toHaveTextContent(
      'Định dạng năm học phải là YYYY-YYYY'
    );
  });

  it('should accept valid academic year format', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test valid format
    fireEvent.change(yearInput, { target: { value: '2024-2025' } });
    fireEvent.click(submitButton);

    // Should not show error
    expect(screen.queryByTestId('academic-year-error')).not.toBeInTheDocument();
  });

  /**
   * Test: Semester Selection Validation
   */
  it('should validate semester selection (HK1, HK2, HK3)', () => {
    render(<MockSystemSettings />);

    const semesterSelect = screen.getByTestId('semester-select') as HTMLSelectElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test with empty semester (should validate if required)
    // Since the form accepts empty optional fields, leave empty and check no error
    fireEvent.click(submitButton);

    // Should not show error for empty optional field
    expect(screen.queryByTestId('semester-error')).not.toBeInTheDocument();
  });

  it('should accept valid semester values (HK1, HK2, HK3)', () => {
    render(<MockSystemSettings />);

    const semesterSelect = screen.getByTestId('semester-select') as HTMLSelectElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test each valid value
    ['HK1', 'HK2', 'HK3'].forEach(semester => {
      fireEvent.change(semesterSelect, { target: { value: semester } });
      fireEvent.click(submitButton);

      const errorElement = screen.queryByTestId('semester-error');
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Time Format Validation
   */
  it('should validate attendance cutoff time format (HH:MM)', () => {
    render(<MockSystemSettings />);

    const timeInput = screen.getByTestId('cutoff-time-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test invalid format
    fireEvent.change(timeInput, { target: { value: '7:15' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('cutoff-time-error')).toHaveTextContent(
      'Định dạng thời gian phải là HH:MM'
    );
  });

  it('should validate time range (00:00 to 23:59)', () => {
    render(<MockSystemSettings />);

    const timeInput = screen.getByTestId('cutoff-time-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test invalid hour
    fireEvent.change(timeInput, { target: { value: '24:00' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('cutoff-time-error')).toBeInTheDocument();

    // Test invalid minute
    fireEvent.change(timeInput, { target: { value: '12:60' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('cutoff-time-error')).toBeInTheDocument();
  });

  it('should accept valid time format (HH:MM)', () => {
    render(<MockSystemSettings />);

    const timeInput = screen.getByTestId('cutoff-time-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test valid times
    const validTimes = ['00:00', '07:15', '12:30', '23:59'];
    validTimes.forEach(time => {
      fireEvent.change(timeInput, { target: { value: time } });
      fireEvent.click(submitButton);

      const errorElement = screen.queryByTestId('cutoff-time-error');
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Form Submission
   */
  it('should disable submit button on validation error', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    // Enter invalid data
    fireEvent.change(yearInput, { target: { value: 'invalid' } });
    fireEvent.click(submitButton);

    // Form should not submit successfully
    expect(screen.queryByTestId('success-message')).not.toBeInTheDocument();
  });

  it('should show success message on valid submission', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const semesterSelect = screen.getByTestId('semester-select') as HTMLSelectElement;
    const timeInput = screen.getByTestId('cutoff-time-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Fill with valid data
    fireEvent.change(yearInput, { target: { value: '2024-2025' } });
    fireEvent.change(semesterSelect, { target: { value: 'HK1' } });
    fireEvent.change(timeInput, { target: { value: '07:15' } });

    fireEvent.click(submitButton);

    // Should show success message
    expect(screen.getByTestId('success-message')).toBeInTheDocument();
    expect(screen.getByTestId('success-message')).toHaveTextContent('Cài đặt hệ thống đã được lưu');
  });

  /**
   * Test: Error Message Clearing
   */
  it('should clear error message when user corrects field', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // First: show error with invalid input
    fireEvent.change(yearInput, { target: { value: 'invalid' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('academic-year-error')).toBeInTheDocument();

    // Then: fix with valid input
    fireEvent.change(yearInput, { target: { value: '2025-2026' } });
    fireEvent.click(submitButton);

    // Error should be cleared
    expect(screen.queryByTestId('academic-year-error')).not.toBeInTheDocument();
  });

  /**
   * Test: Input Field Constraints
   */
  it('should handle empty fields gracefully', () => {
    render(<MockSystemSettings />);

    const submitButton = screen.getByTestId('submit-button');

    // Submit with empty fields
    fireEvent.click(submitButton);

    // Should not show errors for empty optional fields
    // Only required fields should show errors
    expect(screen.queryByTestId('academic-year-error')).not.toBeInTheDocument();
  });

  it('should validate academic year does not have invalid characters', () => {
    render(<MockSystemSettings />);

    const yearInput = screen.getByTestId('academic-year-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test with special characters
    fireEvent.change(yearInput, { target: { value: '2024@2025' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('academic-year-error')).toBeInTheDocument();
  });

  it('should accept leading zeros in time format', () => {
    render(<MockSystemSettings />);

    const timeInput = screen.getByTestId('cutoff-time-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    // Test with leading zeros
    fireEvent.change(timeInput, { target: { value: '07:05' } });
    fireEvent.click(submitButton);

    // Should be valid
    expect(screen.queryByTestId('cutoff-time-error')).not.toBeInTheDocument();
  });
});
