import { Users, CheckCircle, XCircle, Clock, FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceStats {
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count?: number;
  attendance_rate?: number;
}

interface AttendanceStatsProps {
  stats: AttendanceStats | null;
  loading?: boolean;
}

const AttendanceStats = ({ stats, loading = false }: AttendanceStatsProps) => {
  const statConfigs = [
    {
      icon: Users,
      label: 'Tổng số học sinh',
      value: stats?.total_students || 0,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      borderColor: 'border-l-blue-500',
    },
    {
      icon: CheckCircle,
      label: 'Có mặt',
      value: stats?.present_count || 0,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      borderColor: 'border-l-green-500',
    },
    {
      icon: XCircle,
      label: 'Vắng mặt',
      value: stats?.absent_count || 0,
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      borderColor: 'border-l-red-500',
    },
    {
      icon: FileCheck,
      label: 'Vắng có phép',
      value: stats?.excused_count || 0,
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600',
      borderColor: 'border-l-indigo-500',
    },
    {
      icon: Clock,
      label: 'Muộn',
      value: stats?.late_count || 0,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      borderColor: 'border-l-yellow-500',
    },
  ];

  const isLoadingOrEmpty = loading || !stats;

  return (
    <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-5">
      {statConfigs.map((config, idx) => {
        const Icon = config.icon;
        return (
          <div
            key={idx}
            className={`p-6 transition-shadow duration-200 bg-white border-[1px] border-gray-200 border-l-4 shadow-md rounded-xl ${config.borderColor} hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{config.label}</p>
                {isLoadingOrEmpty ? (
                  <Skeleton className="h-9 w-16 mt-2 mb-2" />
                ) : (
                  <h3 className={`mt-2 text-4xl font-bold ${config.textColor}`}>
                    {config.value}
                  </h3>
                )}
                <p className="mt-1 text-xs text-gray-500 opacity-0">_</p>
              </div>
              <div
                className={`flex items-center justify-center ${config.bgColor} w-14 h-14 rounded-xl flex-shrink-0`}
              >
                <Icon className={`w-7 h-7 ${config.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttendanceStats;
