/**
 * LoginHeader - Header section with logo and title
 */
// import { School } from 'lucide-react';

export function LoginHeader() {
  return (
    <div className="text-center">
      <div className="flex justify-center items-center mx-auto w-16 h-16 bg-blue-600 rounded-full">
        <img
          src="/logo-no-bg.png"
          alt="SynapseS Logo"
          width={96}
          height={96}
          className="text-white rounded-full"
        />
        {/* <School className="w-8 h-8 text-white" /> */}
      </div>
      <h1 className="mt-3 text-3xl font-bold text-white">
        SynapseS
      </h1>
      <p className="mt-2 text-sm text-white/90">
        Đăng nhập để truy cập hệ thống quản lý trường học
      </p>
    </div>
  );
}
