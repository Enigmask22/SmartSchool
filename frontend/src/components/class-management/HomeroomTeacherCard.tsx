import { UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HomeroomTeacherCardProps {
  homeroomTeacher: {
    name: string;
    code: string;
    full_name: string;
  } | null;
  selectedClassForManagement: string | null;
  loading?: boolean;
  initialLoading?: boolean;
}

const HomeroomTeacherCard = ({
  homeroomTeacher,
  selectedClassForManagement,
  loading = false,
  initialLoading = false,
}: HomeroomTeacherCardProps) => {
  return (
    <div className="p-6 transition-shadow duration-200 bg-white border-2 shadow-md rounded-2xl border-gray-100 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-gray-200">
        <div className="flex items-center justify-center bg-amber-100 w-10 h-10 rounded-lg flex-shrink-0">
          <UserCheck className="text-amber-600 w-5 h-5" />
        </div>
        <h3 className="font-semibold text-lg text-gray-900">Giáo viên chủ nhiệm</h3>
      </div>

      {/* Content */}
      {initialLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      ) : !selectedClassForManagement || !homeroomTeacher ? (
        <div className="py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100">
            <UserCheck className="w-6 h-6 text-amber-600" />
          </div>
          <p className="font-medium text-gray-500">
            Chọn lớp học để xem thông tin giáo viên chủ nhiệm
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-200 flex-shrink-0">
            <span className="text-lg font-bold text-amber-700">
              {homeroomTeacher.full_name?.charAt(0) || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {homeroomTeacher.full_name || homeroomTeacher.name}
            </p>
            {homeroomTeacher.code && (
              <p className="text-sm text-gray-500 truncate">
                Mã GV: {homeroomTeacher.code}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeroomTeacherCard;
