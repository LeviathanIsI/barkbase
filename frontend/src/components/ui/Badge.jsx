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
        success: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/50',
        warning: 'bg-warning-100 dark:bg-warning-950/30 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-900/50',
        error: 'bg-error-100 dark:bg-error-950/30 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-900/50',
        danger: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50',
        info: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50',
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
