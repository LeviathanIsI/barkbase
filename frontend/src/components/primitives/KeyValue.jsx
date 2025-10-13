import { cn } from '@/lib/cn';

/**
 * Inline key/value pair for compact sections (e.g., summary pills).
 */
export default function KeyValue({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
  separator = ':',
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-muted', className)}>
      <span className={cn('font-medium text-text', labelClassName)}>{label}</span>
      {separator && <span>{separator}</span>}
      <span className={cn('text-text', valueClassName)}>{value ?? '—'}</span>
    </span>
  );
}
