/**
 * Switch/Toggle Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef(
  ({ className, checked, onCheckedChange, disabled, label, description, ...props }, ref) => {
    return (
      <div className="flex items-start gap-[var(--bb-space-3,0.75rem)]">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
            'border-2 border-transparent transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Clear color distinction: amber/orange ON, gray OFF
            checked
              ? 'bg-primary-600'
              : 'bg-gray-300 dark:bg-gray-600',
            className
          )}
          {...props}
          ref={ref}
        >
          <span
            className={cn(
              'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg',
              'ring-0 transition-transform duration-200',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] cursor-pointer"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className="text-[var(--bb-font-size-sm,0.875rem)] mt-0.5"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
export default Switch;
