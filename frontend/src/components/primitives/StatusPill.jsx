import { cn } from '@/lib/cn';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  canceled: 'bg-rose-50 text-rose-700 border-rose-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
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
  const styles = STATUS_STYLES[key] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize',
        styles,
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
