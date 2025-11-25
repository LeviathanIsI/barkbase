/**
 * FormField Component - Phase 9 Enterprise Form System
 * Unified wrapper for form fields with label, help text, and error states.
 * Token-based styling for consistent theming.
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * FormField - Wrapper for form inputs with consistent layout
 * 
 * @example
 * <FormField label="Email" required error="Email is required" helpText="We'll never share your email">
 *   <Input type="email" />
 * </FormField>
 */
const FormField = React.forwardRef(({
  className,
  label,
  required,
  error,
  helpText,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-[var(--bb-space-2,0.5rem)]', className)}
      {...props}
    >
      {label && (
        <label
          className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1">*</span>
          )}
        </label>
      )}
      {children}
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
});

FormField.displayName = 'FormField';

/**
 * FormSection - Groups related form fields together
 * 
 * @example
 * <FormSection title="Contact Information" description="How can we reach you?">
 *   <FormField label="Email"><Input /></FormField>
 *   <FormField label="Phone"><Input /></FormField>
 * </FormSection>
 */
const FormSection = React.forwardRef(({
  className,
  title,
  description,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-[var(--bb-space-4,1rem)]', className)}
      {...props}
    >
      {(title || description) && (
        <div className="space-y-[var(--bb-space-1,0.25rem)]">
          {title && (
            <h3
              className="text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-semibold,600)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-[var(--bb-space-4,1rem)]">
        {children}
      </div>
    </div>
  );
});

FormSection.displayName = 'FormSection';

/**
 * FormActions - Container for form action buttons
 * 
 * @example
 * <FormActions>
 *   <Button variant="ghost">Cancel</Button>
 *   <Button variant="primary">Save</Button>
 * </FormActions>
 */
const FormActions = React.forwardRef(({
  className,
  children,
  align = 'end',
  ...props
}, ref) => {
  const alignmentClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[align] || 'justify-end';

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-[var(--bb-space-3,0.75rem)] pt-[var(--bb-space-4,1rem)] border-t',
        alignmentClass,
        className
      )}
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      {...props}
    >
      {children}
    </div>
  );
});

FormActions.displayName = 'FormActions';

/**
 * FormGrid - Responsive grid layout for form fields
 * 
 * @example
 * <FormGrid cols={2}>
 *   <FormField label="First Name"><Input /></FormField>
 *   <FormField label="Last Name"><Input /></FormField>
 * </FormGrid>
 */
const FormGrid = React.forwardRef(({
  className,
  cols = 2,
  children,
  ...props
}, ref) => {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols] || 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      ref={ref}
      className={cn('grid gap-[var(--bb-space-4,1rem)]', colsClass, className)}
      {...props}
    >
      {children}
    </div>
  );
});

FormGrid.displayName = 'FormGrid';

export { FormField, FormSection, FormActions, FormGrid };
export default FormField;

