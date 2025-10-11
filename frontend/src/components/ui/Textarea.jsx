import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const Textarea = forwardRef(function Textarea(
  { label, helper, className, error, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          'min-h-[120px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive/30' : null,
          className,
        )}
        {...props}
      />
      {helper && (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
});

export default Textarea;
