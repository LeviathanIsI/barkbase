import { useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import Button from './Button';

const AlertDialog = ({ children, open, onOpenChange }) => {
  if (!open) return null;

  const dialogRef = useRef(null);

  useEffect(() => {
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
  }, [onOpenChange]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" />

      {/* Dialog */}
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#E0E0E0] bg-white p-6 shadow-lg duration-200 sm:rounded-lg">
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
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const AlertDialogTitle = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-[#263238]', className)} {...props} />
);

const AlertDialogDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-[#64748B]', className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const AlertDialogAction = ({ className, onClick, ...props }) => (
  <Button className={cn('mt-2 sm:mt-0', className)} onClick={onClick} {...props} />
);

const AlertDialogCancel = ({ className, onClick, ...props }) => (
  <Button variant="outline" className={cn('mt-2 sm:mt-0', className)} onClick={onClick} {...props} />
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
