import { cn } from '@/lib/cn';

const variants = {
  neutral: 'bg-muted/20 text-muted border border-muted/30',
  success: 'bg-success/15 text-success border border-success/40',
  warning: 'bg-warning/15 text-warning border border-warning/40',
  danger: 'bg-danger/15 text-danger border border-danger/40',
  info: 'bg-primary/15 text-primary border border-primary/40',
};

const Badge = ({ children, variant = 'neutral', className }) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', variants[variant], className)}>
    {children}
  </span>
);

export default Badge;
