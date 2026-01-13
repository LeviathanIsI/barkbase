/**
 * Enterprise Button Component
 * Token-based design system with consistent variants and sizes
 * Uses bb-color-*, bb-font-*, bb-space-* tokens for light/dark support
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - Enterprise foundation with token-based design + premium transitions
  [
    'inline-flex items-center justify-center gap-[var(--bb-space-2)]',
    'rounded-lg',
    'text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        // Primary - Accent color with hover glow
        primary: [
          'bg-[var(--bb-color-accent)] text-[var(--bb-color-text-on-accent)]',
          'shadow-sm',
          'hover:bg-[var(--bb-color-accent)]/90 hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]',
          'active:bg-[var(--bb-color-accent)]/80 active:scale-[0.98]',
        ],

        // Secondary - Surface background with border glow on hover
        secondary: [
          'bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)]',
          'border border-[var(--bb-color-border-subtle)]',
          'shadow-sm',
          'hover:bg-[var(--bb-color-bg-elevated)] hover:border-[var(--bb-color-border-strong)] hover:shadow-md',
          'active:bg-[var(--bb-color-bg-elevated)] active:scale-[0.98]',
        ],

        // Outline - Border only with accent glow on hover
        outline: [
          'bg-transparent text-[var(--bb-color-text-primary)]',
          'border border-[var(--bb-color-border-subtle)]',
          'hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)] hover:shadow-[0_0_0_1px_var(--bb-color-accent)]',
          'active:bg-[var(--bb-color-accent-soft)] active:scale-[0.98]',
        ],

        // Subtle - Muted background with smooth transitions
        subtle: [
          'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]',
          'hover:bg-[var(--bb-color-border-subtle)]',
          'active:bg-[var(--bb-color-border-strong)] active:scale-[0.98]',
        ],

        // Destructive - Red with danger glow on hover
        destructive: [
          'bg-[var(--bb-color-status-negative)] text-white',
          'shadow-sm',
          'hover:bg-[var(--bb-color-status-negative)]/90 hover:shadow-[0_4px_20px_rgba(239,68,68,0.3)]',
          'active:bg-[var(--bb-color-status-negative)]/80 active:scale-[0.98]',
        ],

        // Ghost - Minimal with smooth hover
        ghost: [
          'bg-transparent text-[var(--bb-color-text-primary)]',
          'hover:bg-[var(--bb-color-bg-elevated)]',
          'active:bg-[var(--bb-color-border-subtle)] active:scale-[0.98]',
        ],

        // Link - Text button style
        link: [
          'bg-transparent text-[var(--bb-color-accent)]',
          'hover:underline',
          'active:text-[var(--bb-color-accent)]/80',
          'p-0 h-auto',
        ],

        // Success - Green with success glow on hover
        success: [
          'bg-[var(--bb-color-status-positive)] text-white',
          'shadow-sm',
          'hover:bg-[var(--bb-color-status-positive)]/90 hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)]',
          'active:bg-[var(--bb-color-status-positive)]/80 active:scale-[0.98]',
        ],

        // Tertiary - Text only with hover background
        tertiary: [
          'bg-transparent text-[var(--bb-color-accent)]',
          'hover:bg-[var(--bb-color-accent-soft)]',
          'active:bg-[var(--bb-color-accent-soft)] active:scale-[0.98]',
        ],

        // Ghost Dark - For use on dark/gradient backgrounds
        'ghost-dark': [
          'bg-transparent text-white',
          'hover:bg-white/10',
          'active:bg-white/20 active:scale-[0.98]',
        ],

        // Premium - Purple gradient for special actions
        premium: [
          'bg-gradient-to-r from-[var(--bb-color-accent-purple)] to-[var(--bb-color-accent-cyan)] text-white',
          'shadow-sm',
          'hover:shadow-[var(--bb-glow-purple)]',
          'active:scale-[0.98]',
        ],
      },
      size: {
        xs: 'h-7 px-[var(--bb-space-2)] py-[var(--bb-space-1)] text-[0.75rem]',
        sm: 'min-h-11 px-[var(--bb-space-3)] py-[var(--bb-space-1)]',
        md: 'min-h-11 px-[var(--bb-space-4)] py-[var(--bb-space-2)]',
        lg: 'h-12 px-[var(--bb-space-5)] py-[var(--bb-space-3)]',
        icon: 'min-h-11 min-w-11 p-0',
        'icon-sm': 'min-h-11 min-w-11 p-0',
        'icon-xs': 'min-h-11 min-w-11 p-0',
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
  asChild = false,
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  ...props 
}, ref) => {
  const isDisabled = disabled || loading;
  
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

// Export variants for external use
export { buttonVariants };
export default Button;
