/**
 * Enterprise Badge Component
 * Token-based status indicators and labels with semantic variants
 * Supports light/dark modes through CSS custom properties
 */

/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Base styles - consistent across all variants
  [
    'inline-flex items-center',
    'gap-[var(--bb-space-1)]',
    'px-[var(--bb-space-2)] py-[2px]',
    'rounded-full',
    'text-[0.75rem] font-[var(--bb-font-weight-medium)]',
    'leading-tight',
    'border',
    'transition-colors',
  ],
  {
    variants: {
      variant: {
        // Neutral - Default, low emphasis
        neutral: [
          'bg-[var(--bb-color-bg-elevated)]',
          'border-[var(--bb-color-border-subtle)]',
          'text-[var(--bb-color-text-muted)]',
        ],

        // Default - Alias for neutral
        default: [
          'bg-[var(--bb-color-bg-elevated)]',
          'border-[var(--bb-color-border-subtle)]',
          'text-[var(--bb-color-text-muted)]',
        ],

        // Info - Blue, informational
        info: [
          'bg-[var(--bb-color-status-info-soft)]',
          'border-[var(--bb-color-status-info-soft)]',
          'text-[var(--bb-color-status-info-text)]',
        ],

        // Success - Green, positive status
        success: [
          'bg-[var(--bb-color-status-positive-soft)]',
          'border-[var(--bb-color-status-positive-soft)]',
          'text-[var(--bb-color-status-positive-text)]',
        ],

        // Warning - Amber, caution
        warning: [
          'bg-[var(--bb-color-status-warning-soft)]',
          'border-[var(--bb-color-status-warning-soft)]',
          'text-[var(--bb-color-status-warning-text)]',
        ],

        // Danger - Red, negative/error status
        danger: [
          'bg-[var(--bb-color-status-negative-soft)]',
          'border-[var(--bb-color-status-negative-soft)]',
          'text-[var(--bb-color-status-negative-text)]',
        ],

        // Error - Alias for danger
        error: [
          'bg-[var(--bb-color-status-negative-soft)]',
          'border-[var(--bb-color-status-negative-soft)]',
          'text-[var(--bb-color-status-negative-text)]',
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

        // Accent - Primary brand color for premium labels
        accent: [
          'bg-[var(--bb-color-accent-soft)]',
          'border-[var(--bb-color-accent-soft)]',
          'text-[var(--bb-color-accent)]',
        ],

        // Primary - Alias for accent (backward compatibility)
        primary: [
          'bg-[var(--bb-color-accent-soft)]',
          'border-[var(--bb-color-accent-soft)]',
          'text-[var(--bb-color-accent)]',
        ],

        // Secondary - Uses branding secondary color
        secondary: [
          'bg-[var(--bb-color-secondary-soft,var(--bb-color-bg-elevated))]',
          'border-[var(--bb-color-secondary-soft,var(--bb-color-border-subtle))]',
          'text-[var(--bb-color-secondary,var(--bb-color-text-primary))]',
        ],

        // Purple - For special states like No Show
        purple: [
          'bg-[var(--bb-color-purple-soft)]',
          'border-[var(--bb-color-purple-soft)]',
          'text-[var(--bb-color-purple)]',
        ],
      },
      size: {
        sm: 'text-[0.6875rem] px-[var(--bb-space-1)] py-0',
        default: 'text-[0.75rem] px-[var(--bb-space-2)] py-[2px]',
        lg: 'text-[0.8125rem] px-[var(--bb-space-3)] py-[var(--bb-space-1)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
);

const Badge = React.forwardRef(({ 
  className, 
  variant, 
  size,
  icon: Icon,
  children, 
  ...props 
}, ref) => {
  return (
    <span 
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)} 
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

// Export variants for external use
export { badgeVariants };
export default Badge;
