/**
 * Professional Alert Component
 * Informational callouts with semantic variants
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: {
    container: 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border text-gray-800 dark:text-text-primary',
    icon: 'text-gray-600 dark:text-text-secondary',
    Icon: Info,
  },
  info: {
    container: 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-900/50 text-primary-800 dark:text-primary-200',
    icon: 'text-primary-600 dark:text-primary-400',
    Icon: Info,
  },
  success: {
    container: 'bg-secondary-50 dark:bg-secondary-950/30 border-secondary-200 dark:border-secondary-900/50 text-secondary-800 dark:text-secondary-200',
    icon: 'text-secondary-600 dark:text-secondary-400',
    Icon: CheckCircle,
  },
  warning: {
    container: 'bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-900/50 text-warning-800 dark:text-warning-200',
    icon: 'text-warning-600 dark:text-warning-400',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-error-50 dark:bg-error-950/30 border-error-200 dark:border-error-900/50 text-error-800 dark:text-error-200',
    icon: 'text-error-600 dark:text-error-400',
    Icon: AlertCircle,
  },
  destructive: {
    container: 'bg-error-50 dark:bg-error-950/30 border-error-200 dark:border-error-900/50 text-error-800 dark:text-error-200',
    icon: 'text-error-600 dark:text-error-400',
    Icon: AlertCircle,
  },
};

const Alert = React.forwardRef(
  ({ className, variant = 'default', title, children, onClose, ...props }, ref) => {
    const styles = variantStyles[variant];
    const IconComponent = styles.Icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          styles.container,
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <IconComponent className={cn('h-5 w-5 flex-shrink-0', styles.icon)} />
          <div className="flex-1">
            {title && (
              <h5 className="mb-1 font-medium text-sm leading-none tracking-tight">
                {title}
              </h5>
            )}
            <div className="text-sm [&_p]:leading-relaxed">{children}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (  <h5    ref={ref}    className={cn("mb-1 font-medium text-sm leading-none tracking-tight", className)}    {...props}  />));AlertTitle.displayName = "AlertTitle";const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (  <div    ref={ref}    className={cn("text-sm [&_p]:leading-relaxed", className)}    {...props}  />));AlertDescription.displayName = "AlertDescription";export { Alert, AlertTitle, AlertDescription };export default Alert;
