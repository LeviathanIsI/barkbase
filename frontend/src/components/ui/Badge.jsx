import { cn } from '@/lib/cn';

const variants = {
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-orange-100 text-orange-700 border border-orange-200',
  danger: 'bg-red-100 text-red-700 border border-red-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border border-pink-200',
  cyan: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
};

const Badge = ({ children, variant = 'neutral', className }) => (
  <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all hover:shadow-md', variants[variant], className)}>
    {children}
  </span>
);

export default Badge;
