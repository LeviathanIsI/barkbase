/**
 * Badge Component System
 * Consistent, semantic status and category indicators
 *
 * Features:
 * - Semantic color variants with clear meaning
 * - Consistent sizing with proper padding
 * - Dot indicator for status badges
 * - Outlined style for type/category badges
 * - Interactive states for clickable badges
 * - Pulse animation for urgent states
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Base badge styles using CVA
 */
const badgeVariants = cva(
  // Base styles - consistent across all variants
  [
    'inline-flex items-center justify-center',
    'rounded-full',
    'font-medium',
    'leading-none',
    'whitespace-nowrap',
    'transition-all duration-150',
    'select-none',
  ],
  {
    variants: {
      // Semantic color variants
      variant: {
        // Success - Active, Paid, Current, Complete
        success: [
          'bg-emerald-100 dark:bg-emerald-900/50',
          'text-emerald-700 dark:text-emerald-300',
          'border border-emerald-200 dark:border-emerald-700/50',
        ],

        // Warning - Expiring, Pending, Draft
        warning: [
          'bg-amber-100 dark:bg-amber-900/50',
          'text-amber-700 dark:text-amber-300',
          'border border-amber-200 dark:border-amber-700/50',
        ],

        // Danger - Overdue, Expired, Critical, Error
        danger: [
          'bg-red-100 dark:bg-red-900/50',
          'text-red-700 dark:text-red-300',
          'border border-red-200 dark:border-red-700/50',
        ],

        // Info - Informational, type badges
        info: [
          'bg-blue-100 dark:bg-blue-900/50',
          'text-blue-700 dark:text-blue-300',
          'border border-blue-200 dark:border-blue-700/50',
        ],

        // Neutral - Inactive, Static, N/A
        neutral: [
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-600 dark:text-slate-300',
          'border border-slate-200 dark:border-slate-700',
        ],

        // Purple - Special states, premium
        purple: [
          'bg-violet-100 dark:bg-violet-900/50',
          'text-violet-700 dark:text-violet-300',
          'border border-violet-200 dark:border-violet-700/50',
        ],

        // Accent - Brand accent color
        accent: [
          'bg-amber-100 dark:bg-amber-900/50',
          'text-amber-700 dark:text-amber-400',
          'border border-amber-200 dark:border-amber-700/50',
        ],

        // Outlined variants - for type/category badges (more muted)
        'outline-neutral': [
          'bg-transparent',
          'text-slate-600 dark:text-slate-400',
          'border border-slate-300 dark:border-slate-600',
        ],

        'outline-info': [
          'bg-transparent',
          'text-blue-600 dark:text-blue-400',
          'border border-blue-300 dark:border-blue-600',
        ],

        'outline-success': [
          'bg-transparent',
          'text-emerald-600 dark:text-emerald-400',
          'border border-emerald-300 dark:border-emerald-600',
        ],

        'outline-warning': [
          'bg-transparent',
          'text-amber-600 dark:text-amber-400',
          'border border-amber-300 dark:border-amber-600',
        ],

        'outline-danger': [
          'bg-transparent',
          'text-red-600 dark:text-red-400',
          'border border-red-300 dark:border-red-600',
        ],

        'outline-purple': [
          'bg-transparent',
          'text-violet-600 dark:text-violet-400',
          'border border-violet-300 dark:border-violet-600',
        ],

        // Solid variants - high emphasis
        'solid-success': [
          'bg-emerald-500 dark:bg-emerald-600',
          'text-white',
          'border border-emerald-500 dark:border-emerald-600',
          'shadow-sm shadow-emerald-500/20',
        ],

        'solid-warning': [
          'bg-amber-500 dark:bg-amber-600',
          'text-white',
          'border border-amber-500 dark:border-amber-600',
          'shadow-sm shadow-amber-500/20',
        ],

        'solid-danger': [
          'bg-red-500 dark:bg-red-600',
          'text-white',
          'border border-red-500 dark:border-red-600',
          'shadow-sm shadow-red-500/20',
        ],

        'solid-info': [
          'bg-blue-500 dark:bg-blue-600',
          'text-white',
          'border border-blue-500 dark:border-blue-600',
          'shadow-sm shadow-blue-500/20',
        ],

        // Backward compatibility aliases
        default: [
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-600 dark:text-slate-300',
          'border border-slate-200 dark:border-slate-700',
        ],
        error: [
          'bg-red-100 dark:bg-red-900/50',
          'text-red-700 dark:text-red-300',
          'border border-red-200 dark:border-red-700/50',
        ],
        primary: [
          'bg-amber-100 dark:bg-amber-900/50',
          'text-amber-700 dark:text-amber-400',
          'border border-amber-200 dark:border-amber-700/50',
        ],
        secondary: [
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-700 dark:text-slate-300',
          'border border-slate-200 dark:border-slate-700',
        ],
        outline: [
          'bg-transparent',
          'text-slate-600 dark:text-slate-400',
          'border border-slate-300 dark:border-slate-600',
        ],
        ghost: [
          'bg-transparent',
          'text-slate-500 dark:text-slate-400',
          'border border-transparent',
        ],
      },

      // Size variants with better padding
      size: {
        xs: [
          'text-[10px]',
          'px-1.5 py-0.5',
          'gap-1',
          'min-w-[1.25rem]',
        ],
        sm: [
          'text-[11px]',
          'px-2 py-0.5',
          'gap-1',
          'min-w-[1.5rem]',
        ],
        default: [
          'text-xs',
          'px-2.5 py-1',
          'gap-1.5',
          'min-w-[2rem]',
        ],
        lg: [
          'text-sm',
          'px-3 py-1.5',
          'gap-1.5',
          'min-w-[2.5rem]',
        ],
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);

/**
 * Dot colors matching semantic variants
 */
const dotColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400 dark:bg-slate-500',
  purple: 'bg-violet-500',
  accent: 'bg-amber-500',
  default: 'bg-slate-400 dark:bg-slate-500',
  error: 'bg-red-500',
  primary: 'bg-amber-500',
  secondary: 'bg-slate-400 dark:bg-slate-500',
  outline: 'bg-slate-400 dark:bg-slate-500',
  ghost: 'bg-slate-400 dark:bg-slate-500',
  'outline-neutral': 'bg-slate-400 dark:bg-slate-500',
  'outline-info': 'bg-blue-500',
  'outline-success': 'bg-emerald-500',
  'outline-warning': 'bg-amber-500',
  'outline-danger': 'bg-red-500',
  'outline-purple': 'bg-violet-500',
  'solid-success': 'bg-white',
  'solid-warning': 'bg-white',
  'solid-danger': 'bg-white',
  'solid-info': 'bg-white',
};

/**
 * Badge Component
 */
const Badge = React.forwardRef(({
  className,
  variant = 'neutral',
  size = 'default',
  icon: Icon,
  iconPosition = 'left',
  dot = false,
  pulse = false,
  interactive = false,
  onClick,
  children,
  ...props
}, ref) => {
  const isClickable = interactive || !!onClick;

  // Dot size based on badge size
  const dotSize = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5',
    default: 'h-1.5 w-1.5',
    lg: 'h-2 w-2',
  };

  // Icon size based on badge size
  const iconSize = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    default: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  const dotColor = dotColors[variant] || dotColors.neutral;

  return (
    <span
      ref={ref}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.(e) : undefined}
      className={cn(
        badgeVariants({ variant, size }),
        isClickable && [
          'cursor-pointer',
          'hover:opacity-80',
          'active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--bb-color-accent)]',
        ],
        className
      )}
      {...props}
    >
      {/* Dot indicator (shown before content) */}
      {dot && (
        <span className="relative flex shrink-0">
          {pulse && (
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                dotColor
              )}
            />
          )}
          <span
            className={cn(
              'relative rounded-full',
              dotSize[size],
              dotColor
            )}
          />
        </span>
      )}

      {/* Left icon */}
      {Icon && iconPosition === 'left' && !dot && (
        <Icon className={cn('shrink-0', iconSize[size])} />
      )}

      {/* Label */}
      {children}

      {/* Right icon */}
      {Icon && iconPosition === 'right' && !dot && (
        <Icon className={cn('shrink-0', iconSize[size])} />
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

/**
 * StatusBadge - Specialized badge for status indicators
 * Always shows a dot, never shows dropdown arrows
 */
export const StatusBadge = React.forwardRef(({
  status,
  label,
  pulse = false,
  size = 'default',
  className,
  onClick,
  ...props
}, ref) => {
  // Map common status values to variants
  const statusVariantMap = {
    // Success states
    active: 'success',
    paid: 'success',
    current: 'success',
    complete: 'success',
    completed: 'success',
    approved: 'success',
    confirmed: 'success',
    'checked-in': 'success',

    // Warning states
    pending: 'warning',
    expiring: 'warning',
    draft: 'warning',
    processing: 'warning',
    scheduled: 'warning',

    // Danger states
    overdue: 'danger',
    expired: 'danger',
    critical: 'danger',
    error: 'danger',
    failed: 'danger',
    cancelled: 'danger',
    rejected: 'danger',

    // Neutral states
    inactive: 'neutral',
    static: 'neutral',
    archived: 'neutral',
    disabled: 'neutral',
    unknown: 'neutral',

    // Info states
    info: 'info',
    new: 'info',

    // Purple states
    'no-show': 'purple',
  };

  const variant = statusVariantMap[status?.toLowerCase()] || 'neutral';
  const displayLabel = label || status;

  return (
    <Badge
      ref={ref}
      variant={variant}
      size={size}
      dot
      pulse={pulse}
      onClick={onClick}
      interactive={!!onClick}
      className={className}
      {...props}
    >
      {displayLabel}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

/**
 * TypeBadge - Specialized badge for type/category labels
 * Uses outlined style for visual distinction from status badges
 */
export const TypeBadge = React.forwardRef(({
  type,
  variant = 'info',
  size = 'sm',
  className,
  onClick,
  ...props
}, ref) => {
  // Use outline variant for type badges
  const outlineVariant = `outline-${variant}`;

  return (
    <Badge
      ref={ref}
      variant={outlineVariant}
      size={size}
      onClick={onClick}
      interactive={!!onClick}
      className={className}
      {...props}
    >
      {type}
    </Badge>
  );
});

TypeBadge.displayName = 'TypeBadge';

/**
 * CountBadge - Numeric count indicator
 */
export const CountBadge = React.forwardRef(({
  count,
  max = 99,
  variant = 'neutral',
  size = 'xs',
  className,
  ...props
}, ref) => {
  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      ref={ref}
      variant={variant}
      size={size}
      className={cn('min-w-[1.25rem] px-1', className)}
      {...props}
    >
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';

// Export variants for external use
export { badgeVariants };
export default Badge;
