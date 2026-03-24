import React from 'react';
import { BarChart3, Info, Settings } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatisticsPanelProps {
  totalRecognitions: number;
  uniqueStudents: number;
  runningTime: number;
  isConnected: boolean;
  cooldownPeriod: number;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const StatisticsPanel = ({
  totalRecognitions,
  uniqueStudents,
  runningTime,
  isConnected,
  cooldownPeriod,
}: StatisticsPanelProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Recognition Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span>Thống Kê Nhận Diện</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng nhận diện:</span>
              <span className="font-semibold text-primary">
                {totalRecognitions}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Học sinh unique:
              </span>
              <span className="font-semibold text-green-600">
                {uniqueStudents}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Thời gian chạy:</span>
              <span className="font-semibold text-purple-600">
                {formatDuration(runningTime)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-green-600" />
            <span>Hướng Dẫn Mức Độ Khớp</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 rounded bg-emerald-600"></div>
              <span>★★★★★ Xuất sắc (≥45 điểm)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 bg-green-600 rounded"></div>
              <span>★★★★☆ Rất tốt (35-44 điểm)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 bg-blue-600 rounded"></div>
              <span>★★★☆☆ Tốt (25-34 điểm)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 bg-yellow-600 rounded"></div>
              <span>★★☆☆☆ Khá (20-24 điểm)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-2 bg-orange-600 rounded"></div>
              <span>★☆☆☆☆ Đạt (&lt;20 điểm)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <span>Trạng Thái Hệ Thống</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Engine:</span>
              <span className="font-semibold text-primary">
                InsightFace
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kết nối:</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Đã kết nối" : "Mất kết nối"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cooldown:</span>
              <span className="font-semibold text-primary">
                {cooldownPeriod}s
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPanel;
