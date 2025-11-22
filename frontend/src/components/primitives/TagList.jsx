import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Simple tag chip list with optional remove controls.
 */
export default function TagList({
  tags = [],
  onRemove,
  className,
  emptyLabel = 'No tags',
  tone = 'neutral',
}) {
  const toneClass = tone === 'neutral'
    ? 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary border-gray-200 dark:border-surface-border'
    : 'bg-primary/10 text-primary border-primary/20';

  if (!tags.length) {
    return (
      <div className={cn('text-sm text-muted', className)}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium',
            toneClass,
          )}
        >
          <span>{tag}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="rounded-md p-0.5 text-muted transition hover:text-text"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
