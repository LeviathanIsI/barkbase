import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const Select = forwardRef(function Select(
  { label, helper, className, children, error, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive/30' : null,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {helper && (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
});

export default Select;
