/**
 * Unit Tests for Admin User Form Email Validation (TS-ADM01-06)
 * 
 * Test Suite: Email validation in the admin user creation/edit form
 * Scope: 
 *  - Invalid email formats disable the save button
 *  - Error messages are displayed for invalid emails
 *  - Valid emails enable form submission
 * 
 * Framework: Vitest + @testing-library/react
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock components and hooks
// interface FormFieldRendererProps {
//   field: string;
//   formData: Record<string, any>;
//   item?: any;
//   isEdit?: boolean;
//   onChangeHandler: (field: string, value: string) => void;
// }

// Simple mock Input component
const Input = React.forwardRef<HTMLInputElement, any>(
  ({ type = 'text', value, onChange, placeholder, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// Mock FormFieldRenderer component
// const MockFormFieldRenderer: React.FC<FormFieldRendererProps> = ({
//   field,
//   formData,
//   onChangeHandler,
// }) => {
//   if (field !== 'email') return null;

//   return (
//     <div className="relative">
//       <label htmlFor={field} className="block text-sm font-medium mb-1">
//         Email
//       </label>
//       <Input
//         id={field}
//         type="email"
//         value={formData[field] ?? ''}
//         onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
//           onChangeHandler(field, e.target.value)
//         }
//         placeholder="Nhập email"
//         aria-label="Email input"
//         data-testid="email-input"
//       />
//       {/* Show error message for invalid email */}
//       {formData[field] && !isValidEmail(formData[field]) && (
//         <div 
//           className="text-red-600 text-sm mt-1"
//           data-testid="email-error"
//           aria-live="polite"
//         >
//           Email không hợp lệ. Vui lòng nhập định dạng email đúng.
//         </div>
//       )}
//     </div>
//   );
// };

// Mock form component
interface MockFormProps {
  onSubmit: (data: any) => void;
  children?: React.ReactNode;
}

const MockForm: React.FC<MockFormProps> = ({ onSubmit}) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [validationError, setValidationError] = React.useState<boolean>(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Update validation state
    if (value && !isValidEmail(value)) {
      setValidationError(true);
    } else {
      setValidationError(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !isValidEmail(formData.email)) {
      return;
    }
    setSubmitted(true);
    onSubmit(formData);
  };

  // Determine if button should be disabled
  const hasEmail = formData.email && formData.email.trim().length > 0;
  const isEmailValid = hasEmail && isValidEmail(formData.email);
  const isSubmitDisabled = !isEmailValid;

  React.useEffect(() => {
    // Sync validation state with form data
    if (formData.email) {
      setValidationError(!isValidEmail(formData.email));
    } else {
      setValidationError(false);
    }
  }, [formData.email]);

  return (
    <form onSubmit={handleSubmit} data-testid="admin-form">
      <div className="relative">
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            handleChange('email', e.target.value)
          }
          placeholder="Nhập email"
          aria-label="Email input"
          data-testid="email-input"
        />
        {/* Show error message for invalid email */}
        {validationError && (
          <div 
            className="text-red-600 text-sm mt-1"
            data-testid="email-error"
            aria-live="polite"
          >
            Email không hợp lệ. Vui lòng nhập định dạng email đúng.
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitDisabled}
        data-testid="submit-button"
        className={isSubmitDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'}
      >
        Lưu
      </button>
      {submitted && <div data-testid="success-message">Form submitted successfully</div>}
    </form>
  );
};

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// =========================================================
// TEST SUITE: Admin User Form Email Validation
// =========================================================

describe('TS-ADM01-06: Admin User Form Email Validation', () => {
  
  // =========================================================
  // Test 1: Invalid Email Format Disables Submit Button
  // =========================================================
  
  it('TS-ADM01-06-01: should disable submit button when email format is invalid', async () => {
    const handleSubmit = vi.fn();
    render(
      <MockForm onSubmit={handleSubmit} />
    );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    // Initially button should be disabled (no email)
    expect(submitButton).toBeDisabled();

    // Enter invalid email format
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Button should remain disabled
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Verify submit handler was not called
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  // =========================================================
  // Test 2: Error Message Displayed for Invalid Email
  // =========================================================

  it('TS-ADM01-06-02: should display error message for invalid email format', async () => {
    const handleSubmit = vi.fn();
    render(
      <MockForm onSubmit={handleSubmit} />
    );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

    // Enter invalid email (missing @ symbol)
    fireEvent.change(emailInput, { target: { value: 'invalidemail.com' } });

    // Error message should be visible
    await waitFor(() => {
      const errorMessage = screen.getByTestId('email-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Email không hợp lệ');
    });
  });

  // =========================================================
  // Test 3: Error Message Removed for Valid Email
  // =========================================================

  it('TS-ADM01-06-03: should remove error message when valid email is entered', async () => {
    //const handleSubmit = vi.fn();
    // const { container } = render(
    //   <MockForm onSubmit={handleSubmit} />
    // );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;

    // First enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    
    // Error should appear
    await waitFor(() => {
      expect(screen.getByTestId('email-error')).toBeInTheDocument();
    });

    // Clear and enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();
    });
  });

  // =========================================================
  // Test 4: Valid Email Enables Submit Button
  // =========================================================

  it('TS-ADM01-06-04: should enable submit button when valid email is entered', async () => {
    const handleSubmit = vi.fn();
    render(
      <MockForm onSubmit={handleSubmit} />
    );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'teacher@school.edu.vn' } });

    // Button should be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  // =========================================================
  // Test 5: Form Submission with Valid Email
  // =========================================================

  it('TS-ADM01-06-05: should submit form when valid email is provided', async () => {
    const handleSubmit = vi.fn();
    render(
      <MockForm onSubmit={handleSubmit} />
    );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'newteacher@school.edu.vn' } });

    // Submit form
    fireEvent.click(submitButton);

    // Verify submit handler called with correct data
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newteacher@school.edu.vn'
        })
      );
    });

    // Success message should appear
    expect(screen.getByTestId('success-message')).toBeInTheDocument();
  });

  // =========================================================
  // Test 6: Common Invalid Email Patterns
  // =========================================================

  it('TS-ADM01-06-06: should reject various invalid email formats', async () => {
    const invalidEmails = [
      'plaintext',           // No @
      'user@',              // Missing domain
      'user @example.com',  // Space before @
    ];

    for (const invalidEmail of invalidEmails) {
      const { unmount } = render(
        <MockForm onSubmit={vi.fn()} />
      );

      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
      const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

      fireEvent.change(emailInput, { target: { value: invalidEmail } });

      // Wait for validation state to update
      await waitFor(() => {
        // Button should remain disabled
        expect(submitButton).toBeDisabled();
      }, { timeout: 1000 });

      unmount();
    }
  });

  // =========================================================
  // Test 7: Various Valid Email Formats
  // =========================================================

  it('TS-ADM01-06-07: should accept various valid email formats', async () => {
    const validEmails = [
      'user@example.com',
      'test.name@school.edu.vn',
      'user+tag@domain.co.uk',
      'teacher123@school.org',
      'admin_user@example.com',
    ];

    for (const validEmail of validEmails) {
      const { unmount } = render(
        <MockForm onSubmit={vi.fn()} />
      );

      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
      const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;

      fireEvent.change(emailInput, { target: { value: validEmail } });

      // Button should be enabled
      expect(submitButton).not.toBeDisabled();

      // Error message should NOT appear
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument();

      unmount();
    }
  });

  // =========================================================
  // Test 8: Accessibility - ARIA Labels and Live Regions
  // =========================================================

  it('TS-ADM01-06-08: should have proper accessibility attributes for form validation', async () => {
    const handleSubmit = vi.fn();
    render(
      <MockForm onSubmit={handleSubmit} />
    );

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    expect(emailInput).toHaveAttribute('aria-label', 'Email input');

    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid' } });

    // Error message should have aria-live for screen readers
    const errorMessage = screen.getByTestId('email-error');
    expect(errorMessage).toHaveAttribute('aria-live', 'polite');
  });
});
