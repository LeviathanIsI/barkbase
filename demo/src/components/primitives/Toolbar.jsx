import { cn } from '@/lib/cn';

/**
 * Flex wrapper for page-level controls.
 * Left/right slots keep view/filter controls aligned.
 */
export default function Toolbar({
  start,
  end,
  sticky = false,
  className,
  innerClassName,
}) {
  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-surface-primary',
        sticky && 'sticky top-0 z-10 border-b border-border shadow-sm',
        className,
      )}
    >
      <div className={cn('flex flex-wrap items-center justify-between gap-3', innerClassName)}>
        <div className="flex flex-wrap items-center gap-2">{start}</div>
        <div className="flex flex-wrap items-center gap-2">{end}</div>
      </div>
    </div>
  );
}
