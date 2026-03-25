import { Skeleton } from '@/components/ui/skeleton';

export const AIStatusCardSkeleton = () => (
  <div className="p-4 space-y-4 bg-white rounded-lg border border-gray-200">
    <Skeleton className="h-6 w-48" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export const StudentsTableSkeleton = () => (
  <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-4">
    {/* Header */}
    <div className="flex items-center gap-3 p-3 border-b">
      <Skeleton className="h-5 w-5" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32 ml-auto" />
    </div>
    {/* Rows */}
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
      </div>
    ))}
  </div>
);
