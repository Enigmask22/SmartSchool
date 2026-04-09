// import { Key } from 'lucide-react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ForgotPasswordHeader() {
  return (
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-primary rounded-full">
          {/* <Key className="w-8 h-8 text-primary-foreground" /> */}
          <img src="/logo-no-bg.png" alt="Key Icon" className="w-16 h-16" />
        </div>
        <CardTitle className="text-3xl font-extrabold text-white">
          SynapseS
        </CardTitle>
        <CardDescription className="text-md text-white/80">
          Đặt lại mật khẩu
        </CardDescription>
      </CardHeader>
  );
}
