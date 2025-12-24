/**
 * Checkbox Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef(
  ({ className, label, description, checked, onChange, onCheckedChange, ...props }, ref) => {
    const handleChange = (e) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="flex items-start gap-[var(--bb-space-3,0.75rem)]">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={handleChange}
            className={cn(
              'h-4 w-4 rounded cursor-pointer',
              'transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              className
            )}
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: checked ? 'var(--bb-color-accent)' : 'var(--bb-color-bg-surface)',
              accentColor: 'var(--bb-color-accent)',
            }}
            {...props}
          />
        </div>
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

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;
