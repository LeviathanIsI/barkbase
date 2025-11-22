/**
 * Professional Dialog/Modal Component
 * Clean overlay with proper accessibility
 */

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = ({ open, onClose, children, className }) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[1040] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Dialog Container */}
      <div className="fixed inset-0 z-[1050] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative bg-white dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border shadow-lg w-full max-w-lg',
              'animate-slide-in',
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
    className={cn('flex flex-col space-y-1.5 px-6 py-6 border-b border-gray-200 dark:border-dark-border', className)}
    {...props}
  >
    {children}
  </div>
);

const DialogFooter = ({ className, children, ...props }) => (
  <div
    className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-border', className)}
    {...props}
  >
    {children}
  </div>
);

const DialogTitle = ({ className, children, ...props }) => (
  <h2
    className={cn('text-xl font-semibold text-gray-900 dark:text-dark-text-primary', className)}
    {...props}
  >
    {children}
  </h2>
);

const DialogDescription = ({ className, children, ...props }) => (
  <p
    className={cn('text-sm text-gray-600 dark:text-dark-text-secondary', className)}
    {...props}
  >
    {children}
  </p>
);

const DialogClose = ({ onClose, className }) => (
  <button
    onClick={onClose}
    className={cn(
      'absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100',
      'focus:outline-none focus:ring-2 focus:ring-primary-500',
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
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};

export default Dialog;
