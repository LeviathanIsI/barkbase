/**
 * Professional Alert Component
 * Informational callouts with semantic variants using token-based styling
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantConfig = {
  neutral: {
    container: 'bg-[var(--bb-color-alert-neutral-bg)] border-[var(--bb-color-alert-neutral-border)] text-[var(--bb-color-alert-neutral-text)]',
    icon: 'text-[var(--bb-color-text-muted)]',
    Icon: Info,
  },
  default: {
    container: 'bg-[var(--bb-color-alert-neutral-bg)] border-[var(--bb-color-alert-neutral-border)] text-[var(--bb-color-alert-neutral-text)]',
    icon: 'text-[var(--bb-color-text-muted)]',
    Icon: Info,
  },
  info: {
    container: 'bg-[var(--bb-color-alert-info-bg)] border-[var(--bb-color-alert-info-border)] text-[var(--bb-color-alert-info-text)]',
    icon: 'text-[var(--bb-color-status-info)]',
    Icon: Info,
  },
  success: {
    container: 'bg-[var(--bb-color-alert-success-bg)] border-[var(--bb-color-alert-success-border)] text-[var(--bb-color-alert-success-text)]',
    icon: 'text-[var(--bb-color-status-positive)]',
    Icon: CheckCircle,
  },
  warning: {
    container: 'bg-[var(--bb-color-alert-warning-bg)] border-[var(--bb-color-alert-warning-border)] text-[var(--bb-color-alert-warning-text)]',
    icon: 'text-[var(--bb-color-status-warning)]',
    Icon: AlertTriangle,
  },
  danger: {
    container: 'bg-[var(--bb-color-alert-danger-bg)] border-[var(--bb-color-alert-danger-border)] text-[var(--bb-color-alert-danger-text)]',
    icon: 'text-[var(--bb-color-status-negative)]',
    Icon: AlertCircle,
  },
  error: {
    container: 'bg-[var(--bb-color-alert-danger-bg)] border-[var(--bb-color-alert-danger-border)] text-[var(--bb-color-alert-danger-text)]',
    icon: 'text-[var(--bb-color-status-negative)]',
    Icon: AlertCircle,
  },
  destructive: {
    container: 'bg-[var(--bb-color-alert-danger-bg)] border-[var(--bb-color-alert-danger-border)] text-[var(--bb-color-alert-danger-text)]',
    icon: 'text-[var(--bb-color-status-negative)]',
    Icon: AlertCircle,
  },
};

const Alert = React.forwardRef(
  ({ className, variant = 'neutral', title, icon, children, onClose, ...props }, ref) => {
    const config = variantConfig[variant] || variantConfig.neutral;
    const IconComponent = icon || config.Icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border',
          'px-[var(--bb-space-4)] py-[var(--bb-space-3)]',
          'flex gap-[var(--bb-space-3)] items-start',
          config.container,
          className
        )}
        {...props}
      >
        <IconComponent className={cn('h-5 w-5 flex-shrink-0 mt-[2px]', config.icon)} />
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] leading-tight mb-[var(--bb-space-1)]">
              {title}
            </h5>
          )}
          <div className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] [&_p]:leading-relaxed">
            {children}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-shrink-0 rounded-md p-1',
              'opacity-70 hover:opacity-100 transition-opacity',
              'hover:bg-[var(--bb-color-bg-elevated)]'
            )}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] leading-tight',
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] [&_p]:leading-relaxed',
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
export default Alert;
