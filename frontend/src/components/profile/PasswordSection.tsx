import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { usePasswordManagement } from '@/hooks/profile';
import { useState, useEffect } from 'react';

interface PasswordSectionProps {
  onError: (error: string | null) => void;
  onSuccess: (message: string | null) => void;
}

export const PasswordSection = ({
  onError,
  onSuccess,
}: PasswordSectionProps) => {
  const passwordMgmt = usePasswordManagement();
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (passwordMgmt.error) {
      onError(passwordMgmt.error);
    }
  }, [passwordMgmt.error]);

  useEffect(() => {
    if (passwordMgmt.successMessage) {
      onSuccess(passwordMgmt.successMessage);
      setShowPasswordChange(false);
    }
  }, [passwordMgmt.successMessage]);

  const handlePasswordChange = async () => {
    await passwordMgmt.changePassword();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Bảo mật tài khoản
        </CardTitle>
        <CardDescription>
          Thay đổi mật khẩu để bảo vệ tài khoản
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showPasswordChange ? (
          <Button
            onClick={() => setShowPasswordChange(true)}
            variant="outline"
            className="flex items-center w-full gap-2"
          >
            <Key className="w-4 h-4" />
            Đổi mật khẩu
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={passwordMgmt.showPasswords.current ? 'text' : 'password'}
                  value={passwordMgmt.passwordData.currentPassword}
                  onChange={(e) =>
                    passwordMgmt.setPasswordData({
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập mật khẩu hiện tại"
                  disabled={passwordMgmt.updating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() =>
                    passwordMgmt.togglePasswordVisibility('current')
                  }
                >
                  {passwordMgmt.showPasswords.current ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new_password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={passwordMgmt.showPasswords.new ? 'text' : 'password'}
                  value={passwordMgmt.passwordData.newPassword}
                  onChange={(e) =>
                    passwordMgmt.setPasswordData({
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập mật khẩu mới"
                  disabled={passwordMgmt.updating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => passwordMgmt.togglePasswordVisibility('new')}
                >
                  {passwordMgmt.showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={
                    passwordMgmt.showPasswords.confirm ? 'text' : 'password'
                  }
                  value={passwordMgmt.passwordData.confirmPassword}
                  onChange={(e) =>
                    passwordMgmt.setPasswordData({
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={passwordMgmt.updating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() =>
                    passwordMgmt.togglePasswordVisibility('confirm')
                  }
                >
                  {passwordMgmt.showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handlePasswordChange}
                disabled={passwordMgmt.updating}
                className="flex items-center gap-2"
              >
                {passwordMgmt.updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Đổi mật khẩu
              </Button>
              <Button
                onClick={() => {
                  setShowPasswordChange(false);
                  passwordMgmt.resetForm();
                }}
                variant="outline"
                disabled={passwordMgmt.updating}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Hủy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
