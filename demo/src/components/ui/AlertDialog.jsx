import { useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import Button from './Button';

const AlertDialog = ({ children, open, onOpenChange }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onOpenChange?.(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-[var(--bb-color-overlay-scrim)] backdrop-blur-sm" />

      {/* Dialog */}
      <div 
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg',
          'translate-x-[-50%] translate-y-[-50%]',
          'gap-[var(--bb-space-4)]',
          'border border-[var(--bb-color-border-subtle)]',
          'bg-[var(--bb-color-bg-surface)]',
          'p-[var(--bb-space-6)]',
          'shadow-[var(--bb-elevation-card)]',
          'duration-200 sm:rounded-[var(--bb-radius-lg)]'
        )}
      >
        <div ref={dialogRef}>
          {children}
        </div>
      </div>
    </>
  );
};

const AlertDialogTrigger = ({ children, asChild }) => {
  const triggerElement = asChild ? children : <button>{children}</button>;
  return triggerElement;
};

const AlertDialogContent = ({ children, className }) => (
  <div className={cn(className)}>
    {children}
  </div>
);

const AlertDialogHeader = ({ className, ...props }) => (
  <div 
    className={cn(
      'flex flex-col space-y-[var(--bb-space-2)] text-center sm:text-left', 
      className
    )} 
    {...props} 
  />
);

const AlertDialogTitle = ({ className, ...props }) => (
  <h2 
    className={cn(
      'text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)]',
      'leading-none tracking-tight',
      'text-[var(--bb-color-text-primary)]',
      className
    )} 
    {...props} 
  />
);

const AlertDialogDescription = ({ className, ...props }) => (
  <p 
    className={cn(
      'text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]',
      className
    )} 
    {...props} 
  />
);

const AlertDialogFooter = ({ className, ...props }) => (
  <div 
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end',
      'gap-[var(--bb-space-2)]',
      className
    )} 
    {...props} 
  />
);

const AlertDialogAction = ({ className, onClick, ...props }) => (
  <Button 
    className={cn('mt-[var(--bb-space-2)] sm:mt-0', className)} 
    onClick={onClick} 
    {...props} 
  />
);

const AlertDialogCancel = ({ className, onClick, ...props }) => (
  <Button 
    variant="outline" 
    className={cn('mt-[var(--bb-space-2)] sm:mt-0', className)} 
    onClick={onClick} 
    {...props} 
  />
);

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};

export default AlertDialog;
