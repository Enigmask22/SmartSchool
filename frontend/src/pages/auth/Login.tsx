/**
 * Login.tsx - Authentication Page Component
 * 
 * Main login form page component
 * - Manages form state via useLogin hook
 * - Displays login form with error handling
 * - Handles form submission and navigation
 */

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card.tsx';
import { useLogin } from '@/hooks/useLogin';
import {
  LoginHeader,
  ErrorAlert,
  UsernameField,
  PasswordField,
  SubmitButton,
  ForgotPasswordLink,
} from '@/components/login';

/**
 * Login Component - Main authentication page
 * 
 * Features:
 * - User login with username/password
 * - Form validation and error display
 * - Loading state during submission
 * - Automatic redirect after successful login
 * - Demo account credentials available
 */
export function Login() {
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;
