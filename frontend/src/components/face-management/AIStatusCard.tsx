import {
  Users,
  UserCheck,
  AlertCircle,
  Camera,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIStatus } from '@/hooks/face-management/useFaceManagement';

interface AIStatusCardProps {
  aiStatus: AIStatus | null;
  onReloadModels: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export default function AIStatusCard({
  aiStatus,
  onReloadModels,
  onRefresh,
}: AIStatusCardProps) {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          <span>Trạng thái hệ thống AI</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aiStatus ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center mb-2 space-x-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {aiStatus.service_status === 'active'
                      ? 'Hoạt động'
                      : 'Không hoạt động'}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Trạng thái service
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {aiStatus.service_name}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center mb-2 space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-600">
                    {aiStatus.database_encodings || 0}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Khuôn mặt đã đăng ký
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Database: {aiStatus.database_encodings}, Local:{' '}
                  {aiStatus.local_ai_encodings}
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center mb-2 space-x-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-600">
                    {aiStatus.accuracy || 'N/A'}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Độ chính xác</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {aiStatus.similarity_threshold
                    ? `Threshold: ${aiStatus.similarity_threshold}`
                    : 'Advanced AI'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center mb-2 space-x-2">
                  {aiStatus.sync_status === 'synced' ? (
                    <UserCheck className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-orange-600" />
                  )}
                  <div className="text-2xl font-bold text-orange-600">
                    {aiStatus.sync_status === 'synced'
                      ? 'Đồng bộ'
                      : 'Chưa đồng bộ'}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Trạng thái đồng bộ
                </div>
                <div className="mt-1 text-xs capitalize text-muted-foreground">
                  {aiStatus.sync_status?.replace('_', ' ')}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-muted-foreground">
            Không thể tải thông tin AI status
          </div>
        )}

        <div className="flex mt-4 space-x-3">
          <Button onClick={onReloadModels} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Models
          </Button>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
