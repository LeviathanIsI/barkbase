/**
 * InspectorSection - Reusable section wrapper for inspector panels
 * Provides consistent spacing and visual hierarchy
 */

import { cn } from '@/lib/cn';

const InspectorSection = ({
  title,
  description,
  icon: Icon,
  children,
  noBorder = false,
  compact = false,
  className,
}) => {
  return (
    <section
      className={cn(
        'bg-[var(--bb-color-bg-surface)]',
        !noBorder && 'border-b border-[var(--bb-color-border-subtle)]',
        compact ? 'px-[var(--bb-space-6)] py-[var(--bb-space-4)]' : 'px-[var(--bb-space-6)] py-[var(--bb-space-5)]',
        className
      )}
    >
      {/* Section Header */}
      {(title || description) && (
        <div className="mb-[var(--bb-space-4)]">
          <div className="flex items-center gap-[var(--bb-space-2)]">
            {Icon && (
              <Icon className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
            )}
            {title && (
              <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                {title}
              </h4>
            )}
          </div>
          {description && (
            <p className="mt-[var(--bb-space-1)] text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Section Content */}
      <div className="space-y-[var(--bb-space-3)]">
        {children}
      </div>
    </section>
  );
};

export default InspectorSection;

