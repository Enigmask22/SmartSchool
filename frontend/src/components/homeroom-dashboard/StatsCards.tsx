import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
} from 'lucide-react';
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
    { Icon: Users, bgColor: 'bg-blue-100', iconColor: 'text-blue-600', borderColor: 'border-l-blue-500' },
    { Icon: UserCheck, bgColor: 'bg-green-100', iconColor: 'text-green-600', borderColor: 'border-l-green-500' },
    { Icon: UserX, bgColor: 'bg-red-100', iconColor: 'text-red-600', borderColor: 'border-l-red-500' },
    { Icon: BarChart3, bgColor: 'bg-purple-100', iconColor: 'text-purple-600', borderColor: 'border-l-purple-500' },
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
          const { Icon, bgColor, iconColor, borderColor } = statIcons[idx];
          return (
            <div
              key={idx}
              className={`p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl ${borderColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{labels[idx]}</p>
                  <Skeleton className="h-9 w-16 mt-2 mb-2" />
                  <p className="mt-1 text-xs text-gray-500 opacity-0">_</p>
                </div>
                <div className={`flex items-center justify-center ${bgColor} w-14 h-14 rounded-xl flex-shrink-0`}>
                  <Icon className={`w-7 h-7 ${iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total Students */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-blue-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tổng số học sinh</p>
            <h3 className="mt-2 text-4xl font-bold text-blue-600">{students.length}</h3>
            <p className="mt-1 text-xs text-gray-500 opacity-0">_</p>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Card 2: Late Count */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-green-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Số lần muộn (tháng)</p>
            <h3 className="mt-2 text-4xl font-bold text-green-600">
              {attendanceStats?.late_count || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Học sinh muộn
            </p>
          </div>
          <div className="flex items-center justify-center bg-green-100 w-14 h-14 rounded-xl flex-shrink-0">
            <UserCheck className="w-7 h-7 text-green-600" />
          </div>
        </div>
      </div>

      {/* Card 3: Absent Count */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-red-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Số lần vắng (tháng)</p>
            <h3 className="mt-2 text-4xl font-bold text-red-600">
              {attendanceStats?.absent_count || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Học sinh vắng
            </p>
          </div>
          <div className="flex items-center justify-center bg-red-100 w-14 h-14 rounded-xl flex-shrink-0">
            <UserX className="w-7 h-7 text-red-600" />
          </div>
        </div>
      </div>

      {/* Card 4: Attendance Rate */}
      <div className="p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl border-l-purple-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tỷ lệ điểm danh</p>
            <h3 className="mt-2 text-4xl font-bold text-purple-600">
              {attendanceStats?.attendance_rate ? `${attendanceStats.attendance_rate}%` : '0%'}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Tháng này
            </p>
          </div>
          <div className="flex items-center justify-center bg-purple-100 w-14 h-14 rounded-xl flex-shrink-0">
            <BarChart3 className="w-7 h-7 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
