import {
  GraduationCap,
  Users,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsData } from '@/hooks/subject-dashboard/useSubjectDashboard';

interface StatsCardsProps {
  analytics: AnalyticsData;
  loading?: boolean;
}

export function StatsCards({ analytics, loading = false }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-10 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-blue-500 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tổng số lớp dạy</p>
            <h3 className="mt-2 text-4xl font-bold text-blue-600">
              {analytics.total_classes}
            </h3>
            <p className="mt-1 text-xs text-gray-500 opacity-0">_</p>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl">
            <GraduationCap className="text-blue-600 w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-slate-500 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tổng số học sinh</p>
            <h3 className="mt-2 text-4xl font-bold text-slate-700">
              {analytics.total_students}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {analytics.students_with_grades} đã có điểm
            </p>
          </div>
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-slate-100">
            <Users className="w-7 h-7 text-slate-600" />
          </div>
        </div>
      </div>

      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-emerald-500 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              {analytics.is_letter_grade_subject ? 'Số HS đạt' : 'Điểm trung bình'}
            </p>
            <h3 className="mt-2 text-4xl font-bold text-emerald-600">
              {analytics.is_letter_grade_subject
                ? `${analytics.overview?.pass_count || 0}/${analytics.students_with_grades}`
                : analytics.overview?.average_score || 0}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {analytics.is_letter_grade_subject
                ? `${analytics.overview?.fail_count || 0} không đạt`
                : `Cao nhất: ${analytics.overview?.highest_score || 0}`}
            </p>
          </div>
          <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-xl">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-lg rounded-2xl border-amber-500 hover:shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Tỷ lệ đạt</p>
            <h3 className="mt-2 text-4xl font-bold text-amber-600">
              {analytics.overview?.pass_rate || 0}%
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {analytics.overview?.pass_count || 0}/{analytics.students_with_grades} học sinh
            </p>
          </div>
          <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-xl">
            <Award className="w-7 h-7 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
