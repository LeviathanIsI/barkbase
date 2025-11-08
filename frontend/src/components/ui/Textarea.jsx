/**
 * Professional Textarea Component
 * Multi-line text input with consistent styling
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(
  ({ className, label, error, helpText, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          rows={rows}
          className={cn(
            'flex w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2',
            'text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-tertiary placeholder:opacity-75',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-surface-secondary',
            'transition-colors resize-y',
            error && 'border-error-500 focus:ring-error-500',
            className
          )}
          ref={ref}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

export default Textarea;
