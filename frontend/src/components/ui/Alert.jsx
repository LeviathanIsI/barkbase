/**
 * Professional Alert Component
 * Informational callouts with semantic variants
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: {
    container: 'bg-gray-50 border-gray-200 text-gray-800',
    icon: 'text-gray-600',
    Icon: Info,
  },
  info: {
    container: 'bg-primary-50 border-primary-200 text-primary-800',
    icon: 'text-primary-600',
    Icon: Info,
  },
  success: {
    container: 'bg-secondary-50 border-secondary-200 text-secondary-800',
    icon: 'text-secondary-600',
    Icon: CheckCircle,
  },
  warning: {
    container: 'bg-warning-50 border-warning-200 text-warning-800',
    icon: 'text-warning-600',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-error-50 border-error-200 text-error-800',
    icon: 'text-error-600',
    Icon: AlertCircle,
  },
  destructive: {
    container: 'bg-error-50 border-error-200 text-error-800',
    icon: 'text-error-600',
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

export default Alert;
