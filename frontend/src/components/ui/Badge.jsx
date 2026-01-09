/**
 * Enterprise Badge Component
 * Premium status indicators with semantic variants
 * Features: dot indicators, vibrant colors, multiple sizes
 */

/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Base styles - consistent across all variants
  [
    'inline-flex items-center justify-center',
    'gap-[var(--bb-space-1\\.5,0.375rem)]',
    'rounded-full',
    'font-[var(--bb-font-weight-medium)]',
    'leading-none',
    'border',
    'transition-all duration-150',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        // Neutral - Default, low emphasis
        neutral: [
          'bg-slate-100 dark:bg-slate-800',
          'border-slate-200 dark:border-slate-700',
          'text-slate-600 dark:text-slate-300',
        ],

        // Default - Alias for neutral
        default: [
          'bg-slate-100 dark:bg-slate-800',
          'border-slate-200 dark:border-slate-700',
          'text-slate-600 dark:text-slate-300',
        ],

        // Info - Blue, informational (vibrant)
        info: [
          'bg-blue-100 dark:bg-blue-900/40',
          'border-blue-200 dark:border-blue-700/50',
          'text-blue-700 dark:text-blue-300',
        ],

        // Success - Green, positive status (vibrant)
        success: [
          'bg-emerald-100 dark:bg-emerald-900/40',
          'border-emerald-200 dark:border-emerald-700/50',
          'text-emerald-700 dark:text-emerald-300',
        ],

        // Warning - Amber, caution (vibrant)
        warning: [
          'bg-amber-100 dark:bg-amber-900/40',
          'border-amber-200 dark:border-amber-700/50',
          'text-amber-700 dark:text-amber-300',
        ],

        // Danger - Red, negative/error status (vibrant)
        danger: [
          'bg-red-100 dark:bg-red-900/40',
          'border-red-200 dark:border-red-700/50',
          'text-red-700 dark:text-red-300',
        ],

        // Error - Alias for danger
        error: [
          'bg-red-100 dark:bg-red-900/40',
          'border-red-200 dark:border-red-700/50',
          'text-red-700 dark:text-red-300',
        ],

        // Outline - Transparent background with border
        outline: [
          'bg-transparent',
          'border-[var(--bb-color-border-subtle)]',
          'text-[var(--bb-color-text-primary)]',
        ],

        // Ghost - Minimal, very low emphasis
        ghost: [
          'bg-transparent',
          'border-transparent',
          'text-[var(--bb-color-text-muted)]',
        ],

        // Accent - Primary brand color for premium labels (vibrant)
        accent: [
          'bg-amber-100 dark:bg-amber-900/40',
          'border-amber-200 dark:border-amber-700/50',
          'text-amber-700 dark:text-amber-400',
        ],

        // Primary - Alias for accent (backward compatibility)
        primary: [
          'bg-amber-100 dark:bg-amber-900/40',
          'border-amber-200 dark:border-amber-700/50',
          'text-amber-700 dark:text-amber-400',
        ],

        // Secondary - Uses branding secondary color
        secondary: [
          'bg-slate-100 dark:bg-slate-800',
          'border-slate-200 dark:border-slate-700',
          'text-slate-700 dark:text-slate-300',
        ],

        // Purple - For special states like No Show
        purple: [
          'bg-violet-100 dark:bg-violet-900/40',
          'border-violet-200 dark:border-violet-700/50',
          'text-violet-700 dark:text-violet-300',
        ],

        // Solid variants for high emphasis
        'solid-success': [
          'bg-emerald-500 dark:bg-emerald-600',
          'border-emerald-500 dark:border-emerald-600',
          'text-white',
          'shadow-sm shadow-emerald-500/25',
        ],

        'solid-warning': [
          'bg-amber-500 dark:bg-amber-600',
          'border-amber-500 dark:border-amber-600',
          'text-white',
          'shadow-sm shadow-amber-500/25',
        ],

        'solid-danger': [
          'bg-red-500 dark:bg-red-600',
          'border-red-500 dark:border-red-600',
          'text-white',
          'shadow-sm shadow-red-500/25',
        ],

        'solid-info': [
          'bg-blue-500 dark:bg-blue-600',
          'border-blue-500 dark:border-blue-600',
          'text-white',
          'shadow-sm shadow-blue-500/25',
        ],
      },
      size: {
        xs: 'text-[0.625rem] px-[0.375rem] py-[1px] h-4',
        sm: 'text-[0.6875rem] px-[var(--bb-space-2,0.5rem)] py-[2px] h-5',
        default: 'text-[0.75rem] px-[var(--bb-space-2\\.5,0.625rem)] py-[3px] h-6',
        lg: 'text-[0.8125rem] px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-1,0.25rem)] h-7',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);

/**
 * Status dot colors for dot indicator variant
 */
const dotColors = {
  neutral: 'bg-slate-400 dark:bg-slate-500',
  default: 'bg-slate-400 dark:bg-slate-500',
  info: 'bg-blue-500 dark:bg-blue-400',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-red-500 dark:bg-red-400',
  error: 'bg-red-500 dark:bg-red-400',
  accent: 'bg-amber-500 dark:bg-amber-400',
  primary: 'bg-amber-500 dark:bg-amber-400',
  purple: 'bg-violet-500 dark:bg-violet-400',
};

const Badge = React.forwardRef(({
  className,
  variant = 'neutral',
  size = 'default',
  icon: Icon,
  dot = false,
  pulse = false,
  children,
  ...props
}, ref) => {
  // Determine dot size based on badge size
  const dotSizeClass = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2 w-2',
  };

  const dotColor = dotColors[variant] || dotColors.neutral;

  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span className="relative flex">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                dotColor
              )}
            />
          )}
          <span
            className={cn(
              'relative inline-flex rounded-full',
              dotSizeClass[size],
              dotColor
            )}
          />
        </span>
      )}

      {/* Icon */}
      {Icon && !dot && (
        <Icon className={cn(
          'flex-shrink-0',
          size === 'xs' ? 'h-2.5 w-2.5' :
          size === 'sm' ? 'h-3 w-3' :
          size === 'lg' ? 'h-4 w-4' :
          'h-3.5 w-3.5'
        )} />
      )}

      {/* Label */}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

// Export variants for external use
export { badgeVariants };
export default Badge;
