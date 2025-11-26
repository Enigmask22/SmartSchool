/**
 * ForgotPassword.tsx - Password Recovery Page
 * 
 * Refactored from ForgotPassword.jsx:
 * - Extracted 3-step password recovery logic to useForgotPassword hook
 * - Added TypeScript types
 * - Extracted sub-components for better organization
 * 
 * Features:
 * - Step 1: Username and email entry
 * - Step 2: OTP verification (6-digit code with auto-advance)
 * - Step 3: New password setup with confirmation
 */

import React from 'react';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { useForgotPassword } from '@/hooks/useForgotPassword';

/**
 * ErrorAlert - Error message display
 */
interface ErrorAlertProps {
  message: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => (
  <div className="p-4 mb-4 bg-destructive/10 rounded-md border border-destructive/20">
    <div className="flex">
      <AlertCircle className="w-5 h-5 text-destructive" />
      <div className="ml-3">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    </div>
  </div>
);

/**
 * SuccessAlert - Success message display
 */
interface SuccessAlertProps {
  message: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({ message }) => (
  <div className="p-4 mb-4 bg-green-50 rounded-md border border-green-200">
    <div className="flex">
      <CheckCircle className="w-5 h-5 text-green-400" />
      <div className="ml-3">
        <p className="text-sm text-green-800">{message}</p>
      </div>
    </div>
  </div>
);

/**
 * Step1Form - Username and email entry
 */
interface Step1FormProps {
  formData: { username: string; otpEmail: string };
  loading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackClick: () => void;
}

const Step1Form: React.FC<Step1FormProps> = ({ formData, loading, onInputChange, onSubmit, onBackClick }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold">Quên mật khẩu?</h2>
      <p className="mt-2 text-sm">
        Nhập username đăng nhập và email nhận OTP để đặt lại mật khẩu
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username đăng nhập
        </label>
        <div className="mt-1">
          <input
            id="username"
            name="username"
            type="text"
            required
            value={formData.username}
            onChange={onInputChange}
            className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="ho_va_ten.ten_truong.ten_tinh"
          />
        </div>
      </div>

      <div>
        <label htmlFor="otpEmail" className="block text-sm font-medium text-gray-700">
          Email nhận OTP
        </label>
        <div className="mt-1">
          <input
            id="otpEmail"
            name="otpEmail"
            type="email"
            required
            value={formData.otpEmail}
            onChange={onInputChange}
            className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="your-email@gmail.com"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Mã OTP sẽ được gửi đến email này
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBackClick}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang gửi...' : 'Gửi OTP'}
        </button>
      </div>
    </form>
  </div>
);

/**
 * OTPInput - Single OTP digit input with ref
 */
interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, onKeyDown, onPaste, inputRef }) => (
  <input
    ref={inputRef}
    type="text"
    inputMode="numeric"
    maxLength={1}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    onPaste={onPaste}
    className="w-12 h-12 text-lg font-bold text-center rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    autoComplete="off"
  />
);

/**
 * Step2Form - OTP verification
 */
interface Step2FormProps {
  formData: { otp: string; otpEmail: string };
  loading: boolean;
  otpInputs: React.RefObject<HTMLInputElement>[];
  onOTPChange: (index: number, value: string) => void;
  onOTPKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onOTPPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackClick: () => void;
}

const Step2Form: React.FC<Step2FormProps> = ({
  formData,
  loading,
  otpInputs,
  onOTPChange,
  onOTPKeyDown,
  onOTPPaste,
  onSubmit,
  onBackClick
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white">Nhập mã OTP</h2>
      <p className="mt-2 text-sm text-white/90">
        Mã OTP đã được gửi đến <strong className="text-white">{formData.otpEmail}</strong>
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block mb-3 text-sm font-medium text-gray-700">
          Mã OTP (6 số)
        </label>
        <div className="flex justify-center space-x-3">
          {Array.from({ length: 6 }, (_, index) => (
            <OTPInput
              key={index}
              value={formData.otp[index] || ''}
              onChange={(value) => onOTPChange(index, value)}
              onKeyDown={(e) => onOTPKeyDown(index, e)}
              onPaste={onOTPPaste}
              inputRef={otpInputs[index]}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-center text-gray-500">
          Mã OTP có hiệu lực trong 10 phút
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBackClick}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={loading || formData.otp.length !== 6}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
        </button>
      </div>
    </form>
  </div>
);

/**
 * Step3Form - New password entry
 */
interface Step3FormProps {
  formData: { username: string; newPassword: string; confirmPassword: string };
  loading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackClick: () => void;
}

const Step3Form: React.FC<Step3FormProps> = ({ formData, loading, onInputChange, onSubmit, onBackClick }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white">Đặt mật khẩu mới</h2>
      <p className="mt-2 text-sm text-white/90">
        Nhập mật khẩu mới cho tài khoản <strong className="text-white">{formData.username}</strong>
      </p>
    </div>

    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          Mật khẩu mới
        </label>
        <div className="mt-1">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            value={formData.newPassword}
            onChange={onInputChange}
            className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nhập mật khẩu mới"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Xác nhận mật khẩu mới
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={onInputChange}
            className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Nhập lại mật khẩu mới"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBackClick}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        </button>
      </div>
    </form>
  </div>
);

/**
 * ForgotPassword Component
 * Multi-step password recovery interface
 * 
 * Features:
 * - Step 1: Username and email verification
 * - Step 2: OTP code input with auto-advance and paste support
 * - Step 3: New password setup with confirmation
 * - Error and success message display
 * - Protected navigation between steps
 */
const ForgotPassword: React.FC = () => {
  const {
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
  } = useForgotPassword();

  return (
    <div 
      className="flex justify-center items-center p-4 min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/background_login.png)',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 space-y-8 w-full max-w-md">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center items-center mx-auto w-16 h-16 bg-primary rounded-full">
              <Key className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-extrabold">
              SynapseS
            </CardTitle>
            <CardDescription>
              Đặt lại mật khẩu
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            {/* Alerts */}
            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}

            {/* Step Content */}
            {step === 1 && (
              <Step1Form
                formData={{ username: formData.username, otpEmail: formData.otpEmail }}
                loading={loading}
                onInputChange={handleInputChange}
                onSubmit={handleStep1Submit}
                onBackClick={() => window.location.href = '/login'}
              />
            )}

            {step === 2 && (
              <Step2Form
                formData={{ otp: formData.otp, otpEmail: formData.otpEmail }}
                loading={loading}
                otpInputs={otpInputs}
                onOTPChange={handleOTPChange}
                onOTPKeyDown={handleOTPKeyDown}
                onOTPPaste={handleOTPPaste}
                onSubmit={handleStep2Submit}
                onBackClick={() => goToStep(1)}
              />
            )}

            {step === 3 && (
              <Step3Form
                formData={{
                  username: formData.username,
                  newPassword: formData.newPassword,
                  confirmPassword: formData.confirmPassword
                }}
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
};

export default ForgotPassword;
