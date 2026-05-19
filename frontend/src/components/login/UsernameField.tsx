/**
 * UsernameField - Username input field component
 */
import { Input } from '@/components/ui/input';

interface UsernameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UsernameField({ value, onChange }: UsernameFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="username" className="text-sm font-medium text-gray-700">
        Email / Tên đăng nhập
      </label>
      <Input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        required
        value={value}
        onChange={onChange}
        placeholder="Nhập tên đăng nhập hoặc email"
      />
      {/* <p className="text-xs text-gray-500">
        Bạn có thể sử dụng tên đăng nhập hoặc email để đăng nhập
      </p> */}
    </div>
  );
}
