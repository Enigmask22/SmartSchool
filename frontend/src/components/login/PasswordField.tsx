/**
 * PasswordField - Password input field component with visibility toggle
 * Provides password visibility toggle for cross-browser compatibility
 */
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePasswordVisibility } from '@/hooks/login/usePasswordVisibility';

interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordField({ value, onChange }: PasswordFieldProps) {
  const { isVisible, toggle } = usePasswordVisibility();

  return (
    <div className="space-y-2">
      <label htmlFor="password" className="text-sm font-medium text-gray-700">
        Mật khẩu
      </label>
      <div className="relative">
        <Input
          id="password"
          name="password"
          type={isVisible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={value}
          onChange={onChange}
          placeholder="Nhập mật khẩu"
          className="pr-10"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
        >
          {isVisible ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
