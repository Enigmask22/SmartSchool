import { Skeleton } from '@/components/ui/skeleton';

interface PageHeaderSkeletonProps {
  /**
   * Number of skeleton controls to display
   * @default 3
   */
  count?: number;

  /**
   * Width specification for skeleton controls
   * Useful when skeleton widths don't follow the standard pattern
   * Array of widths or single width for all
   * @example ['min-w-[160px]', 'min-w-[200px]', 'min-w-[120px]']
   */
  widths?: string | string[];
}

/**
 * PageHeaderSkeleton Component
 *
 * Shows loading skeleton for controls section.
 * Automatically matches layout with PageHeaderControls.
 *
 * Default widths provide good coverage for common controls:
 * - Filter selects: min-w-[160px]
 * - Larger selects: min-w-[200px]
 * - Small selects: min-w-[120px]
 *
 * @example
 * ```tsx
 * // Auto: 3 skeletons with default widths
 * <PageHeaderSkeleton />
 *
 * // Custom: 4 skeletons with specific widths
 * <PageHeaderSkeleton
 *   count={4}
 *   widths={['min-w-[160px]', 'min-w-[200px]', 'min-w-[120px]', 'min-w-[120px]']}
 * />
 * ```
 */
export function PageHeaderSkeleton({
  count = 3,
  widths = [
    'min-w-[160px]',  // Academic year, standard filter
    'min-w-[200px]',  // Class select, larger
    'min-w-[120px]',  // Month/year, smaller
  ],
}: PageHeaderSkeletonProps) {
  // Normalize widths to array
  const widthArray = Array.isArray(widths) ? widths : Array(count).fill(widths);

  return (
    <div className="flex flex-row flex-wrap gap-3 items-end">
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`${widthArray[idx] || widthArray[widthArray.length - 1]} h-10 rounded-md`}
        />
      ))}
    </div>
  );
}
