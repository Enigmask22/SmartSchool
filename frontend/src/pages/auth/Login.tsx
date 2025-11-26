/**
 * Login.tsx - Authentication Page Component
 * 
 * Refactored from Login.jsx:
 * - Extracted form logic to useLogin hook
 * - Added TypeScript types
 * - Extracted sub-components for better organization
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { School, AlertCircle, Loader2 } from 'lucide-react';
import { useLogin } from '@/hooks/useLogin';

/**
 * LoginHeader - Header section with logo and title
 */
const LoginHeader: React.FC = () => (
  <div className="text-center">
    <div className="flex justify-center items-center mx-auto w-16 h-16 bg-blue-600 rounded-full">
      <School className="w-8 h-8 text-white" />
    </div>
    <h1 className="mt-6 text-3xl font-bold text-white">
      SynapseS
    </h1>
    <p className="mt-2 text-sm text-white/90">
      Đăng nhập để truy cập hệ thống quản lý trường học
    </p>
  </div>
);

/**
 * ErrorAlert - Error message display component
 */
interface ErrorAlertProps {
  message: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message }) => (
  <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg border border-red-200">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-sm text-red-800">{message}</p>
  </div>
);

/**
 * UsernameField - Username input field component
 */
interface UsernameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UsernameField: React.FC<UsernameFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label htmlFor="username" className="text-sm font-medium text-gray-700">
      Username
    </label>
    <Input
      id="username"
      name="username"
      type="text"
      autoComplete="username"
      required
      value={value}
      onChange={onChange}
      placeholder="ho_va_ten.ten_truong.ten_tinh"
    />
  </div>
);

/**
 * PasswordField - Password input field component
 */
interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <label htmlFor="password" className="text-sm font-medium text-gray-700">
      Mật khẩu
    </label>
    <Input
      id="password"
      name="password"
      type="password"
      autoComplete="current-password"
      required
      value={value}
      onChange={onChange}
      placeholder="Nhập mật khẩu"
    />
  </div>
);

/**
 * SubmitButton - Login submit button with loading state
 */
interface SubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ loading, disabled }) => (
  <Button
    type="submit"
    disabled={loading || disabled}
    className="w-full"
  >
    {loading ? (
      <>
        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
        Đang đăng nhập...
      </>
    ) : (
      'Đăng nhập'
    )}
  </Button>
);

/**
 * ForgotPasswordLink - Forgot password navigation button
 */
interface ForgotPasswordLinkProps {
  onClick: () => void;
}

const ForgotPasswordLink: React.FC<ForgotPasswordLinkProps> = ({ onClick }) => (
  <div className="text-center">
    <Button
      type="button"
      variant="link"
      onClick={onClick}
      className="text-sm text-blue-600 hover:text-blue-500"
    >
      Quên mật khẩu?
    </Button>
  </div>
);

/**
 * DemoAccounts - Demo credentials display
 */
const DemoAccounts: React.FC = () => (
  <div className="pt-6 mt-6 border-t border-gray-200">
    <div className="text-center">
      <p className="mb-3 text-xs text-gray-500">Tài khoản demo:</p>
      <div className="space-y-2 text-xs text-gray-600">
        <div className="p-2 bg-gray-50 rounded-lg">
          <strong>Admin:</strong> admin.chuyen_le_quy_don.tphcm / password
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <strong>Giáo viên:</strong> nguyen_thi_lan.chuyen_le_quy_don.tphcm / password
        </div>
      </div>
    </div>
  </div>
);

/**
 * Login Component
 * Main authentication page component
 * 
 * Features:
 * - User login with username/password
 * - Role-based navigation
 * - Error handling and display
 * - Loading state during submission
 * - Demo account credentials
 */
const Login: React.FC = () => {
  const { formData, loading, error, handleInputChange, handleSubmit } = useLogin();

  return (
    <div 
      className="relative flex justify-center items-center p-4 min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/background_login.png)',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 space-y-8 w-full max-w-md">
        {/* Header section */}
        <LoginHeader />

        {/* Login form card */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Nhập thông tin tài khoản để tiếp tục
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error alert */}
              {error && <ErrorAlert message={error} />}

              {/* Username field */}
              <UsernameField value={formData.username} onChange={handleInputChange} />

              {/* Password field */}
              <PasswordField value={formData.password} onChange={handleInputChange} />

              {/* Submit button */}
              <SubmitButton loading={loading} />

              {/* Forgot password link */}
              <ForgotPasswordLink onClick={() => window.location.href = '/forgot-password'} />
            </form>

            {/* Demo accounts */}
            <DemoAccounts />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
