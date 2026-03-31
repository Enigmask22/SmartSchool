import { ReactNode } from 'react';

export interface PageHeaderTitleProps {
  /**
   * Page title (main heading)
   */
  title: string;

  /**
   * Optional subtitle or description (can be string or React node)
   */
  description?: string | ReactNode;

  /**
   * Optional icon to display next to title
   */
  icon?: ReactNode;
}

/**
 * PageHeaderTitle Component
 *
 * Displays title section with optional icon and description.
 * Used within PageHeader component.
 *
 * @example
 * ```tsx
 * <PageHeaderTitle
 *   title="Dashboard"
 *   description="Welcome back"
 *   icon={<DashboardIcon />}
 * />
 * ```
 */
export function PageHeaderTitle({
  title,
  description,
  icon,
}: PageHeaderTitleProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
      {/* Left column: Icon */}
      {icon && (
        <div className="flex-shrink-0 text-primary pt-1">
          {icon}
        </div>
      )}

      {/* Right column: Title and Description */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">
          {title}
        </h1>

        {/* Optional description */}
        {description && (
          <div className="text-sm">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
