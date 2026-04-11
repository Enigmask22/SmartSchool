/**
 * SubmitButton - Login submit button with loading state
 */
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
}

export function SubmitButton({ loading, disabled }: SubmitButtonProps) {
  return (
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
}
