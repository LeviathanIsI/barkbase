/**
 * HeaderStat - Premium page header statistic badges
 *
 * Features:
 * - Larger, more prominent badges with visual weight
 * - Left-side colored dot indicator matching semantic meaning
 * - Consistent pill/badge shape with background fill
 * - Semantic coloring (neutral, success, warning, danger, info, revenue)
 * - Hierarchy support (prominent mode for key metrics)
 * - Responsive behavior with proper wrapping
 * - Interactive hover states for filterable badges
 * - Pulse animation for urgent/critical stats
 */

import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Semantic variant configurations
 * Each variant includes:
 * - container: Background and border styles
 * - dot: Colored indicator dot
 * - text: Text color for value
 * - label: Muted label color
 */
const variantConfig = {
  // Neutral - for totals and general counts
  neutral: {
    container: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50',
    dot: 'bg-slate-400 dark:bg-slate-500',
    icon: 'text-slate-500 dark:text-slate-400',
    text: 'text-slate-700 dark:text-slate-200',
    label: 'text-slate-500 dark:text-slate-400',
    hover: 'hover:bg-slate-200/80 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600',
  },
  // Success - for active, current, healthy states
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'text-emerald-600/80 dark:text-emerald-400/80',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  // Warning - for expiring, pending states
  warning: {
    container: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    dot: 'bg-amber-500 dark:bg-amber-400',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'text-amber-600/80 dark:text-amber-400/80',
    hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-300 dark:hover:border-amber-700',
  },
  // Danger - for critical, overdue, urgent states
  danger: {
    container: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50',
    dot: 'bg-red-500 dark:bg-red-400',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-700 dark:text-red-300',
    label: 'text-red-600/80 dark:text-red-400/80',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700',
  },
  // Info - for informational counts (dogs, cats, etc.)
  info: {
    container: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50',
    dot: 'bg-blue-500 dark:bg-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'text-blue-600/80 dark:text-blue-400/80',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700',
  },
  // Revenue - for money/value (gold/amber tint)
  revenue: {
    container: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-amber-300 dark:border-amber-700/50',
    dot: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-800 dark:text-amber-200',
    label: 'text-amber-600/80 dark:text-amber-400/80',
    hover: 'hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/40 hover:border-amber-400 dark:hover:border-amber-600',
  },
  // Purple - for high value, premium items
  purple: {
    container: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/50',
    dot: 'bg-violet-500 dark:bg-violet-400',
    icon: 'text-violet-600 dark:text-violet-400',
    text: 'text-violet-700 dark:text-violet-300',
    label: 'text-violet-600/80 dark:text-violet-400/80',
    hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:border-violet-300 dark:hover:border-violet-700',
  },
};

/**
 * HeaderStat - Individual stat badge for page headers
 */
export const HeaderStat = ({
  icon: Icon,
  value,
  label,
  variant = 'neutral',
  prominent = false,
  pulse = false,
  onClick,
  className,
  ...props
}) => {
  const config = variantConfig[variant] || variantConfig.neutral;
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={cn(
        // Base styles
        'inline-flex items-center gap-2 rounded-xl border transition-all duration-200',
        // Size based on prominence
        prominent ? 'px-4 py-2.5' : 'px-3 py-2',
        // Container background/border
        config.container,
        // Hover state for clickable
        isClickable && [
          'cursor-pointer',
          config.hover,
          'active:scale-[0.98]',
        ],
        // Focus state
        isClickable && 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--bb-color-accent)] dark:focus:ring-offset-slate-900',
        className
      )}
      {...props}
    >
      {/* Colored dot indicator */}
      <span
        className={cn(
          'relative flex-shrink-0 rounded-full',
          prominent ? 'h-2.5 w-2.5' : 'h-2 w-2',
          config.dot,
          // Pulse animation for urgent items
          pulse && 'animate-pulse'
        )}
      >
        {/* Pulse ring for danger/warning with pulse prop */}
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              config.dot
            )}
          />
        )}
      </span>

      {/* Icon (optional) */}
      {Icon && (
        <Icon
          className={cn(
            'flex-shrink-0',
            prominent ? 'h-4 w-4' : 'h-3.5 w-3.5',
            config.icon
          )}
        />
      )}

      {/* Value */}
      <span
        className={cn(
          'font-bold tabular-nums',
          prominent ? 'text-base' : 'text-sm',
          config.text
        )}
      >
        {value}
      </span>

      {/* Label */}
      <span
        className={cn(
          'font-medium',
          prominent ? 'text-sm' : 'text-xs',
          config.label
        )}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * HeaderStatGroup - Container for grouping header stats
 * Provides consistent spacing and responsive wrapping
 */
export const HeaderStatGroup = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex flex-wrap items-center gap-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * HeaderStatDivider - Visual separator between stat groups
 */
export const HeaderStatDivider = ({ className }) => (
  <div
    className={cn(
      'hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1',
      className
    )}
  />
);

export default HeaderStat;
