/**
 * useAuthSubmit - Authentication Submission Logic Hook
 * Extracted as pure authentication domain logic
 * Handles login API call and navigation only
 * 
 * This hook focuses on the "what to do with credentials" logic,
 * not on managing the form state itself.
 */

import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';

export interface UseAuthSubmitReturn {
  isLoading: boolean;
  error: string;
  submit: (username: string, password: string) => Promise<void>;
  clearError: () => void;
}

/**
 * useAuthSubmit Hook
 * Handles authentication logic: login API call + navigation
 * 
 * Keeps form state management separate to allow flexible form implementations
 * 
 * @returns {UseAuthSubmitReturn} Authentication submission handlers
 */
export const useAuthSubmit = (): UseAuthSubmitReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('useAuthSubmit must be used within AuthProvider');
  }
  const { login } = authContext;
  const navigate = useNavigate();

  /**
   * Submit login credentials
   * Calls authentication API and redirects based on user role
   * 
   * Frontend validation:
   * - Username/email: required, non-empty
   * - Password: required, non-empty (min 6 chars as per backend)
   */
  const submit = async (username: string, password: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Frontend validation
      if (!username || username.trim() === '') {
        throw new Error('Vui lòng nhập tên đăng nhập hoặc email');
      }

      if (!password || password.trim() === '') {
        throw new Error('Vui lòng nhập mật khẩu');
      }

      if (password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }

      const user = await login(username, password);

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        // Teachers go to dashboard selector
        navigate('/select-dashboard');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError('');

  return {
    isLoading,
    error,
    submit,
    clearError
  };
};
