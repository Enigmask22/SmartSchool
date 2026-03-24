/**
 * PasswordField - Password input field component
 */
import { Input } from '@/components/ui/input.tsx';

interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordField({ value, onChange }: PasswordFieldProps) {
  return (
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
}
