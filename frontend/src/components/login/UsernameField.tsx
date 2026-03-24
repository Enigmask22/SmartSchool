/**
 * UsernameField - Username input field component
 */
import { Input } from '@/components/ui/input.tsx';

interface UsernameFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UsernameField({ value, onChange }: UsernameFieldProps) {
  return (
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
}
