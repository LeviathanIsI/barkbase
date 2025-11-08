import { cn } from '@/lib/cn';

const VARIANT_PADDING = {
  compact: 'p-4',
  spacious: 'p-6',
};

/**
 * Lightweight card wrapper with optional header/footer slots.
 * Keeps spacing consistent across detail and dashboard views.
 */
export default function SectionCard({
  title,
  description,
  header,
  footer,
  children,
  variant = 'spacious',
  className,
  bodyClassName,
}) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-white dark:bg-surface-primary shadow-sm shadow-black/5',
        className,
      )}
    >
      {(title || description || header) && (
        <div className={cn('flex flex-col gap-1 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between', variant === 'spacious' && 'p-6')}>
          <div className="space-y-1">
            {title && <h2 className="text-lg font-semibold text-text">{title}</h2>}
            {description && <p className="text-sm text-muted">{description}</p>}
          </div>
          {header && <div className="flex flex-wrap items-center gap-2">{header}</div>}
        </div>
      )}

      <div className={cn('space-y-4', VARIANT_PADDING[variant], bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className={cn('border-t border-border bg-surface/50 p-4', variant === 'spacious' && 'p-6')}>
          {footer}
        </div>
      )}
    </section>
  );
}
