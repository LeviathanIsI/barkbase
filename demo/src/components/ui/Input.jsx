/**
 * Input Component - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 * Enhanced with accessibility features (WCAG 2.1 AA compliant).
 */

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(
  ({
    className,
    type = 'text',
    label,
    error,
    helpText,
    leftText,
    rightText,
    id: providedId,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const errorId = `${inputId}-error`;
    const helpTextId = `${inputId}-help`;
    const hasAddons = leftText || rightText;

    // Build aria-describedby from error and help text
    const describedByIds = [
      error && errorId,
      helpText && !error && helpTextId,
      ariaDescribedBy,
    ].filter(Boolean).join(' ') || undefined;

    const inputElement = (
      <input
        id={inputId}
        type={type}
        aria-label={!label && !ariaLabelledBy ? ariaLabel : undefined}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={describedByIds}
        aria-invalid={error ? 'true' : undefined}
        aria-required={props.required || undefined}
        className={cn(
          'flex h-11 w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
          'text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-regular,400)]',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)] focus:ring-offset-1',
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
            htmlFor={inputId}
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {label}
            {props.required && (
              <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1" aria-hidden="true">*</span>
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
                aria-hidden="true"
              >
                {leftText}
              </span>
            )}
            {inputElement}
            {rightText && (
              <span
                className="text-[var(--bb-font-size-base,1rem)] ml-1 select-none"
                style={{ color: 'var(--bb-color-text-muted)' }}
                aria-hidden="true"
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
            id={errorId}
            role="alert"
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-status-negative)' }}
          >
            {error}
          </p>
        )}
        {helpText && !error && (
          <p
            id={helpTextId}
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
