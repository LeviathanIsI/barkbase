import { cn } from '@/lib/utils';

/**
 * Token-based section for displaying related owner information.
 * Uses enterprise design tokens for consistent theming.
 */
const RelatedOwnerSection = ({ children, title = 'Owner', actions, className }) => (
  <section className={cn('space-y-[var(--bb-space-3,0.75rem)]', className)}>
    <div className="flex items-center justify-between gap-[var(--bb-space-2,0.5rem)]">
      <h2
        className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {title}
      </h2>
      {actions}
    </div>
    <div
      className="rounded-lg border p-[var(--bb-space-4,1rem)]"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      {children}
    </div>
  </section>
);

export default RelatedOwnerSection;
