/**
 * Integration tests for useFormValidation hook
 * Tests field error handling, API response parsing, and validation logic
 * 
 * File: frontend/src/tests/__tests__/useFormValidation.test.ts
 * Framework: Vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '@/hooks/admin-management/useFormValidation';

describe('useFormValidation Hook', () => {
  let hook: ReturnType<typeof renderHook<typeof useFormValidation, void>>;

  beforeEach(() => {
    hook = renderHook(() => useFormValidation());
  });

  // =========================================================================
  // TEST SUITE: Hook Initialization
  // =========================================================================

  describe('Initialization', () => {
    it('should initialize with empty errors', () => {
      expect(hook.result.current.fieldErrors).toEqual({});
    });

    it('should initialize with empty touched fields', () => {
      expect(hook.result.current.touchedFields.size).toBe(0);
    });

    it('should initialize with empty form error', () => {
      expect(hook.result.current.formError).toBeNull();
    });

    it('should initialize with empty required fields', () => {
      expect(hook.result.current.requiredFields.size).toBe(0);
    });
  });

  // =========================================================================
  // TEST SUITE: Required Fields Management
  // =========================================================================

  describe('Required Fields', () => {
    it('should set required fields', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'password']);
      });

      expect(hook.result.current.isFieldRequired('email')).toBe(true);
      expect(hook.result.current.isFieldRequired('password')).toBe(true);
      expect(hook.result.current.isFieldRequired('phone')).toBe(false);
    });

    it('should validate required fields are not empty', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'password']);
      });

      const formData = {
        email: '',
        password: '',
        phone: '1234567890',
      };

      const isValid = hook.result.current.validateRequired(formData);

      expect(isValid).toBe(false);
      expect(hook.result.current.hasFieldError('email')).toBe(true);
      expect(hook.result.current.hasFieldError('password')).toBe(true);
    });

    it('should pass validation when all required fields are filled', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'password']);
      });

      const formData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        phone: '', // Optional
      };

      const isValid = hook.result.current.validateRequired(formData);

      expect(isValid).toBe(true);
      expect(hook.result.current.fieldErrors).toEqual({});
    });
  });

  // =========================================================================
  // TEST SUITE: Field Touched State
  // =========================================================================

  describe('Field Touched State', () => {
    it('should mark field as touched', () => {
      act(() => {
        hook.result.current.markFieldTouched('email');
      });

      expect(hook.result.current.touchedFields.has('email')).toBe(true);
    });

    it('should mark multiple fields as touched', () => {
      act(() => {
        hook.result.current.markFieldsTouched(['email', 'password', 'name']);
      });

      expect(hook.result.current.touchedFields.size).toBe(3);
      expect(hook.result.current.touchedFields.has('email')).toBe(true);
      expect(hook.result.current.touchedFields.has('password')).toBe(true);
    });

    it('should show error only if field is touched and has error', () => {
      act(() => {
        hook.result.current.setFieldError('email', 'Invalid email');
      });

      // Error exists but field not touched - should not show
      expect(hook.result.current.shouldShowFieldError('email')).toBe(false);

      // Mark field as touched
      act(() => {
        hook.result.current.markFieldTouched('email');
      });

      // Now should show
      expect(hook.result.current.shouldShowFieldError('email')).toBe(true);
    });
  });

  // =========================================================================
  // TEST SUITE: Error Management
  // =========================================================================

  describe('Error Management', () => {
    it('should set field error', () => {
      act(() => {
        hook.result.current.setFieldError('email', 'Invalid email format', 'EMAIL_INVALID');
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);
      expect(hook.result.current.getFieldErrorMessage('email')).toBe('Invalid email format');
    });

    it('should clear field error', () => {
      act(() => {
        hook.result.current.setFieldError('email', 'Invalid email');
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);

      act(() => {
        hook.result.current.clearFieldError('email');
      });

      expect(hook.result.current.hasFieldError('email')).toBe(false);
    });

    it('should clear all errors', () => {
      act(() => {
        hook.result.current.setFieldError('email', 'Email error');
        hook.result.current.setFieldError('password', 'Password error');
      });

      expect(hook.result.current.fieldErrors).toHaveProperty('email');
      expect(hook.result.current.fieldErrors).toHaveProperty('password');

      act(() => {
        hook.result.current.clearAllErrors();
      });

      expect(hook.result.current.fieldErrors).toEqual({});
      expect(hook.result.current.formError).toBeNull();
    });

    it('should get field errors array', () => {
      act(() => {
        hook.result.current.setFieldError('email', 'Invalid format', 'EMAIL_INVALID');
      });

      const errors = hook.result.current.getFieldErrors('email');

      expect(errors).toHaveLength(1);
      expect(errors[0]).toHaveProperty('message', 'Invalid format');
      expect(errors[0]).toHaveProperty('code', 'EMAIL_INVALID');
    });

    it('should return null for field error message when no error', () => {
      const message = hook.result.current.getFieldErrorMessage('email');
      expect(message).toBeNull();
    });
  });

  // =========================================================================
  // TEST SUITE: API Response Parsing
  // =========================================================================

  describe('API Response Handling', () => {
    it('should parse single field error from API response', () => {
      const response = {
        success: false,
        message: 'Email already exists',
        code: 'USER_EMAIL_DUPLICATE',
        field: 'email',
        status: 409,
      };

      act(() => {
        hook.result.current.handleApiResponse(response);
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);
      expect(hook.result.current.getFieldErrorMessage('email')).toBe('Email already exists');
    });

    it('should parse multiple field errors from API response', () => {
      const response = {
        success: false,
        message: 'Validation errors',
        errors: [
          { message: 'Email invalid', code: 'EMAIL_INVALID', field: 'email' },
          { message: 'Password too weak', code: 'PASSWORD_WEAK', field: 'password' },
        ],
      };

      act(() => {
        hook.result.current.handleApiResponse(response);
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);
      expect(hook.result.current.hasFieldError('password')).toBe(true);
    });

    it('should set form error for generic errors', () => {
      const response = {
        success: false,
        message: 'Server error occurred',
      };

      act(() => {
        hook.result.current.handleApiResponse(response);
      });

      expect(hook.result.current.formError).toBe('Server error occurred');
    });

    it('should handle error objects from fetch/axios catch', () => {
      const error = {
        response: {
          data: {
            success: false,
            message: 'Unauthorized',
            code: 'AUTH_FAILED',
            field: 'password',
          },
        },
      };

      act(() => {
        hook.result.current.handleError(error);
      });

      expect(hook.result.current.hasFieldError('password')).toBe(true);
    });

    it('should handle error when response has no data', () => {
      const error = {
        message: 'Network error',
      };

      act(() => {
        hook.result.current.handleError(error);
      });

      expect(hook.result.current.formError).toBe('Network error');
    });

    it('should clear previous errors before handling new response', () => {
      // Set initial error
      act(() => {
        hook.result.current.setFieldError('email', 'Old error');
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);

      // Handle new response with different error
      const response = {
        success: false,
        message: 'New error',
        field: 'password',
      };

      act(() => {
        hook.result.current.handleApiResponse(response);
      });

      expect(hook.result.current.hasFieldError('email')).toBe(false);
      expect(hook.result.current.hasFieldError('password')).toBe(false);
      expect(hook.result.current.formError).toBe('New error');
    });
  });

  // =========================================================================
  // TEST SUITE: Reset Operations
  // =========================================================================

  describe('Reset Operations', () => {
    it('should reset errors only (not required fields)', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email']);
        hook.result.current.setFieldError('email', 'Error');
        hook.result.current.markFieldTouched('email');
      });

      expect(hook.result.current.requiredFields.size).toBe(1);
      expect(hook.result.current.hasFieldError('email')).toBe(true);

      act(() => {
        hook.result.current.reset();
      });

      expect(hook.result.current.fieldErrors).toEqual({});
      expect(hook.result.current.touchedFields.size).toBe(0);
      expect(hook.result.current.requiredFields.size).toBe(1); // Still set
    });

    it('should reset all state including required fields', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email']);
        hook.result.current.setFieldError('email', 'Error');
        hook.result.current.markFieldTouched('email');
      });

      expect(hook.result.current.requiredFields.size).toBe(1);

      act(() => {
        hook.result.current.resetAll();
      });

      expect(hook.result.current.fieldErrors).toEqual({});
      expect(hook.result.current.touchedFields.size).toBe(0);
      expect(hook.result.current.requiredFields.size).toBe(0); // Cleared
    });
  });

  // =========================================================================
  // TEST SUITE: Real-World Scenarios
  // =========================================================================

  describe('Real-World Scenarios', () => {
    it('should handle user registration form submission', () => {
      // Initialize required fields
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'password', 'full_name']);
      });

      // User fills form
      const formData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        full_name: 'New User',
        phone: '0123456789', // Optional
      };

      // Validate before submit
      act(() => {
        const isValid = hook.result.current.validateRequired(formData);
        expect(isValid).toBe(true);
      });

      // Simulate API response with email duplicate error
      const apiError = {
        success: false,
        message: 'Email already registered',
        code: 'USER_EMAIL_DUPLICATE',
        field: 'email',
      };

      act(() => {
        hook.result.current.handleApiResponse(apiError);
      });

      // Field should now have error
      expect(hook.result.current.shouldShowFieldError('email')).toBe(false); // Not touched yet

      // User touches field (blur or focus)
      act(() => {
        hook.result.current.markFieldTouched('email');
      });

      // Now error shows
      expect(hook.result.current.shouldShowFieldError('email')).toBe(true);

      // User fixes email
      act(() => {
        hook.result.current.clearFieldError('email');
      });

      expect(hook.result.current.hasFieldError('email')).toBe(false);
    });

    it('should handle form edit flow with multiple errors', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'username']);
      });

      // API returns multiple errors
      const validationErrors = {
        success: false,
        errors: [
          { message: 'Email already used', code: 'EMAIL_DUP', field: 'email' },
          { message: 'Username too short', code: 'USERNAME_SHORT', field: 'username' },
        ],
      };

      act(() => {
        hook.result.current.handleApiResponse(validationErrors);
      });

      expect(hook.result.current.hasFieldError('email')).toBe(true);
      expect(hook.result.current.hasFieldError('username')).toBe(true);

      // User marks fields as touched
      act(() => {
        hook.result.current.markFieldsTouched(['email', 'username']);
      });

      // Both show errors
      expect(hook.result.current.shouldShowFieldError('email')).toBe(true);
      expect(hook.result.current.shouldShowFieldError('username')).toBe(true);

      // User fixes email
      act(() => {
        hook.result.current.clearFieldError('email');
      });

      expect(hook.result.current.shouldShowFieldError('email')).toBe(false);
      expect(hook.result.current.shouldShowFieldError('username')).toBe(true);
    });
  });

  // =========================================================================
  // TEST SUITE: Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle duplicate field touching', () => {
      act(() => {
        hook.result.current.markFieldTouched('email');
        hook.result.current.markFieldTouched('email');
        hook.result.current.markFieldTouched('email');
      });

      expect(hook.result.current.touchedFields.size).toBe(1);
    });

    it('should handle empty error array in response', () => {
      const response = {
        success: false,
        errors: [],
        message: 'Validation failed',
      };

      act(() => {
        hook.result.current.handleApiResponse(response);
      });

      expect(hook.result.current.formError).toBe('Validation failed');
    });

    it('should handle null/undefined field errors', () => {
      expect(hook.result.current.getFieldErrors('nonexistent')).toEqual([]);
      expect(hook.result.current.getFieldErrorMessage('nonexistent')).toBeNull();
      expect(hook.result.current.hasFieldError('nonexistent')).toBe(false);
    });

    it('should handle validateRequired with empty form data', () => {
      act(() => {
        hook.result.current.initializeRequiredFields(['email', 'password']);
      });

      const isValid = hook.result.current.validateRequired({});

      expect(isValid).toBe(false);
      expect(hook.result.current.fieldErrors).toHaveProperty('email');
      expect(hook.result.current.fieldErrors).toHaveProperty('password');
    });
  });
});
