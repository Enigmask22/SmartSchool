/**
 * Skeleton - Loading placeholder component
 * Shows a shimmer effect while data is loading
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}
