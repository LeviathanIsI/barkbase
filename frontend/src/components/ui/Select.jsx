/**
 * Professional Select Component
 * Native select with consistent styling
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = React.forwardRef(
  ({ className, label, error, helpText, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 pr-8',
              'text-sm text-gray-900 dark:text-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-surface-secondary',
              'appearance-none transition-colors',
              error && 'border-error-500 focus:ring-error-500',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-text-tertiary pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error-600">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-text-secondary">{helpText}</p>
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
