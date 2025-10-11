import { cn } from '@/lib/cn';

const Input = ({ label, helper, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      {helper && (
        <p className="mt-1 text-xs text-muted">{helper}</p>
      )}
    </div>
  );
};

export default Input;
