/**
 * SummaryPanel - Premium sidebar panel components
 * Polished, hierarchical panels for summary data display
 *
 * Features:
 * - Clear visual separation with surface tokens
 * - Section headers with icon + text
 * - Label/value pairs with hierarchy
 * - Progress bars and visual indicators
 * - Activity timeline component
 * - Quick actions section
 */

import React from 'react';
import { cn } from '@/lib/cn';
import Button from './Button';

/**
 * SummaryPanel - Main container for sidebar panels
 * Provides consistent styling and spacing
 */
export const SummaryPanel = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'rounded-xl border overflow-hidden',
      'bg-[var(--bb-color-bg-surface)]',
      'border-[var(--bb-color-border-subtle)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * SummaryPanelHeader - Section header with icon
 */
export const SummaryPanelHeader = ({
  icon: Icon,
  title,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex items-center justify-between',
      'px-[var(--bb-space-5,1.25rem)] py-[var(--bb-space-4,1rem)]',
      'border-b',
      'bg-gradient-to-r from-[var(--bb-color-bg-elevated)] to-transparent',
      className
    )}
    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
  >
    <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
      {Icon && (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
        >
          <Icon
            className="h-4 w-4"
            style={{ color: 'var(--bb-color-accent)' }}
          />
        </div>
      )}
      <h3
        className="text-[var(--bb-font-size-sm,0.875rem)] font-semibold"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {title}
      </h3>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

/**
 * SummaryPanelBody - Content area with proper padding
 */
export const SummaryPanelBody = ({
  children,
  className,
  noPadding = false,
}) => (
  <div
    className={cn(
      !noPadding && 'px-[var(--bb-space-5,1.25rem)] py-[var(--bb-space-4,1rem)]',
      className
    )}
  >
    {children}
  </div>
);

/**
 * SummaryStatRow - Label/value pair for statistics
 */
export const SummaryStatRow = ({
  label,
  value,
  subValue,
  variant = 'default',
  icon: Icon,
  prominent = false,
  className,
}) => {
  const variantColors = {
    default: 'var(--bb-color-text-primary)',
    success: 'var(--bb-color-status-positive)',
    warning: 'var(--bb-color-status-warning)',
    danger: 'var(--bb-color-status-negative)',
    muted: 'var(--bb-color-text-muted)',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        prominent && 'pt-[var(--bb-space-3,0.75rem)] border-t',
        className
      )}
      style={prominent ? { borderColor: 'var(--bb-color-border-subtle)' } : undefined}
    >
      <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
        {Icon && (
          <Icon
            className="h-3.5 w-3.5"
            style={{ color: 'var(--bb-color-text-muted)' }}
          />
        )}
        <span
          className={cn(
            'text-[var(--bb-font-size-sm,0.875rem)]',
            prominent && 'font-medium'
          )}
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {label}
        </span>
      </div>
      <div className="text-right">
        <span
          className={cn(
            prominent
              ? 'text-[var(--bb-font-size-lg,1.25rem)] font-bold'
              : 'text-[var(--bb-font-size-sm,0.875rem)] font-semibold'
          )}
          style={{ color: variantColors[variant] }}
        >
          {value}
        </span>
        {subValue && (
          <span
            className="ml-1.5 text-[var(--bb-font-size-xs,0.75rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * SummaryStatStack - Vertical stack of stat rows with spacing
 */
export const SummaryStatStack = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'space-y-[var(--bb-space-3,0.75rem)]',
      className
    )}
  >
    {children}
  </div>
);

/**
 * SummaryProgressBar - Visual progress/bar indicator
 */
export const SummaryProgressBar = ({
  label,
  value,
  maxValue,
  displayValue,
  variant = 'default',
  className,
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  const variantClasses = {
    default: 'bg-[var(--bb-color-accent)]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={cn('space-y-[var(--bb-space-2,0.5rem)]', className)}>
      <div className="flex items-center justify-between">
        <span
          className="text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {label}
        </span>
        <span
          className="text-[var(--bb-font-size-sm,0.875rem)] font-semibold"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {displayValue}
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            variantClasses[variant]
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

/**
 * SummaryDivider - Visual separator between sections
 */
export const SummaryDivider = ({ className }) => (
  <div
    className={cn('border-t my-[var(--bb-space-4,1rem)]', className)}
    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
  />
);

/**
 * SummaryActivityItem - Single activity/timeline item
 */
export const SummaryActivityItem = ({
  icon: Icon,
  iconColor = 'var(--bb-color-text-muted)',
  iconBg = 'var(--bb-color-bg-elevated)',
  title,
  timestamp,
  description,
  className,
}) => (
  <div
    className={cn(
      'flex items-start gap-[var(--bb-space-3,0.75rem)]',
      'p-[var(--bb-space-3,0.75rem)]',
      'rounded-lg transition-colors',
      'hover:bg-[var(--bb-color-bg-elevated)]',
      className
    )}
  >
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: iconBg }}
    >
      <Icon className="h-4 w-4" style={{ color: iconColor }} />
    </div>
    <div className="min-w-0 flex-1">
      <p
        className="text-[var(--bb-font-size-sm,0.875rem)] font-medium truncate"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-[var(--bb-font-size-xs,0.75rem)] truncate"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {description}
        </p>
      )}
      <p
        className="text-[var(--bb-font-size-xs,0.75rem)] mt-0.5"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {timestamp}
      </p>
    </div>
  </div>
);

/**
 * SummaryActivityList - Container for activity items
 */
export const SummaryActivityList = ({
  children,
  className,
  emptyMessage = 'No recent activity',
}) => {
  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren) {
    return (
      <div
        className="py-[var(--bb-space-6,1.5rem)] text-center"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        <p className="text-[var(--bb-font-size-sm,0.875rem)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-[var(--bb-space-1,0.25rem)]', className)}>
      {children}
    </div>
  );
};

/**
 * SummaryQuickAction - Single quick action button
 */
export const SummaryQuickAction = ({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  className,
}) => (
  <Button
    variant={variant}
    size="sm"
    onClick={onClick}
    className={cn(
      'w-full justify-start gap-[var(--bb-space-3,0.75rem)]',
      'h-11',
      className
    )}
  >
    {Icon && <Icon className="h-4 w-4" />}
    <span>{label}</span>
  </Button>
);

/**
 * SummaryQuickActions - Container for quick action buttons
 */
export const SummaryQuickActions = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'space-y-[var(--bb-space-2,0.5rem)]',
      className
    )}
  >
    {children}
  </div>
);

/**
 * SummaryHighlight - Prominent callout/highlight box
 * Uses Tailwind classes for proper dark mode support
 */
export const SummaryHighlight = ({
  icon: Icon,
  label,
  value,
  subValue,
  variant = 'default',
  className,
}) => {
  // Tailwind classes for each variant (light + dark mode)
  const variantClasses = {
    default: {
      container: 'bg-[var(--bb-color-bg-elevated)] border-[var(--bb-color-border-subtle)]',
      iconBg: 'bg-[var(--bb-color-accent-soft)]',
      iconColor: 'text-[var(--bb-color-accent)]',
      valueColor: 'text-[var(--bb-color-text-primary)]',
    },
    success: {
      container: 'bg-emerald-500/10 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-500',
      valueColor: 'text-emerald-500',
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/30',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-500',
      valueColor: 'text-amber-500',
    },
    danger: {
      container: 'bg-red-500/10 border-red-500/30',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-500',
      valueColor: 'text-red-500',
    },
  };

  const classes = variantClasses[variant] || variantClasses.default;

  return (
    <div
      className={cn(
        'rounded-xl border p-[var(--bb-space-4,1rem)]',
        classes.container,
        className
      )}
    >
      <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              classes.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', classes.iconColor)} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-[var(--bb-font-size-xs,0.75rem)] font-medium uppercase tracking-wider"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {label}
          </p>
          <p
            className={cn(
              'text-[var(--bb-font-size-xl,1.5rem)] font-bold leading-tight',
              classes.valueColor
            )}
          >
            {value}
          </p>
          {subValue && (
            <p
              className="text-[var(--bb-font-size-xs,0.75rem)] mt-0.5"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
