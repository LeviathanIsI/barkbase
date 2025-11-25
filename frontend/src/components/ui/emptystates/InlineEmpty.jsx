/**
 * InlineEmpty - Compact empty state for cards, inspectors, and inline sections
 * Less prominent than the full EmptyState component
 */

import { cn } from '@/lib/cn';

const InlineEmpty = ({
  icon: Icon,
  message,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-[var(--bb-space-3)] px-[var(--bb-space-4)] py-[var(--bb-space-4)]',
        'rounded-[var(--bb-radius-md)] bg-[var(--bb-color-bg-elevated)]',
        className
      )}
    >
      {Icon && (
        <Icon className="h-5 w-5 flex-shrink-0 text-[var(--bb-color-text-muted)]" />
      )}
      <span className="flex-1 text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
        {message}
      </span>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export default InlineEmpty;

