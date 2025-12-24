import { cn } from '@/lib/cn';

/**
 * Generic empty state wrapper with icon/title/message/action.
 */
export default function EmptyState({
  icon,
  title,
  message,
  action,
  className,
  align = 'center',
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white dark:bg-surface-primary px-8 py-12 text-center',
        align === 'start' && 'items-start text-left',
        className,
      )}
    >
      {icon && <div className="text-3xl">{icon}</div>}
      {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
      {message && <p className="max-w-lg text-sm text-muted">{message}</p>}
      {action}
    </div>
  );
}
