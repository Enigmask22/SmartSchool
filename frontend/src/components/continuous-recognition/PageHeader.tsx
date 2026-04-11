// React already imported by JSX transform
import { Camera, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader as CommonPageHeader } from '@/components/common/PageHeader';

interface PageHeaderProps {
  isConnected: boolean;
  isRunning: boolean;
  totalRecognitionsToday: number;
  runningTime: number;
}

const PageHeader = ({
  isConnected,
  isRunning,
}: PageHeaderProps) => {
  const description = (
    <div className="space-y-2">
      {/* <p className="text-sm text-gray-600">Hệ thống nhận diện khuôn mặt tự động liên tục</p> */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <Badge
          variant={isConnected ? "default" : "destructive"}
          className="flex items-center gap-1"
        >
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isConnected ? "Đã kết nối" : "Mất kết nối"}</span>
        </Badge>
        <Badge
          variant={isRunning ? "default" : "secondary"}
          className="flex items-center gap-1"
        >
          <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
        </Badge>
      </div>
    </div>
  );

  return (
    <CommonPageHeader
      title="Quản lý điểm danh tự động"
      description={description}
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-primary flex-shrink-0">
          <Camera className="w-8 h-8 text-white" />
        </div>
      }
    />
  );
};

export default PageHeader;
