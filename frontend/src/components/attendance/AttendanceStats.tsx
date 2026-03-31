import { Card, CardContent } from '@/components/ui/card';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceStats {
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate?: number;
}

interface AttendanceStatsProps {
  stats: AttendanceStats | null;
  loading?: boolean;
}

const AttendanceStats = ({ stats, loading = false }: AttendanceStatsProps) => {
  const StatCard = ({
    icon: Icon,
    label,
    value,
    colorClassName,
    loading: isLoading,
  }: {
    icon: typeof Users;
    label: string;
    value: number;
    colorClassName: string;
    loading: boolean;
  }) => (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${colorClassName}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Show skeleton if loading OR stats not yet available
  const isLoadingOrEmpty = loading || !stats;

  return (
    <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
      <StatCard
        icon={Users}
        label="Tổng số học sinh"
        value={stats?.total_students || 0}
        colorClassName="text-primary bg-primary/10"
        loading={isLoadingOrEmpty}
      />
      <StatCard
        icon={CheckCircle}
        label="Có mặt"
        value={stats?.present_count || 0}
        colorClassName="text-green-600 bg-green-100"
        loading={isLoadingOrEmpty}
      />
      <StatCard
        icon={XCircle}
        label="Vắng mặt"
        value={stats?.absent_count || 0}
        colorClassName="text-destructive bg-destructive/10"
        loading={isLoadingOrEmpty}
      />
      <StatCard
        icon={Clock}
        label="Muộn"
        value={stats?.late_count || 0}
        colorClassName="text-yellow-600 bg-yellow-100"
        loading={isLoadingOrEmpty}
      />
    </div>
  );
};

export default AttendanceStats;
