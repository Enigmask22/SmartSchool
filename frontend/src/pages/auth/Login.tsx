/**
 * Login.tsx - Authentication Page Component
 * 
 * Main login form page component
 * - Manages form state directly (UI layer)
 * - Displays login form with error handling
 * - Delegates authentication logic to useAuthSubmit hook
 */

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card.tsx';
import { AuthContext } from '@/contexts/AuthContext';
import { useAuthSubmit } from '@/hooks/login/useAuthSubmit';
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
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  // Form state stays in component (UI layer)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Authentication logic delegated to useAuthSubmit hook
  const { isLoading, error, submit } = useAuthSubmit();

  // Redirect if already authenticated
  useEffect(() => {
    if (authContext?.isAuthenticated?.()) {
      // Redirect based on user role
      if (authContext?.user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/select-dashboard', { replace: true });
      }
    }
  }, [authContext, navigate]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submit(formData.username, formData.password);
  };

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
              <SubmitButton loading={isLoading} />

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