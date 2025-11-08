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
        success: 'bg-secondary-100 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-900/50',
        warning: 'bg-warning-100 dark:bg-warning-950/30 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-900/50',
        error: 'bg-error-100 dark:bg-error-950/30 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-900/50',
        info: 'bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-900/50',
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
