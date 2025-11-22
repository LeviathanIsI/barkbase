/**
 * Professional Badge Component
 * Status indicators and labels with semantic variants
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary border border-gray-200 dark:border-surface-border',
        primary: 'bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900/50',
        secondary: 'bg-secondary-100 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-900/50',
        success: 'bg-success-100 dark:bg-success-100 text-success-700 dark:text-success-600 border border-success-100 dark:border-success-700',
        warning: 'bg-warning-100 dark:bg-warning-100 text-warning-700 dark:text-warning-600 border border-warning-100 dark:border-warning-700',
        error: 'bg-error-100 dark:bg-error-100 text-error-700 dark:text-error-600 border border-error-100 dark:border-error-700',
        danger: 'bg-error-100 dark:bg-error-100 text-error-700 dark:text-error-600 border border-error-100 dark:border-error-700', // Alias for error
        info: 'bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-900/50', // Use primary tokens for info
        neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
        outline: 'bg-transparent text-gray-700 dark:text-text-primary border border-gray-300 dark:border-surface-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Badge = ({ className, variant, children, ...props }) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
};

export default Badge;
