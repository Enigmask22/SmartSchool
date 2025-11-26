/**
 * useForgotPassword - Password Reset Logic Hook
 * Extracted from ForgotPassword.tsx component
 * Handles 3-step password recovery process: username entry → OTP verification → password reset
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export interface ForgotPasswordFormData {
  username: string;
  otpEmail: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UseForgotPasswordReturn {
  step: number;
  loading: boolean;
  error: string;
  success: string;
  formData: ForgotPasswordFormData;
  otpInputs: React.RefObject<HTMLInputElement>[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOTPChange: (index: number, value: string) => void;
  handleOTPKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleOTPPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleStep1Submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleStep2Submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleStep3Submit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  goToStep: (step: number) => void;
}

/**
 * useForgotPassword Hook
 * Manages multi-step password recovery process
 * 
 * Steps:
 * 1. Enter username and email
 * 2. Verify OTP (6-digit code)
 * 3. Set new password
 * 
 * @returns {UseForgotPasswordReturn} Password recovery state and handlers
 */
export const useForgotPassword = (): UseForgotPasswordReturn => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    username: '',
    otpEmail: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // OTP input refs for focus management
  const otpInputs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  
  /**
   * Handle standard text input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  /**
   * Handle OTP digit input
   * - Only allows single digits
   * - Auto-focuses next field
   */
  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value) || value.length > 1) return;
    
    const newOTP = formData.otp.split('');
    newOTP[index] = value;
    setFormData(prev => ({
      ...prev,
      otp: newOTP.join('')
    }));
    
    // Auto-focus next field
    if (value && index < 5 && otpInputs[index + 1].current) {
      otpInputs[index + 1].current.focus();
    }
    
    setError('');
  };

  /**
   * Handle OTP keydown events (backspace navigation)
   */
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpInputs[index - 1].current?.focus();
    }
  };

  /**
   * Handle OTP paste - extract 6 digits from clipboard
   */
  const handleOTPPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      setFormData(prev => ({
        ...prev,
        otp: pastedData
      }));
      
      // Focus last field
      otpInputs[5].current?.focus();
    }
    
    setError('');
  };

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Step 1: Send OTP to email
   */
  const handleStep1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.username || !formData.otpEmail) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      
      if (!validateEmail(formData.otpEmail)) {
        throw new Error('Email nhận OTP không hợp lệ');
      }

      const response = await api.forgotPassword(formData.username, formData.otpEmail);
      
      if (response.success) {
        setSuccess('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)');
        setStep(2);
      } else {
        throw new Error(response.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi OTP. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Verify OTP
   */
  const handleStep2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (formData.otp.length !== 6) {
        throw new Error('Vui lòng nhập đầy đủ 6 số OTP');
      }

      const response = await api.verifyOTP(formData.username, formData.otp);
      
      if (response.success) {
        setSuccess('Xác thực OTP thành công');
        setStep(3);
      } else {
        throw new Error(response.message || 'OTP không đúng');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Reset password
   */
  const handleStep3Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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
        setSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (newStep: number) => {
    setStep(newStep);
    setError('');
  };

  return {
    step,
    loading,
    error,
    success,
    formData,
    otpInputs,
    handleInputChange,
    handleOTPChange,
    handleOTPKeyDown,
    handleOTPPaste,
    handleStep1Submit,
    handleStep2Submit,
    handleStep3Submit,
    goToStep
  };
};
