import { useState, useCallback } from 'react';

/**
 * Error object structure for a field
 */
interface FieldError {
  message: string;
  code?: string;
  field: string;
}

/**
 * Backend error response structure
 */
// interface ValidationErrorResponse {
//   success: false;
//   message: string;
//   code?: string;
//   field?: string;
//   errors?: FieldError[];
//   status?: number;
// }

/**
 * Form validation hook for handling field-level errors
 * Manages error state, parses backend validation errors, and provides helpers
 * 
 * Features:
 * - Field-level error state management
 * - Parse backend validation error responses
 * - Auto-clear errors when fields are modified
 * - Required field indicators
 * - Structured error messages with error codes
 */
export function useFormValidation() {
  // Field errors: { fieldName: [{message: string, code?: string}] }
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldError[]>>({});
  
  // Global form error message
  const [formError, setFormError] = useState<string | null>(null);
  
  // Touched fields to show validation only after user interaction
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  // Required fields for this form
  const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());

  /**
   * Initialize required fields
   * Call this when form is first rendered
   */
  const initializeRequiredFields = useCallback((fields: string[]) => {
    setRequiredFields(new Set(fields));
  }, []);

  /**
   * Parse backend error response and extract field errors
   * Supports both single error and multiple field errors
   */
  const parseValidationError = useCallback((error: any): Record<string, FieldError[]> => {
    const errors: Record<string, FieldError[]> = {};

    // If error is APIError instance (from api.ts throw new APIError)
    if (error?.name === 'APIError' && error?.code && error?.field) {
      errors[error.field] = [
        {
          message: error.message || 'Lỗi xác thực',
          code: error.code,
          field: error.field,
        },
      ];
      return errors;
    }

    // If error is from axios/fetch catch with response data
    if (error?.response?.data) {
      const data = error.response.data;

      // Single field error with code and field reference
      if (data.code && data.field) {
        errors[data.field] = [
          {
            message: data.message || 'Lỗi xác thực',
            code: data.code,
            field: data.field,
          },
        ];
      }
      // Multiple errors
      else if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: FieldError) => {
          if (!errors[err.field]) {
            errors[err.field] = [];
          }
          errors[err.field].push(err);
        });
      }
      // Generic error message without field reference
      else if (data.message) {
        return errors; // Return empty, let caller handle global error
      }
    }
    // If error is a string
    else if (typeof error === 'string') {
      return errors;
    }

    return errors;
  }, []);

  /**
   * Handle API response and extract errors
   * Call this after API calls to automatically set field errors
   */
  const handleApiResponse = useCallback(
    (response: any) => {
      // Clear previous errors
      setFieldErrors({});
      setFormError(null);

      if (response?.success === false) {
        // Parse field errors
        const parsedErrors = parseValidationError(response);

        if (Object.keys(parsedErrors).length > 0) {
          setFieldErrors(parsedErrors);
        } else {
          // No field errors, set as global form error
          setFormError(response.message || 'Đã xảy ra lỗi');
        }
      }
    },
    [parseValidationError]
  );

  /**
   * Handle validation errors from axios/fetch catch
   */
  const handleError = useCallback(
    (error: any) => {
      // Clear previous errors
      setFieldErrors({});
      setFormError(null);

      const parsedErrors = parseValidationError(error);

      if (Object.keys(parsedErrors).length > 0) {
        setFieldErrors(parsedErrors);
      } else {
        // Extract error message
        let errorMessage = 'Đã xảy ra lỗi';
        
        // If error is APIError with message and code but no field
        if (error?.name === 'APIError' && error?.message) {
          errorMessage = error.message;
        }
        // If error has response data
        else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        // If error has a message property
        else if (error?.message) {
          errorMessage = error.message;
        }

        setFormError(errorMessage);
      }
    },
    [parseValidationError]
  );

  /**
   * Mark a field as touched (user has interacted with it)
   */
  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));
  }, []);

  /**
   * Mark multiple fields as touched
   */
  const markFieldsTouched = useCallback((fieldNames: string[]) => {
    setTouchedFields((prev) => {
      const updated = new Set(prev);
      fieldNames.forEach((f) => updated.add(f));
      return updated;
    });
  }, []);

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  /**
   * Clear all field errors
   */
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  /**
   * Set error for a specific field manually
   */
  const setFieldError = useCallback(
    (fieldName: string, message: string, code?: string) => {
      setFieldErrors((prev) => ({
        ...prev,
        [fieldName]: [{ message, code, field: fieldName }],
      }));
    },
    []
  );

  /**
   * Get errors for a specific field
   */
  const getFieldErrors = useCallback(
    (fieldName: string): FieldError[] => {
      return fieldErrors[fieldName] || [];
    },
    [fieldErrors]
  );

  /**
   * Get error message for a specific field (first error)
   */
  const getFieldErrorMessage = useCallback(
    (fieldName: string): string | null => {
      const errors = fieldErrors[fieldName];
      return errors && errors.length > 0 ? errors[0].message : null;
    },
    [fieldErrors]
  );

  /**
   * Check if a field has errors
   */
  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return (fieldErrors[fieldName] || []).length > 0;
    },
    [fieldErrors]
  );

  /**
   * Check if should show field error (only if touched or submitted)
   */
  const shouldShowFieldError = useCallback(
    (fieldName: string): boolean => {
      return hasFieldError(fieldName) && touchedFields.has(fieldName);
    },
    [hasFieldError, touchedFields]
  );

  /**
   * Check if a field is required
   */
  const isFieldRequired = useCallback(
    (fieldName: string): boolean => {
      return requiredFields.has(fieldName);
    },
    [requiredFields]
  );

  /**
   * Validate required fields
   * Returns true if all required fields have values
   */
  const validateRequired = useCallback(
    (formData: Record<string, any>): boolean => {
      const newErrors: Record<string, FieldError[]> = {};
      let hasErrors = false;

      requiredFields.forEach((field) => {
        const value = formData[field];
        if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[field] = [
            {
              message: `${field} là bắt buộc`,
              field,
            },
          ];
          hasErrors = true;
        }
      });

      if (hasErrors) {
        setFieldErrors((prev) => ({ ...prev, ...newErrors }));
      }

      return !hasErrors;
    },
    [requiredFields]
  );

  /**
   * Reset all validation state
   */
  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
    setTouchedFields(new Set());
  }, []);

  /**
   * Reset form completely including required fields
   */
  const resetAll = useCallback(() => {
    reset();
    setRequiredFields(new Set());
  }, [reset]);

  return {
    // State
    fieldErrors,
    formError,
    touchedFields,
    requiredFields,

    // Initialization
    initializeRequiredFields,

    // Error handling
    handleApiResponse,
    handleError,
    parseValidationError,

    // Field operations
    markFieldTouched,
    markFieldsTouched,
    clearFieldError,
    clearAllErrors,
    setFieldError,

    // Query methods
    getFieldErrors,
    getFieldErrorMessage,
    hasFieldError,
    shouldShowFieldError,
    isFieldRequired,

    // Validation
    validateRequired,

    // Reset
    reset,
    resetAll,
  };
}

export type FormValidationHook = ReturnType<typeof useFormValidation>;
