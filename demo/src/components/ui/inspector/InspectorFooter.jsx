/**
 * InspectorFooter - Action buttons area for inspector panels
 * Right-aligned with proper spacing and border-top
 */

import { cn } from '@/lib/cn';

const InspectorFooter = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-[var(--bb-space-3)]',
        'px-[var(--bb-space-6)] py-[var(--bb-space-4)]',
        'border-t border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-surface)]',
        className
      )}
    >
      {children}
    </div>
  );
};

export default InspectorFooter;

