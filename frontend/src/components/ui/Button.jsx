import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-primary text-surface hover:bg-primary/90 focus-visible:outline-primary shadow-sm transition-colors',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface/80 focus-visible:outline-secondary',
  ghost:
    'bg-transparent text-text hover:bg-surface/60 focus-visible:outline-primary',
  destructive:
    'bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm font-medium',
  lg: 'px-5 py-2.5 text-base font-semibold',
  icon: 'p-2',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export default Button;
