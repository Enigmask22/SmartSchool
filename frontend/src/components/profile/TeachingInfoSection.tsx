import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  School,
  BookOpen,
} from 'lucide-react';
import { TeachingInfoSkeleton } from './PersonalInfoSkeleton';

interface TeachingInfoSectionProps {
  homeroomClasses: any[];
  subjectClasses: any[];
  loading: boolean;
}

export const TeachingInfoSection = ({
  homeroomClasses,
  subjectClasses,
  loading,
}: TeachingInfoSectionProps) => {
  // If no data available after loading, show empty state
  const isEmpty = homeroomClasses.length === 0 && subjectClasses.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Homeroom Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="w-5 h-5" />
            Lớp chủ nhiệm
          </CardTitle>
          <CardDescription>
            Danh sách lớp bạn đang chủ nhiệm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && homeroomClasses.length === 0 ? (
            <TeachingInfoSkeleton />
          ) : homeroomClasses.length > 0 ? (
            <div className="space-y-3">
              {homeroomClasses.map((classItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <School className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {classItem.class_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Khối {classItem.grade}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {classItem.total_students || 0} học sinh
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <School className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Chưa có lớp chủ nhiệm
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teaching Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Lớp giảng dạy
          </CardTitle>
          <CardDescription>
            Danh sách lớp và môn học bạn đang giảng dạy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && subjectClasses.length === 0 ? (
            <TeachingInfoSkeleton />
          ) : subjectClasses.length > 0 ? (
            <div className="space-y-3">
              {subjectClasses.map((item, index) => (
                <div
                  key={index}
                  className="p-3 border border-green-200 rounded-lg bg-green-50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <BookOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.subjects?.subject_name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.subjects?.subject_code || 'N/A'}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-green-800 bg-green-100"
                    >
                      {item.subjects?.subject_code || 'N/A'}
                    </Badge>
                  </div>
                  <div className="ml-13">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Lớp:</span>{' '}
                      {item.classes?.class_name || 'N/A'} - Khối{' '}
                      {item.classes?.grade || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Trạng thái:</span>
                      <Badge variant="outline" className="ml-1">
                        {item.is_active ? 'Đang dạy' : 'Tạm dừng'}
                      </Badge>
                    </p>
                    {item.semester && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Học kỳ:</span>{' '}
                        {item.semester}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Chưa có lớp giảng dạy
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined empty state */}
      {isEmpty && !loading && (
        <Card className="lg:col-span-2">
          <CardContent className="py-8 text-center">
            <School className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Chưa có thông tin giảng dạy
            </h3>
            <p className="text-gray-600">
              Bạn chưa được phân công chủ nhiệm lớp hoặc giảng dạy môn học nào.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
