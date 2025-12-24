/**
 * ChartCard - Wrapper component for charts
 * Provides consistent styling and layout for chart containers
 */

import { cn } from '@/lib/cn';

const ChartCard = ({
  title,
  description,
  children,
  className,
  headerActions,
  minHeight = '240px',
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-[var(--bb-radius-xl)] border border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-surface)]',
        'shadow-[var(--bb-elevation-subtle)]',
        className
      )}
      style={{ minHeight }}
    >
      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-start justify-between gap-[var(--bb-space-4)] px-[var(--bb-space-5)] pt-[var(--bb-space-4)] pb-[var(--bb-space-3)]">
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
          {headerActions && (
            <div className="flex items-center gap-[var(--bb-space-2)]">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div
        className={cn(
          'flex-1',
          !noPadding && 'px-[var(--bb-space-4)] pb-[var(--bb-space-4)]',
          !title && !headerActions && !noPadding && 'pt-[var(--bb-space-4)]'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ChartCard;

