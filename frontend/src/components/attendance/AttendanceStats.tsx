import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface AttendanceStats {
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate?: number;
}

interface AttendanceStatsProps {
  stats: AttendanceStats | null;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full text-primary bg-primary/10">
              <Users className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Tổng học sinh</p>
              <p className="text-2xl font-bold">{stats.total_students}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 text-green-600 bg-green-100 rounded-full">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Có mặt</p>
              <p className="text-2xl font-bold text-green-600">{stats.present_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full text-destructive bg-destructive/10">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Vắng mặt</p>
              <p className="text-2xl font-bold text-destructive">{stats.absent_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-3 text-yellow-600 bg-yellow-100 rounded-full">
              <Clock className="w-5 h-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Muộn</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.late_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceStats;
