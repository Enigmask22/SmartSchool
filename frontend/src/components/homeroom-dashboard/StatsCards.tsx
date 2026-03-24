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
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng học sinh</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Tổng số lần muộn (tháng)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats?.late_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Tổng số lần vắng (tháng)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats?.absent_count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
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
