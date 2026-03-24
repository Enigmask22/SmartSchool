import React from 'react';
import { Camera, Wifi, WifiOff, Square, Play, Pause, Video } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface PageHeaderProps {
  isConnected: boolean;
  isRunning: boolean;
  isCameraOn: boolean;
  cameraSource: 'webcam' | 'managed';
  selectedCameraId: string | null;
  selectedMultiCameras: string[];
  useMultiCamera: boolean;
  availableCameras: any[];
  onToggleCamera?: () => void;
  onToggleRecognition?: () => void;
  totalRecognitionsToday: number;
  runningTime: number;
}

const PageHeader = ({
  isConnected,
  isRunning,
  isCameraOn,
  cameraSource,
  selectedCameraId,
  selectedMultiCameras,
  useMultiCamera,
  availableCameras,
  onToggleCamera,
  onToggleRecognition,
  totalRecognitionsToday,
  runningTime,
}: PageHeaderProps) => {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Camera className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold">
                  Điểm Danh Tự Động Liên Tục
                </CardTitle>
                <CardDescription>
                  Hệ thống nhận diện khuôn mặt tự động liên tục
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Status Indicators */}
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="flex items-center space-x-1"
              >
                {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span>{isConnected ? "Đã kết nối" : "Mất kết nối"}</span>
              </Badge>

              <Badge
                variant={isRunning ? "default" : "secondary"}
                className="flex items-center space-x-1"
              >
                <span>{isRunning ? "Đang chạy" : "Đã dừng"}</span>
              </Badge>

              {/* Camera Toggle Button - chỉ hiển thị cho webcam mode */}
              {cameraSource === "webcam" && onToggleCamera && (
                <Button
                  onClick={onToggleCamera}
                  variant={isCameraOn ? "destructive" : "default"}
                  className="flex items-center space-x-2"
                >
                  {isCameraOn ? <Square size={18} /> : <Camera size={18} />}
                  <span>{isCameraOn ? "Tắt Camera" : "Bật Camera"}</span>
                </Button>
              )}

              {/* Camera Info for Managed Camera */}
              {cameraSource === "managed" && selectedCameraId && (
                <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg bg-blue-50">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {availableCameras.find(
                      (c) => c.camera_id === selectedCameraId
                    )?.name || "Camera"}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {useMultiCamera
                      ? `${selectedMultiCameras.length} cameras`
                      : "Active"}
                  </Badge>
                </div>
              )}

              {/* Recognition Control Button */}
              {onToggleRecognition && (
                <Button
                  onClick={onToggleRecognition}
                  variant={isRunning ? "destructive" : "default"}
                  className="flex items-center space-x-2"
                >
                  {isRunning ? <Pause size={18} /> : <Play size={18} />}
                  <span>
                    {isRunning ? "Dừng Nhận Diện" : "Bắt Đầu Nhận Diện"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Info Banner */}
        <CardContent>
          <div className="flex items-start p-3 space-x-2 border rounded-lg bg-primary/5 border-primary/20">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm text-primary">
              <strong>Về mức độ khớp:</strong> InsightFace AI so sánh khuôn
              mặt với dữ liệu đã lưu. Điểm khớp từ <strong>★★☆☆☆</strong> (20
              điểm) trở lên là đủ để nhận diện chính xác. Điểm càng cao thì độ
              chính xác càng tốt.
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PageHeader;
