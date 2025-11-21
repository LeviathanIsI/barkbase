/**
 * Professional Input Component
 * Clean, accessible form inputs with proper states
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(
  ({ className, type = 'text', label, error, helpText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-lg border border-gray-300 dark:border-[var(--input-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-3',
            'text-base font-normal text-gray-900 dark:text-[var(--text-primary)] placeholder:text-gray-500 dark:placeholder:text-[var(--text-tertiary)]',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-surface-secondary',
            'transition-colors',
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

Input.displayName = 'Input';

export default Input;
