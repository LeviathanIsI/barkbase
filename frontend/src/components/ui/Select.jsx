/**
 * Select Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = React.forwardRef(
  ({ className, label, error, helpText, children, ...props }, ref) => {
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
        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] pr-[var(--bb-space-8,2rem)]',
              'text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-regular,400)]',
              'appearance-none transition-colors',
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
          >
            {children}
          </select>
          <ChevronDown
            className="absolute right-[var(--bb-space-3,0.75rem)] top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
        </div>
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

Select.displayName = 'Select';

// Create placeholder components for compatibility
const SelectTrigger = Select;
const SelectValue = ({ children, ...props }) => children;
const SelectContent = ({ children }) => children;
const SelectItem = ({ children, value, ...props }) => (
  <option value={value} {...props}>{children}</option>
);

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
export default Select;
