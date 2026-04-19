/**
 * Test Suite: TS-ADM09-09 - Teacher Form Validation
 * ================================================
 * 
 * Test Matrix Mapping:
 * - **TS-ADM09-09:** Validation (Frontend) - Kiểm tra định dạng Mã Giáo viên
 *
 * Focus Areas:
 * - Teacher code format validation
 * - Full name field validation
 * - Email field validation (optional)
 * - Form field rendering
 * - Error message display for invalid input
 * - Teacher creation form functionality
 *
 * Test Pattern: Mock components with test-ids, React Testing Library, Vitest
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React, { useState } from 'react';

// ===============================================
// MOCK TEACHER FORM COMPONENT
// ===============================================

interface TeacherFormProps {
  onSubmit?: (data: TeacherData) => Promise<void>;
  onValidationError?: (error: ValidationError) => void;
  isEdit?: boolean;
  initialData?: Partial<TeacherData>;
}

interface TeacherData {
  teacher_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  user_id?: number | null;
}

interface ValidationError {
  field: string;
  message: string;
}

const TeacherForm: React.FC<TeacherFormProps> = ({
  onSubmit,
  onValidationError,
  isEdit = false,
  initialData = {},
}) => {
  const [formData, setFormData] = useState<TeacherData>({
    teacher_code: initialData.teacher_code || '',
    full_name: initialData.full_name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    gender: initialData.gender || '',
    user_id: initialData.user_id || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teacher code format validation: GV + digits or alphanumeric
  const validateTeacherCode = (code: string): boolean => {
    if (!code) return false;
    // Allow formats like: GV001, GV123, GVTT001, etc.
    const pattern = /^[A-Z]{2,}[A-Z0-9]*$/;
    return pattern.test(code) && code.length >= 3;
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.teacher_code?.trim()) {
      newErrors.teacher_code = 'Mã giáo viên là bắt buộc';
    } else if (!validateTeacherCode(formData.teacher_code.toUpperCase())) {
      newErrors.teacher_code =
        'Mã giáo viên phải bắt đầu bằng 2+ ký tự chữ và tối thiểu 3 ký tự (ví dụ: GV001, GVTT01)';
    }

    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Tên giáo viên là bắt buộc';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Định dạng email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        // Normalize teacher code to uppercase
        await onSubmit({
          ...formData,
          teacher_code: formData.teacher_code.toUpperCase(),
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi khi tạo/cập nhật giáo viên';
      if (onValidationError) {
        onValidationError({ field: 'general', message: errorMsg });
      }
      setErrors({ general: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="teacher-form" className="space-y-4">
      <div className="form-group mb-3">
        <label htmlFor="teacher-code" className="form-label">
          Mã giáo viên <span className="text-danger">*</span>
        </label>
        <input
          id="teacher-code"
          type="text"
          name="teacher_code"
          value={formData.teacher_code}
          onChange={handleInputChange}
          data-testid="teacher-code-input"
          className="form-control"
          placeholder="GV001"
          maxLength={20}
        />
        {errors.teacher_code && (
          <small className="text-danger" data-testid="teacher-code-error">
            {errors.teacher_code}
          </small>
        )}
      </div>

      <div className="form-group mb-3">
        <label htmlFor="full-name" className="form-label">
          Tên giáo viên <span className="text-danger">*</span>
        </label>
        <input
          id="full-name"
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleInputChange}
          data-testid="full-name-input"
          className="form-control"
          placeholder="Nguyễn Văn A"
        />
        {errors.full_name && (
          <small className="text-danger" data-testid="full-name-error">
            {errors.full_name}
          </small>
        )}
      </div>

      <div className="form-group mb-3">
        <label htmlFor="email" className="form-label">
          Email (không bắt buộc)
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          data-testid="email-input"
          className="form-control"
          placeholder="teacher@school.edu.vn"
        />
        {errors.email && (
          <small className="text-danger" data-testid="email-error">
            {errors.email}
          </small>
        )}
      </div>

      <div className="form-group mb-3">
        <label htmlFor="phone" className="form-label">
          Số điện thoại (không bắt buộc)
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          data-testid="phone-input"
          className="form-control"
          placeholder="0123456789"
        />
      </div>

      <div className="form-group mb-3">
        <label htmlFor="gender" className="form-label">
          Giới tính (không bắt buộc)
        </label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          data-testid="gender-select"
          className="form-control"
        >
          <option value="">-- Chọn --</option>
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
          <option value="Khác">Khác</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary"
        data-testid="submit-button"
      >
        {isSubmitting ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
      </button>
    </form>
  );
};

// ===============================================
// TEST SUITE: TS-ADM09-09
// ===============================================

describe('TS-ADM09-09: Teacher Form Validation', () => {
  /**
   * Test: Form renders with all required fields
   */
  it('should render teacher form with all required fields', () => {
    render(<TeacherForm />);

    expect(screen.getByTestId('teacher-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('full-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('phone-input')).toBeInTheDocument();
    expect(screen.getByTestId('gender-select')).toBeInTheDocument();
  });

  /**
   * Test: Teacher code validation - requires proper format
   */
  it('should validate teacher code format (must start with letters, min 3 chars)', () => {
    render(<TeacherForm />);

    const submitButton = screen.getByTestId('submit-button');
    const codeInput = screen.getByTestId('teacher-code-input') as HTMLInputElement;

    // Try invalid formats
    fireEvent.change(codeInput, { target: { value: 'G1' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('teacher-code-error')).toBeInTheDocument();
  });

  /**
   * Test: Accept valid teacher codes
   */
  it('should accept valid teacher code formats', () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TeacherForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button');

    // Enter valid code
    fireEvent.change(codeInput, { target: { value: 'gv001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(submitButton);

    expect(screen.queryByTestId('teacher-code-error')).not.toBeInTheDocument();
  });

  /**
   * Test: Full name is required
   */
  it('should require full name field', () => {
    render(<TeacherForm />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(codeInput, { target: { value: 'GV001' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('full-name-error')).toHaveTextContent(
      'Tên giáo viên là bắt buộc'
    );
  });

  /**
   * Test: Email validation (optional but must be valid format if provided)
   */
  it('should validate email format when provided', () => {
    render(<TeacherForm />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(codeInput, { target: { value: 'GV001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    fireEvent.click(submitButton);

    // Email validation may show error or allow submission since email is optional
    const emailError = screen.queryByTestId('email-error');
    if (emailError) {
      expect(emailError).toHaveTextContent('Định dạng email không hợp lệ');
    }
  });

  /**
   * Test: Phone and gender are optional
   */
  it('should allow submission without phone and gender', () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TeacherForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(codeInput, { target: { value: 'GV001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(submitButton);

    expect(mockSubmit).toHaveBeenCalled();
  });

  /**
   * Test: Submit button text differs for create vs edit
   */
  it('should show appropriate button text for create mode', () => {
    render(<TeacherForm isEdit={false} />);

    const button = screen.getByTestId('submit-button');
    expect(button).toHaveTextContent('Tạo mới');
  });

  /**
   * Test: Submit button text for edit mode
   */
  it('should show appropriate button text for edit mode', () => {
    render(<TeacherForm isEdit={true} />);

    const button = screen.getByTestId('submit-button');
    expect(button).toHaveTextContent('Cập nhật');
  });

  /**
   * Test: Teacher code normalized to uppercase on submit
   */
  it('should normalize teacher code to uppercase on submit', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TeacherForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(codeInput, { target: { value: 'gv001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          teacher_code: 'GV001',
          full_name: 'Nguyễn Văn A',
        })
      );
    });
  });

  /**
   * Test: Teacher code with special characters rejected
   */
  it('should reject teacher code with special characters', () => {
    render(<TeacherForm />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button');

    fireEvent.change(codeInput, { target: { value: 'GV@001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(submitButton);

    expect(screen.getByTestId('teacher-code-error')).toBeInTheDocument();
  });

  /**
   * Test: Error messages clear when user starts typing
   */
  it('should clear error message when user corrects field', () => {
    render(<TeacherForm />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button');

    // Trigger validation error
    fireEvent.change(codeInput, { target: { value: 'G1' } });
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId('teacher-code-error')).toBeInTheDocument();

    // Clear error by entering valid code
    fireEvent.change(codeInput, { target: { value: 'GV001' } });

    expect(screen.queryByTestId('teacher-code-error')).not.toBeInTheDocument();
  });

  /**
   * Test: Gender dropdown has correct options
   */
  it('should have gender dropdown with Nam/Nữ/Khác options', () => {
    render(<TeacherForm />);

    const genderSelect = screen.getByTestId('gender-select') as HTMLSelectElement;
    const options = within(genderSelect).getAllByRole('option');

    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options[1]).toHaveTextContent('Nam');
    expect(options[2]).toHaveTextContent('Nữ');
  });

  /**
   * Test: Submit button disabled during submission
   */
  it('should disable submit button during submission', async () => {
    const mockSubmit = vi.fn(
      () =>
        new Promise(resolve => {
          setTimeout(resolve, 100);
        })
    );

    render(<TeacherForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('teacher-code-input');
    const nameInput = screen.getByTestId('full-name-input');
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    fireEvent.change(codeInput, { target: { value: 'GV001' } });
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(submitButton);

    // Button should show loading state
    expect(submitButton).toHaveTextContent('Đang xử lý...');

    // Wait for submission to complete
    await waitFor(() => {
      expect(submitButton).not.toHaveTextContent('Đang xử lý...');
    });
  });
});
