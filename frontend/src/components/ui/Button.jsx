/**
 * Professional Button Component
 * Based on Linear/Calendly patterns with systematic variants
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - Professional foundation
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Brand color, high emphasis
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        
        // Secondary - Outlined, medium emphasis
        secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
        
        // Tertiary - Text only, low emphasis
        tertiary: 'text-primary-600 hover:bg-primary-50 active:bg-primary-100',
        
        // Destructive - For delete/remove actions
        destructive: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
        
        // Ghost - Minimal, subtle
        ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-700',
        
        // Ghost Dark - For use on dark backgrounds
        'ghost-dark': 'hover:bg-white/10 active:bg-white/20 text-white',
        
        // Success - For positive actions
        success: 'bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
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
  ...props 
}, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
