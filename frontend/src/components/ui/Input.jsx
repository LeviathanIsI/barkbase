/**
 * Input Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(
  ({ className, type = 'text', label, error, helpText, leftText, rightText, ...props }, ref) => {
    const hasAddons = leftText || rightText;

    const inputElement = (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
          'text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-regular,400)]',
          'transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasAddons && 'border-0 focus:ring-0 focus:outline-none bg-transparent',
          leftText && 'pl-0',
          rightText && 'pr-0',
          className
        )}
        style={hasAddons ? {
          color: 'var(--bb-color-text-primary)',
        } : {
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: error ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
          color: 'var(--bb-color-text-primary)',
        }}
        ref={ref}
        {...props}
      />
    );

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
        {hasAddons ? (
          <div
            className="flex items-center h-11 w-full rounded-md border px-[var(--bb-space-3,0.75rem)]"
            style={{
              backgroundColor: 'var(--bb-color-bg-surface)',
              borderColor: error ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
            }}
          >
            {leftText && (
              <span
                className="text-[var(--bb-font-size-base,1rem)] mr-1 select-none"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                {leftText}
              </span>
            )}
            {inputElement}
            {rightText && (
              <span
                className="text-[var(--bb-font-size-base,1rem)] ml-1 select-none"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                {rightText}
              </span>
            )}
          </div>
        ) : (
          inputElement
        )}
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

Input.displayName = 'Input';

export default Input;
