import { cn } from '@/lib/cn';

const STATUS_STYLES = {
  active: 'bg-emerald-50 dark:bg-surface-primary text-emerald-700 border-emerald-100 dark:border-emerald-900/30',
  inactive: 'bg-gray-100 dark:bg-surface-secondary text-gray-600 dark:text-text-secondary border-gray-200 dark:border-surface-border',
  pending: 'bg-amber-50 dark:bg-surface-primary text-amber-700 border-amber-100 dark:border-amber-900/30',
  canceled: 'bg-rose-50 dark:bg-surface-primary text-rose-700 border-rose-100 dark:border-rose-900/30',
  warning: 'bg-amber-50 dark:bg-surface-primary text-amber-700 border-amber-100 dark:border-amber-900/30',
  success: 'bg-emerald-50 dark:bg-surface-primary text-emerald-700 border-emerald-100 dark:border-emerald-900/30',
  info: 'bg-blue-50 dark:bg-surface-primary text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/30',
};

/**
 * Semantic status pill with color mapping.
 */
export default function StatusPill({
  status,
  intent,
  children,
  className,
}) {
  const key = intent ?? status?.toLowerCase();
  const styles = STATUS_STYLES[key] ?? 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary border-gray-200 dark:border-surface-border';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize',
        styles,
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
