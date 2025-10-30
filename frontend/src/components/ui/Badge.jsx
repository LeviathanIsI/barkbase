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
        default: 'bg-gray-100 text-gray-700 border border-gray-200',
        primary: 'bg-primary-100 text-primary-700 border border-primary-200',
        secondary: 'bg-secondary-100 text-secondary-700 border border-secondary-200',
        success: 'bg-secondary-100 text-secondary-700 border border-secondary-200',
        warning: 'bg-warning-100 text-warning-700 border border-warning-200',
        error: 'bg-error-100 text-error-700 border border-error-200',
        info: 'bg-primary-100 text-primary-700 border border-primary-200',
        outline: 'bg-transparent text-gray-700 border border-gray-300',
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
