import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Empty state component for right panel when nothing is selected
 *
 * @example
 * <EmptyState
 *   icon={Dog}
 *   title="No Pet Selected"
 *   description="Select a pet from the list to view details"
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
      "flex flex-col items-center justify-center h-full px-6 py-12 text-center",
      className
    )}>
      {Icon && (
        <div className="mb-4 text-[var(--text-tertiary)]">
          <Icon className="w-12 h-12" />
        </div>
      )}

      {title && (
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
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
