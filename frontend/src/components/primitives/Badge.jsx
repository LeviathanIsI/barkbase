import { cn } from '@/lib/cn';

/**
 * Low-emphasis badge with optional tone overrides.
 */
export default function Badge({ children, tone = 'neutral', className }) {
  const toneClass = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-100',
  }[tone] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
