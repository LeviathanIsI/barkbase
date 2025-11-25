import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty state component for tables and panels
 * Uses enterprise design tokens for consistent theming.
 *
 * @example
 * <EmptyState
 *   icon={Dog}
 *   title="No Pets Found"
 *   description="Get started by adding your first pet."
 *   action={<Button>Add Pet</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center px-[var(--bb-space-6,1.5rem)] py-[var(--bb-space-12,3rem)] text-center",
      className
    )}>
      {Icon && (
        <div className="mb-[var(--bb-space-4,1rem)]">
          <Icon
            className="w-12 h-12 mx-auto"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
        </div>
      )}

      {title && (
        <h3
          className="text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-2,0.5rem)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {title}
        </h3>
      )}

      {description && (
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)] max-w-sm mb-[var(--bb-space-6,1.5rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {description}
        </p>
      )}

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

export default EmptyState;
