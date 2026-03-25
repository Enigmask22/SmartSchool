import { Skeleton } from '@/components/ui/skeleton';

export const TeacherHeaderSkeleton = () => (
  <div className="p-4 space-y-4 bg-white rounded-lg border border-gray-200">
    <Skeleton className="h-8 w-64" />
    <div className="flex gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-48" />
    </div>
  </div>
);

export const ClassSelectorSkeleton = () => (
  <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-4">
    <Skeleton className="h-6 w-32" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

export const GradeTableSkeleton = () => (
  <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-4">
    {/* Header */}
    <div className="flex items-center gap-3 p-3 border-b">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-4 w-24" />
      ))}
    </div>
    {/* Rows */}
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        {[1, 2, 3, 4, 5].map((j) => (
          <Skeleton key={j} className="h-4 w-20" />
        ))}
      </div>
    ))}
  </div>
);
