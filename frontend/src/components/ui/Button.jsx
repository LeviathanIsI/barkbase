/**
 * Professional Button Component
 * Based on Linear/Calendly patterns with systematic variants
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - Professional foundation
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Brand color, high emphasis
        primary: 'bg-primary-600 dark:bg-primary-700 text-white hover:bg-primary-700 dark:hover:bg-primary-600 active:bg-primary-800 dark:active:bg-primary-500',

        // Secondary - Outlined, medium emphasis
        secondary: 'border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary active:bg-gray-100 dark:active:bg-surface-elevated',

        // Tertiary - Text only, low emphasis
        tertiary: 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 active:bg-primary-100 dark:active:bg-primary-950/50',

        // Destructive - For delete/remove actions
        destructive: 'bg-error-600 dark:bg-error-700 text-white hover:bg-error-700 dark:hover:bg-error-600 active:bg-error-800 dark:active:bg-error-500',

        // Ghost - Minimal, subtle
        ghost: 'hover:bg-gray-100 dark:hover:bg-surface-secondary active:bg-gray-200 dark:active:bg-surface-elevated text-gray-700 dark:text-text-primary',

        // Ghost Dark - For use on dark backgrounds
        'ghost-dark': 'hover:bg-white/10 dark:hover:bg-surface-primary/20 active:bg-white/20 dark:active:bg-surface-primary/30 text-white',

        // Success - For positive actions
        success: 'bg-secondary-600 dark:bg-secondary-700 text-white hover:bg-secondary-700 dark:hover:bg-secondary-600 active:bg-secondary-800 dark:active:bg-secondary-500',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  children, 
  ...props 
}, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
