const fs = require('fs');
const path = require('path');

const buttonComponent = `/**
 * Dark SaaS Button Component
 * Features: Purple/blue gradients, glow effects, glassmorphism, and smooth animations
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - Modern SaaS foundation with smooth transitions
  \`inline-flex items-center justify-center gap-2 rounded-lg font-medium
  transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-primary-500 focus-visible:ring-offset-2
  dark:focus-visible:ring-offset-gray-950
  disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed\`,
  {
    variants: {
      variant: {
        // Primary - Purple gradient with glow effect
        primary: \`bg-gradient-to-r from-primary-600 to-primary-500 text-white
          hover:from-primary-700 hover:to-primary-600 hover:shadow-glow-purple
          active:from-primary-800 active:to-primary-700
          dark:from-primary-500 dark:to-secondary-500
          dark:hover:from-primary-600 dark:hover:to-secondary-600 dark:hover:shadow-glow\`,

        // Secondary - Outlined with gradient border effect
        secondary: \`border-2 border-primary-500/50 bg-transparent text-primary-700
          hover:border-primary-500 hover:bg-primary-50/50
          active:bg-primary-100/50
          dark:text-primary-400 dark:border-primary-500/30
          dark:hover:border-primary-500/60 dark:hover:bg-primary-950/20\`,

        // Tertiary - Ghost with subtle hover
        tertiary: \`text-primary-600 hover:bg-primary-50 active:bg-primary-100
          dark:text-primary-400 dark:hover:bg-primary-950/30 dark:active:bg-primary-950/50\`,

        // Gradient - Full gradient with animated glow
        gradient: \`bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-600
          text-white shadow-glow-sm
          hover:shadow-glow hover:scale-[1.02]
          active:scale-[0.98]
          bg-[length:200%_100%] hover:bg-[position:100%_0]
          transition-all duration-300\`,

        // Glass - Glassmorphism effect
        glass: \`glass-surface text-text-primary border border-surface-border
          hover:glass-elevated hover:border-primary-500/30
          dark:text-text-primary dark:hover:border-primary-500/50\`,

        // Destructive - Error red with warning
        destructive: \`bg-error-600 text-white
          hover:bg-error-700 hover:shadow-glow-pink
          active:bg-error-800
          dark:bg-error-500 dark:hover:bg-error-600\`,

        // Ghost - Minimal hover effect
        ghost: \`hover:bg-surface-secondary active:bg-surface-primary
          text-text-primary\`,

        // Ghost Dark - For dark backgrounds
        'ghost-dark': \`hover:bg-white/10 active:bg-white/20 text-white\`,

        // Success - Green with positive feel
        success: \`bg-success-600 text-white
          hover:bg-success-700 active:bg-success-800
          dark:bg-success-500 dark:hover:bg-success-600\`,

        // Outline - Simple outline style
        outline: \`border-2 border-surface-border bg-transparent text-text-primary
          hover:bg-surface-secondary hover:border-primary-500/50
          active:bg-surface-primary\`,
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base rounded-xl',
        xl: 'h-14 px-8 text-lg rounded-xl',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
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
export { buttonVariants };
`;

const filePath = path.join(__dirname, 'src/components/ui/Button.jsx');
const backupPath = path.join(__dirname, 'src/components/ui/Button.jsx.backup.' + Date.now());

// Backup old file
if (fs.existsSync(filePath)) {
  fs.copyFileSync(filePath, backupPath);
  console.log('✅ Backed up old Button.jsx to:', backupPath);
}

// Write new file
fs.writeFileSync(filePath, buttonComponent, 'utf8');
console.log('✅ Updated Button.jsx with dark SaaS theme!');
