/**
 * EmptyState - Primary empty state component
 * Used for full-page or section-level empty states
 * Uses enterprise design tokens for consistent theming.
 */

import { cn } from '@/lib/cn';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actions,
  compact = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-surface)]',
        compact
          ? 'flex items-start gap-[var(--bb-space-4)] px-[var(--bb-space-4)] py-[var(--bb-space-6)]'
          : 'flex flex-col items-center justify-center px-[var(--bb-space-6)] py-[var(--bb-space-12)] text-center',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-[var(--bb-radius-lg)]',
            compact
              ? 'h-10 w-10 flex-shrink-0 bg-[var(--bb-color-bg-elevated)]'
              : 'h-16 w-16 mb-[var(--bb-space-4)] bg-[var(--bb-color-bg-elevated)]'
          )}
        >
          <Icon
            className={cn(
              'text-[var(--bb-color-text-muted)]',
              compact ? 'h-5 w-5' : 'h-8 w-8'
            )}
          />
        </div>
      )}

      <div className={cn(compact ? 'flex-1 min-w-0' : '')}>
        {title && (
          <h3
            className={cn(
              'font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]',
              compact
                ? 'text-[var(--bb-font-size-sm)]'
                : 'text-[var(--bb-font-size-lg)] mb-[var(--bb-space-2)]'
            )}
          >
            {title}
          </h3>
        )}

        {description && (
          <p
            className={cn(
              'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]',
              compact
                ? 'mt-[var(--bb-space-1)]'
                : 'max-w-md mb-[var(--bb-space-6)]'
            )}
          >
            {description}
          </p>
        )}

        {actions && (
          <div
            className={cn(
              'flex gap-[var(--bb-space-3)]',
              compact
                ? 'mt-[var(--bb-space-3)]'
                : 'justify-center'
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;

