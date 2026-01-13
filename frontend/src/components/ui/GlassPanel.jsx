/**
 * GlassPanel - Premium glassmorphism container component
 *
 * Provides consistent frosted glass effect across the application.
 * Use this for sidebar panels, stat cards, and any container that
 * should have the premium glassmorphism aesthetic.
 *
 * Features:
 * - Backdrop blur for frosted glass effect
 * - Semi-transparent background
 * - Subtle inner border glow
 * - Hover/interactive states
 * - Glow variants for status emphasis
 */

import React from 'react';
import { cn } from '@/lib/utils';

const GlassPanel = React.forwardRef(({
  children,
  className,
  as: Component = 'div',
  glow = null, // 'success' | 'warning' | 'danger' | 'info' | 'purple' | null
  interactive = false,
  noPadding = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  ...props
}, ref) => {
  // Size-based padding
  const sizeClasses = {
    sm: 'p-4 rounded-xl',
    md: 'p-5 rounded-2xl',
    lg: 'p-6 rounded-2xl',
  };

  // Glow effects for different statuses
  const glowClasses = {
    success: 'ring-2 ring-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    warning: 'ring-2 ring-amber-400/40 shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    danger: 'ring-2 ring-red-400/40 shadow-[0_0_40px_rgba(239,68,68,0.25)]',
    info: 'ring-2 ring-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    purple: 'ring-2 ring-violet-400/30 shadow-[0_0_35px_rgba(139,92,246,0.2)]',
  };

  return (
    <Component
      ref={ref}
      className={cn(
        // Base glass effect
        'relative border backdrop-blur-[20px]',
        // Background and border from CSS variables
        'bg-[var(--bb-glass-bg)] border-[var(--bb-glass-border)]',
        // Shadow with inset glow for depth
        'shadow-[0_8px_32px_rgba(0,0,0,0.08),_inset_0_0_0_1px_rgba(255,255,255,0.1)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),_inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        // Transition
        'transition-all duration-200',
        // Size and padding
        !noPadding && sizeClasses[size],
        noPadding && (size === 'sm' ? 'rounded-xl' : 'rounded-2xl'),
        // Interactive hover states
        interactive && [
          'cursor-pointer',
          'hover:shadow-[0_12px_40px_rgba(0,0,0,0.12),_inset_0_0_0_1px_rgba(255,255,255,0.15)]',
          'dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),_inset_0_0_0_1px_rgba(255,255,255,0.08)]',
          'hover:border-[var(--bb-glass-border-glow)]',
        ],
        // Glow effect
        glow && glowClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

GlassPanel.displayName = 'GlassPanel';

/**
 * GlassPanelHeader - Header section for GlassPanel with gradient icon
 */
export const GlassPanelHeader = ({
  icon: Icon,
  title,
  subtitle,
  iconGradient = 'from-violet-500 to-purple-600',
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="relative">
            {/* Icon glow */}
            <div
              className={cn(
                'absolute inset-0 rounded-xl blur-xl opacity-40 bg-gradient-to-br',
                iconGradient
              )}
              aria-hidden="true"
            />
            <div
              className={cn(
                'relative h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                iconGradient
              )}
            >
              <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
          </div>
        )}
        <div>
          {title && (
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

/**
 * GradientIcon - Standalone gradient icon with glow effect
 */
export const GradientIcon = ({
  icon: Icon,
  gradient = 'from-violet-500 to-purple-600',
  size = 'md', // 'sm' | 'md' | 'lg'
  glow = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  return (
    <div className={cn('relative', className)}>
      {glow && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl blur-xl opacity-40 bg-gradient-to-br',
            gradient
          )}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'relative rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
          gradient,
          sizeClasses[size]
        )}
      >
        <Icon className={cn('text-white', iconSizes[size])} strokeWidth={1.75} />
      </div>
    </div>
  );
};

/**
 * Pre-defined gradient options for convenience
 */
export const ICON_GRADIENTS = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
  indigo: 'from-indigo-500 to-blue-600',
  red: 'from-red-500 to-rose-600',
  cyan: 'from-cyan-500 to-blue-500',
};

export default GlassPanel;
