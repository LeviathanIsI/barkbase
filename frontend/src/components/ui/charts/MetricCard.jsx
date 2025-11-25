/**
 * MetricCard - KPI/Metric display card
 * Consistent styling for metric boxes across the app
 */

import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default', // 'default' | 'success' | 'warning' | 'danger' | 'info'
  size = 'md', // 'sm' | 'md' | 'lg'
  className,
}) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-[var(--bb-color-bg-elevated)]',
      iconColor: 'text-[var(--bb-color-accent)]',
    },
    success: {
      iconBg: 'bg-[var(--bb-color-status-positive-soft)]',
      iconColor: 'text-[var(--bb-color-status-positive)]',
    },
    warning: {
      iconBg: 'bg-[var(--bb-color-status-warning-soft)]',
      iconColor: 'text-[var(--bb-color-status-warning)]',
    },
    danger: {
      iconBg: 'bg-[var(--bb-color-status-negative-soft)]',
      iconColor: 'text-[var(--bb-color-status-negative)]',
    },
    info: {
      iconBg: 'bg-[var(--bb-color-status-info-soft)]',
      iconColor: 'text-[var(--bb-color-status-info)]',
    },
  };

  const sizeStyles = {
    sm: {
      padding: 'p-[var(--bb-space-3)]',
      iconSize: 'h-8 w-8',
      iconInner: 'h-4 w-4',
      valueSize: 'text-[var(--bb-font-size-lg)]',
      titleSize: 'text-[var(--bb-font-size-xs)]',
    },
    md: {
      padding: 'p-[var(--bb-space-4)]',
      iconSize: 'h-10 w-10',
      iconInner: 'h-5 w-5',
      valueSize: 'text-[var(--bb-font-size-xl)]',
      titleSize: 'text-[var(--bb-font-size-xs)]',
    },
    lg: {
      padding: 'p-[var(--bb-space-6)]',
      iconSize: 'h-12 w-12',
      iconInner: 'h-6 w-6',
      valueSize: 'text-[var(--bb-font-size-2xl)]',
      titleSize: 'text-[var(--bb-font-size-sm)]',
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;
  const sizes = sizeStyles[size] || sizeStyles.md;

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-[var(--bb-color-status-positive)]';
    if (trend === 'down') return 'text-[var(--bb-color-status-negative)]';
    return 'text-[var(--bb-color-text-muted)]';
  };

  const TrendIcon = getTrendIcon();

  return (
    <div
      className={cn(
        'rounded-[var(--bb-radius-xl)] border border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-surface)]',
        sizes.padding,
        className
      )}
    >
      <div className="flex items-start gap-[var(--bb-space-4)]">
        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center rounded-[var(--bb-radius-lg)]',
              sizes.iconSize,
              styles.iconBg
            )}
          >
            <Icon className={cn(sizes.iconInner, styles.iconColor)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className={cn(
              'text-[var(--bb-color-text-muted)] uppercase tracking-wide',
              sizes.titleSize
            )}>
              {title}
            </p>
          )}
          <p className={cn(
            'font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mt-[var(--bb-space-1)]',
            sizes.valueSize
          )}>
            {value}
          </p>
          
          {/* Description or Trend */}
          {(description || trend) && (
            <div className="flex items-center gap-[var(--bb-space-2)] mt-[var(--bb-space-2)]">
              {trend && (
                <div className={cn('flex items-center gap-[var(--bb-space-1)]', getTrendColor())}>
                  <TrendIcon className="h-3 w-3" />
                  {trendValue && (
                    <span className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)]">
                      {trendValue}
                    </span>
                  )}
                </div>
              )}
              {description && (
                <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;

