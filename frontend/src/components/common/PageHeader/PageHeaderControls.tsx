import { ReactNode } from 'react';

export type ControlsDirection = 'row' | 'col';
export type ControlsSpacing = 'sm' | 'md' | 'lg';

interface PageHeaderControlsProps {
  /**
   * Controls content (typically Select, Button, or other filter components)
   */
  children: ReactNode;

  /**
   * Flex direction
   * @default 'row'
   */
  direction?: ControlsDirection;

  /**
   * Gap between controls
   * sm: gap-2, md: gap-3, lg: gap-4
   * @default 'md'
   */
  spacing?: ControlsSpacing;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Mapping for spacing values to Tailwind gap classes
 */
const SPACING_MAP: Record<ControlsSpacing, string> = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

/**
 * PageHeaderControls Component
 *
 * Wrapper for controls section in PageHeader.
 * Handles responsive layout and consistent spacing.
 *
 * @example
 * ```tsx
 * <PageHeaderControls spacing="md">
 *   <Select value={year} onChange={setYear} />
 *   <Select value={class} onChange={setClass} />
 *   <Button>Export</Button>
 * </PageHeaderControls>
 * ```
 */
export function PageHeaderControls({
  children,
  direction = 'row',
  spacing = 'md',
  className = '',
}: PageHeaderControlsProps) {
  const directionClass = direction === 'row' ? 'flex-row flex-wrap' : 'flex-col';
  const spacingClass = SPACING_MAP[spacing];

  return (
    <div className={`flex ${directionClass} ${spacingClass} items-end ${className}`}>
      {children}
    </div>
  );
}
