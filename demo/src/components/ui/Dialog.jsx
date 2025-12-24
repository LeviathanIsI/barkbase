/**
 * Professional Dialog/Modal Component
 * Clean overlay with proper accessibility and token-based styling
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = ({ open, onClose, children, className, size = 'default' }) => {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm z-[1040] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Dialog Container */}
      <div className="fixed inset-0 z-[1050] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-[var(--bb-space-4)]">
          <div
            className={cn(
              'relative w-full rounded-[var(--bb-radius-lg)]',
              'bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]',
              'shadow-[var(--bb-elevation-card)]',
              'animate-slide-in',
              sizeClasses[size] || sizeClasses.default,
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

const DialogContent = ({ className, children, ...props }) => (
  <div className={cn('relative', className)} {...props}>
    {children}
  </div>
);

const DialogHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      'flex flex-col space-y-[var(--bb-space-1)]',
      'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
      'border-b border-[var(--bb-color-border-subtle)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const DialogBody = ({ className, children, ...props }) => (
  <div
    className={cn(
      'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
      'text-[var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const DialogFooter = ({ className, children, ...props }) => (
  <div
    className={cn(
      'flex items-center justify-end gap-[var(--bb-space-3)]',
      'px-[var(--bb-space-6)] py-[var(--bb-space-4)]',
      'border-t border-[var(--bb-color-border-subtle)]',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const DialogTitle = ({ className, children, ...props }) => (
  <h2
    className={cn(
      'text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)]',
      'text-[var(--bb-color-text-primary)]',
      className
    )}
    {...props}
  >
    {children}
  </h2>
);

const DialogDescription = ({ className, children, ...props }) => (
  <p
    className={cn(
      'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]',
      className
    )}
    {...props}
  >
    {children}
  </p>
);

const DialogClose = ({ onClose, className }) => (
  <button
    onClick={onClose}
    className={cn(
      'absolute right-[var(--bb-space-4)] top-[var(--bb-space-4)]',
      'rounded-[var(--bb-radius-sm)] p-[var(--bb-space-1)]',
      'text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]',
      'focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]',
      'transition-colors',
      className
    )}
  >
    <X className="h-5 w-5" />
    <span className="sr-only">Close</span>
  </button>
);

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};

export default Dialog;
