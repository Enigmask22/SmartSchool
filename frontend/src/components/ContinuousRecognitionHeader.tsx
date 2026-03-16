/**
 * ContinuousRecognitionHeader.tsx
 * 
 * Header component for Continuous Recognition page
 * Displays: Title, status badges, control buttons
 */

import React from 'react';
import { Camera, Wifi, WifiOff, Square } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ContinuousRecognitionHeaderProps {
  isConnected: boolean;
  isRunning: boolean;
  isCameraOn: boolean;
  cameraSource: 'webcam' | 'managed';
  selectedCameraId: string | null;
  onToggleCamera: () => Promise<void>;
  onToggleRecognition: () => void;
  totalRecognitionsToday: number;
  startTime: number | null;
}

const ContinuousRecognitionHeader: React.FC<ContinuousRecognitionHeaderProps> = ({
  isConnected,
  isRunning,
  isCameraOn,
  cameraSource,
  selectedCameraId,
  onToggleCamera,
  onToggleRecognition,
  totalRecognitionsToday,
  startTime,
}) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const runningTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  return (
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
            {/* Connection Status */}
            <Badge
              variant={isConnected ? 'default' : 'destructive'}
              className="flex items-center space-x-1"
            >
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>{isConnected ? 'Đã kết nối' : 'Mất kết nối'}</span>
            </Badge>

            {/* Running Status */}
            <Badge
              variant={isRunning ? 'default' : 'secondary'}
              className="flex items-center space-x-1"
            >
              <span>{isRunning ? 'Đang chạy' : 'Đã dừng'}</span>
            </Badge>

            {/* Running Time */}
            {isRunning && (
              <div className="text-sm font-medium px-3 py-1 bg-blue-50 rounded border border-blue-200">
                {formatDuration(runningTime)}
              </div>
            )}

            {/* Camera Toggle */}
            {cameraSource === 'webcam' && (
              <Button
                onClick={onToggleCamera}
                variant={isCameraOn ? 'destructive' : 'default'}
                className="flex items-center space-x-2"
              >
                {isCameraOn ? <Square size={18} /> : <Camera size={18} />}
                <span>{isCameraOn ? 'Tắt Camera' : 'Bật Camera'}</span>
              </Button>
            )}

            {/* Recognition Stats */}
            <div className="text-sm font-medium px-3 py-1 bg-green-50 rounded border border-green-200">
              {totalRecognitionsToday} nhân diện hôm nay
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default ContinuousRecognitionHeader;
