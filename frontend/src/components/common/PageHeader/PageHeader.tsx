import { ReactNode } from 'react';
import { PageHeaderTitle, type PageHeaderTitleProps } from './PageHeaderTitle';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';

interface PageHeaderProps extends PageHeaderTitleProps {
  /**
   * Controls section (filters, buttons, actions)
   * Should contain PageHeaderControls or custom elements
   */
  children?: ReactNode;

  /**
   * Loading state - shows skeleton instead of content
   */
  loading?: boolean;

  /**
   * Number of skeleton controls to show during loading
   * @default 3
   */
  skeletonCount?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export type { PageHeaderProps };

/**
 * PageHeader Component
 *
 * Standardized page header combining title section and controls.
 * Responsive layout: controls on right on desktop, stacked below on mobile.
 *
 * Features:
 * - Consistent styling across all pages
 * - Responsive title + controls layout
 * - Built-in loading skeleton support
 * - Proper mobile/desktop breakpoints
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard chủ nhiệm"
 *   description="Theo dõi học sinh"
 *   icon={<Icon />}
 *   loading={isLoading}
 * >
 *   <PageHeaderControls>
 *     <Select value={year} onChange={setYear} />
 *   </PageHeaderControls>
 * </PageHeader>
 * ```
 */
export function PageHeader({
  title,
  description,
  icon,
  children,
  loading = false,
  skeletonCount = 3,
  className = '',
}: PageHeaderProps) {
  // During loading, show skeleton in controls area
  const controlsContent = loading ? (
    <PageHeaderSkeleton count={skeletonCount} />
  ) : (
    children
  );

  return (
    <div className={`space-y-4 border-2 shadow-md border-gray-200 bg-white rounded-lg p-6 ${className}`}>
      {/* Row 1: Title Section */}
      <div>
        <PageHeaderTitle title={title} description={description} icon={icon} />
      </div>

      {/* Row 2: Controls Section */}
      <div className="flex justify-end">
        {controlsContent}
      </div>
    </div>
  );
}
