/**
 * ForgotPasswordLink - Forgot password navigation button
 */
import { Button } from '@/components/ui/button';

interface ForgotPasswordLinkProps {
  onClick: () => void;
}

export function ForgotPasswordLink({ onClick }: ForgotPasswordLinkProps) {
  return (
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
}
