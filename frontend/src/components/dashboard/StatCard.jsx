import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Hero stat card for dashboard metrics
 * Premium design with glass effect, glow on hover, and gradient icons
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
 * @param {boolean} glow - Enable glow effect based on status
 *
 * @example
 * <StatCard
 *   label="Checking In Today"
 *   value={todayStats.checkIns}
 *   icon={LogIn}
 *   trend="+3 from yesterday"
 *   trendDirection="up"
 *   glow
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
  glow = false,
  className,
}) {
  // Status-based text colors
  const statusColors = {
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    neutral: 'text-[var(--bb-color-text-primary)]',
  };

  // Trend indicator colors
  const trendColors = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-[var(--bb-color-text-muted)]',
  };

  // Icon background gradients
  const iconGradients = {
    success: 'from-emerald-500 to-teal-400',
    warning: 'from-amber-500 to-orange-400',
    error: 'from-red-500 to-rose-400',
    neutral: 'from-slate-500 to-slate-400',
  };

  // Glow effects on hover
  const glowEffects = {
    success: 'hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    warning: 'hover:shadow-[0_0_24px_rgba(245,158,11,0.25)]',
    error: 'hover:shadow-[0_0_24px_rgba(239,68,68,0.25)]',
    neutral: 'hover:shadow-lg',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        // Base card styling - glass effect
        "relative rounded-xl border p-6 transition-all duration-200",
        "bg-[var(--bb-glass-bg)] backdrop-blur-sm",
        "border-[var(--bb-color-border-subtle)]",
        // Hover states
        onClick && "cursor-pointer hover:border-[var(--bb-color-border-strong)]",
        glow && glowEffects[status],
        !glow && onClick && "hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-[var(--bb-font-size-sm)] font-medium text-[var(--bb-color-text-muted)] mb-2">
            {label}
          </p>

          {/* Value */}
          {loading ? (
            <div className="h-9 w-24 bg-[var(--bb-color-bg-elevated)] rounded-lg animate-pulse" />
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
              "flex items-center gap-1.5 mt-2",
              trendColors[trendDirection]
            )}>
              {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              <span className="text-[var(--bb-font-size-xs)] font-medium">{trend}</span>
            </div>
          )}
        </div>

        {/* Premium Icon with gradient background */}
        {Icon && (
          <div className="relative flex-shrink-0">
            {/* Subtle glow behind icon */}
            {glow && (
              <div
                className={cn(
                  "absolute inset-0 rounded-xl blur-xl opacity-40",
                  iconGradients[status]
                )}
                aria-hidden="true"
              />
            )}
            <div
              className={cn(
                "relative flex items-center justify-center rounded-xl",
                "w-12 h-12 bg-gradient-to-br shadow-sm",
                iconGradients[status]
              )}
            >
              <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

StatCard.displayName = 'StatCard';
