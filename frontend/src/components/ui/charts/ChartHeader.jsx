/**
 * ChartHeader - Header component for charts
 * Provides title, description, and optional actions
 */

import { cn } from '@/lib/cn';

const ChartHeader = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-[var(--bb-space-4)]',
        'mb-[var(--bb-space-4)]',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-[var(--bb-space-2)]">
          {children}
        </div>
      )}
    </div>
  );
};

export default ChartHeader;

