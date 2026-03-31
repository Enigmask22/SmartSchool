import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StudentData, AttendanceStats } from '@/hooks/homeroom-dashboard/useHomeroomData';

interface StatsCardsProps {
  students: StudentData[];
  attendanceStats: AttendanceStats | null;
  loading?: boolean;
}

export function StatsCards({ students, attendanceStats, loading = false }: StatsCardsProps) {
  // Icon definitions (static, never change)
  const statIcons = [
    { Icon: Users, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    { Icon: UserCheck, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
    { Icon: UserX, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
    { Icon: BarChart3, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  ];

  const labels = [
    'Tổng số học sinh',
    'Số lần muộn (tháng)',
    'Số lần vắng (tháng)',
    'Tỷ lệ điểm danh',
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => {
          const { Icon, bgColor, iconColor } = statIcons[idx];
          return (
            <Card key={idx} className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Icon - always visible, static */}
                  <div className={`p-3 ${bgColor} rounded-lg flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    {/* Label - static text */}
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {labels[idx]}
                    </p>
                    {/* Number skeleton - matches text-2xl height */}
                    <Skeleton className="h-7 w-20 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng số học sinh</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Số lần muộn (tháng)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats?.late_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Số lần vắng (tháng)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats?.absent_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tỷ lệ điểm danh</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats?.attendance_rate
                  ? `${attendanceStats.attendance_rate}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
