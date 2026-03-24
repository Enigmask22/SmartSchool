/**
 * usePasswordResetLogic - Password Reset Domain Logic Hook
 * Handles the business logic for 3-step password recovery
 * 
 * Domain responsibilities:
 * - Sending OTP to email
 * - Verifying OTP code
 * - Resetting password with validation
 * - Step navigation on success/failure
 */

import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';

export interface ForgotPasswordFormData {
  username: string;
  otpEmail: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UsePasswordResetLogicReturn {
  handleStep1Submit: (formData: ForgotPasswordFormData) => Promise<boolean>;
  handleStep2Submit: (formData: ForgotPasswordFormData) => Promise<boolean>;
  handleStep3Submit: (formData: ForgotPasswordFormData) => Promise<boolean>;
}

/**
 * Validate email format
 */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * usePasswordResetLogic Hook
 * Handles the domain logic for password reset process
 * 
 * Steps:
 * 1. Send OTP to email
 * 2. Verify OTP code
 * 3. Reset password
 * 
 * Each handler performs its domain logic and returns success/failure for component to handle
 * 
 * @returns {UsePasswordResetLogicReturn} Password reset logic handlers
 */
export const usePasswordResetLogic = (): UsePasswordResetLogicReturn => {
  const navigate = useNavigate();

  /**
   * Step 1: Send OTP to email
   * Validates username and email, then calls API
   * 
   * @param formData - Form data with username and email
   * @returns true if OTP sent successfully, false otherwise
   * @throws error message for display
   */
  const handleStep1Submit = async (formData: ForgotPasswordFormData): Promise<boolean> => {
    try {
      if (!formData.username || !formData.otpEmail) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      
      if (!validateEmail(formData.otpEmail)) {
        throw new Error('Email nhận OTP không hợp lệ');
      }

      const response = await api.forgotPassword(formData.username, formData.otpEmail);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Không thể gửi OTP. Vui lòng thử lại');
    }
  };

  /**
   * Step 2: Verify OTP code
   * Validates 6-digit OTP and calls verification API
   * 
   * @param formData - Form data with username and OTP
   * @returns true if OTP verified successfully, false otherwise
   * @throws error message for display
   */
  const handleStep2Submit = async (formData: ForgotPasswordFormData): Promise<boolean> => {
    try {
      if (formData.otp.length !== 6) {
        throw new Error('Vui lòng nhập đầy đủ 6 số OTP');
      }

      const response = await api.verifyOTP(formData.username, formData.otp);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'OTP không đúng');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Xác thực OTP thất bại');
    }
  };

  /**
   * Step 3: Reset password
   * Validates new password and confirmation, then resets
   * 
   * @param formData - Form data with username, OTP, and new password
   * @returns true if password reset successfully, false otherwise
   * @throws error message for display
   */
  const handleStep3Submit = async (formData: ForgotPasswordFormData): Promise<boolean> => {
    try {
      if (!formData.newPassword || !formData.confirmPassword) {
        throw new Error('Vui lòng điền đầy đủ mật khẩu');
      }
      
      if (formData.newPassword.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      }

      const response = await api.resetPassword(
        formData.username, 
        formData.otp, 
        formData.newPassword, 
        formData.confirmPassword
      );
      
      if (response.success) {
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return true;
      } else {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Đặt lại mật khẩu thất bại');
    }
  };

  return {
    handleStep1Submit,
    handleStep2Submit,
    handleStep3Submit
  };
};
