import { useState } from 'react';
import { logger } from '@/utils/logger';
import  api  from '@/utils/api';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ShowPasswords {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

interface UsePasswordManagementReturn {
  // State
  passwordData: PasswordData;
  setPasswordData: (data: Partial<PasswordData>) => void;
  showPasswords: ShowPasswords;
  // Loading
  updating: boolean;
  error: string | null;
  successMessage: string | null;
  // Functions
  changePassword: () => Promise<void>;
  togglePasswordVisibility: (field: keyof ShowPasswords) => void;
  resetForm: () => void;
  clearSuccess: () => void;
}

/**
 * Manages password change operations.
 * 
 * Handles:
 * - Password validation (match + length)
 * - Password change API call
 * - Loading state during operation
 * - Success/error messaging
 */
export const usePasswordManagement = (): UsePasswordManagementReturn => {
  const [passwordData, setPasswordDataState] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState<ShowPasswords>({
    current: false,
    new: false,
    confirm: false,
  });

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const setPasswordData = (updates: Partial<PasswordData>): void => {
    setPasswordDataState((prev) => ({ ...prev, ...updates }));
  };

  const changePassword = async (): Promise<void> => {
    try {
      setUpdating(true);
      setError(null);
      setSuccessMessage(null);

      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
        setUpdating(false);
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('Mật khẩu mới phải có ít nhất 6 ký tự');
        setUpdating(false);
        return;
      }

      const response = await api.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setSuccessMessage('Đổi mật khẩu thành công');
        resetForm();
      } else {
        setError(response.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      logger.error('Error changing password:', err);
      setError('Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setUpdating(false);
    }
  };

  const togglePasswordVisibility = (field: keyof ShowPasswords): void => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const resetForm = (): void => {
    setPasswordDataState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const clearSuccess = (): void => {
    setSuccessMessage(null);
  };

  return {
    passwordData,
    setPasswordData,
    showPasswords,
    updating,
    error,
    successMessage,
    changePassword,
    togglePasswordVisibility,
    resetForm,
    clearSuccess,
  };
};
