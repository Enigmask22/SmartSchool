/**
 * ForgotPassword.tsx - Password Recovery Page Component
 * 
 * Refactored following Rule-of-Refactor:
 * - UI State: step, formData, loading, error, success (kept in component)
 * - Reusable Logic: useOTPInput (6-digit OTP input behavior)
 * - Domain Logic: usePasswordResetLogic (API calls and validation)
 * 
 * 3-step password recovery flow:
 * Step 1: Enter username and email to receive OTP
 * Step 2: Enter 6-digit OTP code
 * Step 3: Set new password
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useOTPInput } from '@/hooks/forgot-password/useOTPInput';
import { usePasswordResetLogic } from '@/hooks/forgot-password/usePasswordResetLogic';
import {
  ForgotPasswordHeader,
  ErrorAlert,
  SuccessAlert,
  Step1Form,
  Step2Form,
  Step3Form,
} from '@/components/forgot-password';
import { useNavigate } from 'react-router-dom';

/**
 * ForgotPassword Component
 * 
 * Manages UI state and coordinates between:
 * - useOTPInput: For 6-digit OTP input behavior
 * - usePasswordResetLogic: For API calls and domain validation
 */
export function ForgotPassword() {
  const navigate = useNavigate();
  // ============ UI State (kept in component) ============
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    otpEmail: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  // ============ Reusable Logic Hooks ============
  const { 
    otpInputs, 
    handleOTPChange: handleOTPChangeRaw, 
    handleOTPKeyDown, 
    handleOTPPaste: handleOTPPasteRaw 
  } = useOTPInput();
  
  const { 
    handleStep1Submit: submitStep1, 
    handleStep2Submit: submitStep2, 
    handleStep3Submit: submitStep3 
  } = usePasswordResetLogic();

  // ============ UI Event Handlers ============
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
   * Handle OTP digit input with state update
   */
  const handleOTPChange = (index: number, value: string) => {
    const digit = handleOTPChangeRaw(index, value);
    if (digit !== undefined) {
      const newOTP = formData.otp.split('');
      newOTP[index] = digit;
      setFormData(prev => ({
        ...prev,
        otp: newOTP.join('')
      }));
      setError('');
    }
  };

  /**
   * Handle OTP paste with state update
   */
  const handleOTPPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const otpCode = handleOTPPasteRaw(e);
    if (otpCode) {
      setFormData(prev => ({
        ...prev,
        otp: otpCode
      }));
      setError('');
    }
  };

  // ============ Step Submission Handlers ============
  /**
   * Step 1: Send OTP
   */
  const handleStep1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await submitStep1(formData);
      setSuccess('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)');
      setStep(2);
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
      await submitStep2(formData);
      setSuccess('Xác thực OTP thành công');
      setStep(3);
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
      await submitStep3(formData);
      setSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại');
      setLoading(false);
    }
  };

  /**
   * Navigate to previous step
   */
  const goToStep = (newStep: number) => {
    setStep(newStep);
    setError('');
  };

  return (
    <div
      className="flex justify-center items-center p-4 min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/background_login.jpg)',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 space-y-4 w-full max-w-md">
        {/* Header */}
        <ForgotPasswordHeader />

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            {/* Error Message */}
            {error && <ErrorAlert message={error} />}

            {/* Success Message */}
            {success && <SuccessAlert message={success} />}

            {/* Step 1: Username and Email */}
            {step === 1 && (
              <Step1Form
                formData={formData}
                loading={loading}
                onInputChange={handleInputChange}
                onSubmit={handleStep1Submit}
                onBackClick={() => navigate('/login')}
              />
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <Step2Form
                formData={formData}
                loading={loading}
                otpInputs={otpInputs}
                onOTPChange={handleOTPChange}
                onOTPKeyDown={handleOTPKeyDown}
                onOTPPaste={handleOTPPaste}
                onSubmit={handleStep2Submit}
                onBackClick={() => goToStep(1)}
              />
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <Step3Form
                formData={formData}
                loading={loading}
                onInputChange={handleInputChange}
                onSubmit={handleStep3Submit}
                onBackClick={() => goToStep(2)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
