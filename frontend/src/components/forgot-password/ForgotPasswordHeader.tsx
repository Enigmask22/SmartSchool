import { Key } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ForgotPasswordHeader() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-primary rounded-full">
          <Key className="w-8 h-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-3xl font-extrabold">
          SynapseS
        </CardTitle>
        <CardDescription>
          Đặt lại mật khẩu
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
