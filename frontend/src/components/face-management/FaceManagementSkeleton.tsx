import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const AIStatusCardSkeleton = () => (
  <Card className="shadow-md">
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        <span>Trạng thái hệ thống AI</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          'border-green-200 bg-green-50',
          'border-blue-200 bg-blue-50',
          'border-purple-200 bg-purple-50',
          'border-orange-200 bg-orange-50',
        ].map((colors, i) => (
          <Card key={i} className={colors}>
            <CardContent className="p-4">
              <div className="flex items-center mb-2 space-x-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex mt-4 space-x-3">
        <Button disabled>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Models
        </Button>
        <Button disabled>
          <RefreshCw className="w-4 h-4 mr-2" />
          Làm mới
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const StudentsTableSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <Skeleton className="w-5 h-5 rounded" />
            <span>Học sinh đã đăng ký khuôn mặt</span>
          </CardTitle>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="bg-white rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b bg-gray-50">
          <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32 ml-auto" />
          </div>
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
