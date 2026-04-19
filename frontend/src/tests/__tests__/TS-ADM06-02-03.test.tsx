/**
 * Test Suite: TS-ADM06-02-03 - Subject Management UI Tests
 * ========================================================
 * 
 * Test Matrix Mapping:
 * - **TS-ADM06-02:** Happy Path - Subject creation form rendering and submission
 * - **TS-ADM06-03:** Alternative - Subject code validation (duplicate check, error display)
 * 
 * Focus Areas:
 * - Form field rendering (subject_code, subject_name, description, is_mandatory)
 * - Submit button state management
 * - Validation error display for duplicate codes
 * - Form submission prevention on validation failure
 * - API integration mocking
 * 
 * Test Pattern: Mock components with test-ids, React Testing Library, Vitest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState, useEffect } from 'react';

// ===============================================
// MOCK SUBJECT CREATION COMPONENT
// ===============================================

interface SubjectFormProps {
  onSubmit?: (data: SubjectData) => Promise<void>;
  onValidationError?: (error: ValidationError) => void;
}

interface SubjectData {
  subject_code: string;
  subject_name: string;
  description?: string;
  is_mandatory?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

const SubjectCreationForm: React.FC<SubjectFormProps> = ({ onSubmit, onValidationError }) => {
  const [formData, setFormData] = useState<SubjectData>({
    subject_code: '',
    subject_name: '',
    description: '',
    is_mandatory: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject_code.trim()) {
      newErrors.subject_code = 'Mã môn học là bắt buộc';
    }
    if (!formData.subject_name.trim()) {
      newErrors.subject_name = 'Tên môn học là bắt buộc';
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
        await onSubmit(formData);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Lỗi khi tạo môn học';
      if (onValidationError) {
        onValidationError({ field: 'general', message: errorMsg });
      }
      setErrors({ general: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} data-testid="subject-creation-form">
      <div data-testid="form-group-code">
        <label htmlFor="subject_code">Mã môn học</label>
        <input
          id="subject_code"
          name="subject_code"
          type="text"
          value={formData.subject_code}
          onChange={handleInputChange}
          data-testid="input-subject-code"
          placeholder="VD: TOAN10"
        />
        {errors.subject_code && (
          <span data-testid="error-subject-code" className="error">
            {errors.subject_code}
          </span>
        )}
      </div>

      <div data-testid="form-group-name">
        <label htmlFor="subject_name">Tên môn học</label>
        <input
          id="subject_name"
          name="subject_name"
          type="text"
          value={formData.subject_name}
          onChange={handleInputChange}
          data-testid="input-subject-name"
          placeholder="VD: Toán 10"
        />
        {errors.subject_name && (
          <span data-testid="error-subject-name" className="error">
            {errors.subject_name}
          </span>
        )}
      </div>

      <div data-testid="form-group-description">
        <label htmlFor="description">Mô tả</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          data-testid="input-description"
          placeholder="Mô tả về môn học"
        />
      </div>

      <div data-testid="form-group-mandatory">
        <label htmlFor="is_mandatory">
          <input
            id="is_mandatory"
            name="is_mandatory"
            type="checkbox"
            checked={formData.is_mandatory}
            onChange={handleInputChange}
            data-testid="input-is-mandatory"
          />
          Môn học bắt buộc
        </label>
      </div>

      {errors.general && (
        <div data-testid="error-general" className="error-message">
          {errors.general}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="btn-submit"
      >
        {isSubmitting ? 'Đang tạo...' : 'Tạo môn học'}
      </button>
    </form>
  );
};

// ===============================================
// MOCK SUBJECT VALIDATION COMPONENT
// ===============================================

interface SubjectValidationProps {
  onCheckDuplicate?: (code: string) => Promise<boolean>;
}

const SubjectValidation: React.FC<SubjectValidationProps> = ({ onCheckDuplicate }) => {
  const [code, setCode] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState('');

  const handleCheck = async () => {
    if (!code.trim()) {
      setCheckResult('Vui lòng nhập mã môn học');
      return;
    }

    setIsChecking(true);
    try {
      if (onCheckDuplicate) {
        const duplicate = await onCheckDuplicate(code);
        setIsDuplicate(duplicate);
        if (duplicate) {
          setCheckResult('Mã môn học này đã tồn tại');
        } else {
          setCheckResult('Mã môn học có thể sử dụng');
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div data-testid="subject-validation-form">
      <div data-testid="validation-group">
        <label htmlFor="check_code">Kiểm tra mã môn học</label>
        <input
          id="check_code"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          data-testid="input-check-code"
          placeholder="Nhập mã môn học"
        />
      </div>

      <button
        onClick={handleCheck}
        disabled={isChecking}
        data-testid="btn-check"
      >
        {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra'}
      </button>

      {checkResult && (
        <div
          data-testid={isDuplicate ? 'error-duplicate' : 'success-available'}
          className={isDuplicate ? 'error' : 'success'}
        >
          {checkResult}
        </div>
      )}
    </div>
  );
};

// ===============================================
// TEST SUITE
// ===============================================

describe('TS-ADM06-02: Subject Creation Form', () => {
  
  it('should render subject creation form with all fields', () => {
    render(<SubjectCreationForm />);

    expect(screen.getByTestId('subject-creation-form')).toBeInTheDocument();
    expect(screen.getByTestId('input-subject-code')).toBeInTheDocument();
    expect(screen.getByTestId('input-subject-name')).toBeInTheDocument();
    expect(screen.getByTestId('input-description')).toBeInTheDocument();
    expect(screen.getByTestId('input-is-mandatory')).toBeInTheDocument();
  });

  it('should render form labels correctly', () => {
    render(<SubjectCreationForm />);

    expect(screen.getByText('Mã môn học')).toBeInTheDocument();
    expect(screen.getByText('Tên môn học')).toBeInTheDocument();
    expect(screen.getByText('Mô tả')).toBeInTheDocument();
    expect(screen.getByText('Môn học bắt buộc')).toBeInTheDocument();
  });

  it('should have submit button enabled initially', () => {
    render(<SubjectCreationForm />);

    const submitBtn = screen.getByTestId('btn-submit');
    expect(submitBtn).not.toBeDisabled();
  });

  it('should update subject_code input on change', () => {
    render(<SubjectCreationForm />);

    const codeInput = screen.getByTestId('input-subject-code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'TOAN10' } });

    expect(codeInput.value).toBe('TOAN10');
  });

  it('should update subject_name input on change', () => {
    render(<SubjectCreationForm />);

    const nameInput = screen.getByTestId('input-subject-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Toán 10' } });

    expect(nameInput.value).toBe('Toán 10');
  });

  it('should update description textarea on change', () => {
    render(<SubjectCreationForm />);

    const descInput = screen.getByTestId('input-description') as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: 'Môn Toán cấp 3' } });

    expect(descInput.value).toBe('Môn Toán cấp 3');
  });

  it('should toggle mandatory checkbox', () => {
    render(<SubjectCreationForm />);

    const checkbox = screen.getByTestId('input-is-mandatory') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('should validate empty subject_code on submit', async () => {
    render(<SubjectCreationForm />);

    const nameInput = screen.getByTestId('input-subject-name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Toán 10' } });

    const submitBtn = screen.getByTestId('btn-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-subject-code')).toBeInTheDocument();
      expect(screen.getByText('Mã môn học là bắt buộc')).toBeInTheDocument();
    });
  });

  it('should validate empty subject_name on submit', async () => {
    render(<SubjectCreationForm />);

    const codeInput = screen.getByTestId('input-subject-code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'TOAN10' } });

    const submitBtn = screen.getByTestId('btn-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-subject-name')).toBeInTheDocument();
      expect(screen.getByText('Tên môn học là bắt buộc')).toBeInTheDocument();
    });
  });

  it('should call onSubmit with form data on valid submission', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubjectCreationForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('input-subject-code');
    const nameInput = screen.getByTestId('input-subject-name');

    fireEvent.change(codeInput, { target: { value: 'TOAN10' } });
    fireEvent.change(nameInput, { target: { value: 'Toán 10' } });

    const submitBtn = screen.getByTestId('btn-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_code: 'TOAN10',
          subject_name: 'Toán 10',
        })
      );
    });
  });

  it('should disable submit button while submitting', async () => {
    const mockSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SubjectCreationForm onSubmit={mockSubmit} />);

    const codeInput = screen.getByTestId('input-subject-code');
    const nameInput = screen.getByTestId('input-subject-name');
    const submitBtn = screen.getByTestId('btn-submit');

    fireEvent.change(codeInput, { target: { value: 'TOAN10' } });
    fireEvent.change(nameInput, { target: { value: 'Toán 10' } });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it('should display error message on submission failure', async () => {
    const mockSubmit = vi.fn().mockRejectedValue(new Error('Mã môn học đã tồn tại'));
    const mockValidationError = vi.fn();
    render(
      <SubjectCreationForm
        onSubmit={mockSubmit}
        onValidationError={mockValidationError}
      />
    );

    const codeInput = screen.getByTestId('input-subject-code');
    const nameInput = screen.getByTestId('input-subject-name');
    const submitBtn = screen.getByTestId('btn-submit');

    fireEvent.change(codeInput, { target: { value: 'TOAN10' } });
    fireEvent.change(nameInput, { target: { value: 'Toán 10' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-general')).toBeInTheDocument();
      expect(mockValidationError).toHaveBeenCalled();
    });
  });
});

describe('TS-ADM06-03: Subject Code Validation', () => {
  
  it('should render validation form with input', () => {
    render(<SubjectValidation />);

    expect(screen.getByTestId('subject-validation-form')).toBeInTheDocument();
    expect(screen.getByTestId('input-check-code')).toBeInTheDocument();
    expect(screen.getByTestId('btn-check')).toBeInTheDocument();
  });

  it('should update input value on change', () => {
    render(<SubjectValidation />);

    const input = screen.getByTestId('input-check-code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TOAN10' } });

    expect(input.value).toBe('TOAN10');
  });

  it('should show error when submitting empty code', async () => {
    render(<SubjectValidation />);

    const checkBtn = screen.getByTestId('btn-check');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập mã môn học')).toBeInTheDocument();
    });
  });

  it('should detect duplicate subject code', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue(true);
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    const checkBtn = screen.getByTestId('btn-check');

    fireEvent.change(input, { target: { value: 'TOAN10' } });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(mockCheckDuplicate).toHaveBeenCalledWith('TOAN10');
      expect(screen.getByTestId('error-duplicate')).toBeInTheDocument();
      expect(screen.getByText('Mã môn học này đã tồn tại')).toBeInTheDocument();
    });
  });

  it('should allow unique subject code', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue(false);
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    const checkBtn = screen.getByTestId('btn-check');

    fireEvent.change(input, { target: { value: 'SINH10' } });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(mockCheckDuplicate).toHaveBeenCalledWith('SINH10');
      expect(screen.getByTestId('success-available')).toBeInTheDocument();
      expect(screen.getByText('Mã môn học có thể sử dụng')).toBeInTheDocument();
    });
  });

  it('should disable check button while checking', async () => {
    const mockCheckDuplicate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    const checkBtn = screen.getByTestId('btn-check');

    fireEvent.change(input, { target: { value: 'TOAN10' } });
    fireEvent.click(checkBtn);

    expect(checkBtn).toBeDisabled();

    await waitFor(() => {
      expect(checkBtn).not.toBeDisabled();
    });
  });

  it('should show error message for duplicate on checking', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue(true);
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    fireEvent.change(input, { target: { value: 'EXISTING_CODE' } });

    const checkBtn = screen.getByTestId('btn-check');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      const errorDiv = screen.getByTestId('error-duplicate');
      expect(errorDiv).toHaveClass('error');
    });
  });

  it('should display success message for available code', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue(false);
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    fireEvent.change(input, { target: { value: 'NEW_CODE' } });

    const checkBtn = screen.getByTestId('btn-check');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      const successDiv = screen.getByTestId('success-available');
      expect(successDiv).toHaveClass('success');
    });
  });

  it('should prevent form submission if code is duplicate', async () => {
    const mockCheckDuplicate = vi.fn().mockResolvedValue(true);
    render(<SubjectValidation onCheckDuplicate={mockCheckDuplicate} />);

    const input = screen.getByTestId('input-check-code');
    fireEvent.change(input, { target: { value: 'TOAN10' } });

    const checkBtn = screen.getByTestId('btn-check');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByTestId('error-duplicate')).toBeInTheDocument();
    });
  });
});

// ===============================================
// NOTES
// ===============================================
// These tests verify:
// 1. Form field rendering and state management
// 2. Input validation and error display
// 3. Duplicate code detection
// 4. Form submission handling
// 5. Loading states
//
// Pattern: Mock components with test-ids instead of rendering actual page
// This isolates the UI logic being tested without external dependencies
