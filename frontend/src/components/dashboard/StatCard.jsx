import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Hero stat card for dashboard metrics
 * Shows a single KPI with optional trend and icon
 *
 * enterprise pattern: Max 5 of these on any dashboard
 *
 * @param {string} label - Metric label
 * @param {string|number} value - Metric value (REAL data, not placeholder)
 * @param {React.Component} icon - Optional icon component
 * @param {string} trend - Optional trend text ("+3 from yesterday")
 * @param {string} trendDirection - 'up' | 'down' | 'neutral'
 * @param {string} status - 'success' | 'warning' | 'error' | 'neutral'
 * @param {function} onClick - Optional click handler
 *
 * @example
 * <StatCard
 *   label="Checking In Today"
 *   value={todayStats.checkIns}
 *   icon={LogIn}
 *   trend="+3 from yesterday"
 *   trendDirection="up"
 * />
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  status = 'neutral',
  onClick,
  loading = false,
  className,
}) {
  const statusColors = {
    success: 'text-[var(--color-success)] dark:text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)] dark:text-[var(--color-warning)]',
    error: 'text-[var(--color-error)] dark:text-[var(--color-error)]',
    neutral: 'text-[var(--text-primary)]',
  };

  const trendColors = {
    up: 'text-[var(--color-success)]',
    down: 'text-[var(--color-error)]',
    neutral: 'text-[var(--text-tertiary)]',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border p-6 transition-all",
        "bg-white dark:bg-[var(--surface-primary)]",
        "border-gray-200 dark:border-[var(--border-light)]",
        onClick && "cursor-pointer hover:border-primary-600 dark:hover:border-primary-600 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            {label}
          </p>

          {/* Value */}
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 dark:bg-[var(--bg-secondary)] rounded animate-pulse" />
          ) : (
            <p className={cn(
              "text-3xl font-semibold tracking-tight",
              statusColors[status]
            )}>
              {value ?? '—'}
            </p>
          )}

          {/* Trend */}
          {trend && !loading && (
            <div className={cn(
              "flex items-center gap-1 mt-2",
              trendColors[trendDirection]
            )}>
              {trendDirection === 'up' && <TrendingUp className="w-3 h-3" />}
              {trendDirection === 'down' && <TrendingDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{trend}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={cn(
            "flex-shrink-0",
            statusColors[status]
          )}>
            <Icon className="w-8 h-8 opacity-80" />
          </div>
        )}
      </div>
    </div>
  );
}

StatCard.displayName = 'StatCard';
