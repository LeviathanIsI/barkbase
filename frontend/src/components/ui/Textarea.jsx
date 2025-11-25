/**
 * Textarea Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(
  ({ className, label, error, helpText, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full space-y-[var(--bb-space-2,0.5rem)]">
        {label && (
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {label}
            {props.required && (
              <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1">*</span>
            )}
          </label>
        )}
        <textarea
          rows={rows}
          className={cn(
            'flex w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
            'text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-regular,400)]',
            'min-h-[6rem] resize-y',
            'transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus:outline-none',
            className
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: error ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
            color: 'var(--bb-color-text-primary)',
          }}
          ref={ref}
          {...props}
        />
        {error && (
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-status-negative)' }}
          >
            {error}
          </p>
        )}
        {helpText && !error && (
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
