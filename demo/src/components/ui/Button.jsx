/**
 * Enterprise Button Component
 * Token-based design system with consistent variants and sizes
 * Uses bb-color-*, bb-font-*, bb-space-* tokens for light/dark support
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - Enterprise foundation with token-based design
  [
    'inline-flex items-center justify-center gap-[var(--bb-space-2)]',
    'rounded-md',
    'text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-offset-0',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        // Primary - Accent color, high emphasis
        primary: [
          'bg-[var(--bb-color-accent)] text-[var(--bb-color-text-on-accent)]',
          'hover:bg-[var(--bb-color-accent)]/90',
          'active:bg-[var(--bb-color-accent)]/80',
        ],

        // Secondary - Surface background, medium emphasis
        secondary: [
          'bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)]',
          'border border-[var(--bb-color-border-subtle)]',
          'hover:bg-[var(--bb-color-bg-elevated)]',
          'active:bg-[var(--bb-color-bg-elevated)]',
        ],

        // Outline - Border only, medium emphasis
        outline: [
          'bg-transparent text-[var(--bb-color-text-primary)]',
          'border border-[var(--bb-color-border-subtle)]',
          'hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)]',
          'active:bg-[var(--bb-color-accent-soft)]',
        ],

        // Subtle - Muted background, low emphasis
        subtle: [
          'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]',
          'hover:bg-[var(--bb-color-border-subtle)]',
          'active:bg-[var(--bb-color-border-strong)]',
        ],

        // Destructive - For delete/remove actions
        destructive: [
          'bg-[var(--bb-color-status-negative)] text-white',
          'hover:bg-[var(--bb-color-status-negative)]/90',
          'active:bg-[var(--bb-color-status-negative)]/80',
        ],

        // Ghost - Minimal, no background
        ghost: [
          'bg-transparent text-[var(--bb-color-text-primary)]',
          'hover:bg-[var(--bb-color-bg-elevated)]',
          'active:bg-[var(--bb-color-border-subtle)]',
        ],

        // Link - Text button style
        link: [
          'bg-transparent text-[var(--bb-color-accent)]',
          'hover:underline',
          'active:text-[var(--bb-color-accent)]/80',
          'p-0 h-auto',
        ],

        // Success - For positive actions
        success: [
          'bg-[var(--bb-color-status-positive)] text-white',
          'hover:bg-[var(--bb-color-status-positive)]/90',
          'active:bg-[var(--bb-color-status-positive)]/80',
        ],

        // Tertiary - Text only with hover background (backward compat)
        tertiary: [
          'bg-transparent text-[var(--bb-color-accent)]',
          'hover:bg-[var(--bb-color-accent-soft)]',
          'active:bg-[var(--bb-color-accent-soft)]',
        ],

        // Ghost Dark - For use on dark backgrounds (backward compat)
        'ghost-dark': [
          'bg-transparent text-white',
          'hover:bg-white/10',
          'active:bg-white/20',
        ],
      },
      size: {
        xs: 'h-7 px-[var(--bb-space-2)] py-[var(--bb-space-1)] text-[0.75rem]',
        sm: 'h-8 px-[var(--bb-space-3)] py-[var(--bb-space-1)]',
        md: 'h-10 px-[var(--bb-space-4)] py-[var(--bb-space-2)]',
        lg: 'h-12 px-[var(--bb-space-5)] py-[var(--bb-space-3)]',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-xs': 'h-6 w-6 p-0',
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
