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
import { Loader2 } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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

/** Ảnh nền trang đăng nhập — preload trước khi hiển thị form để tránh “nháy” nền trắng */
const LOGIN_BACKGROUND_URL = '/background_login.jpg';

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

  /** Chỉ hiện form + nền sau khi ảnh background đã tải (hoặc lỗi tải để không kẹt màn hình) */
  const [isVisualReady, setIsVisualReady] = useState(false);

  // Form state stays in component (UI layer)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Authentication logic delegated to useAuthSubmit hook
  const { isLoading, error, submit } = useAuthSubmit();

  useEffect(() => {
    const img = new Image();
    const finish = () => setIsVisualReady(true);
    img.onload = finish;
    img.onerror = finish;
    img.src = LOGIN_BACKGROUND_URL;
  }, []);

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

  if (!isVisualReady) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 text-slate-100"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-slate-400">Đang tải trang đăng nhập…</p>
      </div>
    );
  }

  return (
    <div 
      className="relative flex justify-center items-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${LOGIN_BACKGROUND_URL})`,
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 space-y-4 w-full max-w-md">
        {/* Header section */}
        <LoginHeader />

        {/* Login form card */}
        <Card>
          <CardHeader className="text-center">
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
              <ForgotPasswordLink onClick={() => navigate('/forgot-password')} />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;