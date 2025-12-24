import { cn } from '@/lib/utils';

/**
 * Token-based container for owner information sections in detail pages.
 * Uses enterprise design tokens for consistent theming.
 */
const OwnerInfoSection = ({ children, className }) => (
  <div
    className={cn(
      'rounded-lg border p-[var(--bb-space-6,1.5rem)]',
      className
    )}
    style={{
      backgroundColor: 'var(--bb-color-bg-surface)',
      borderColor: 'var(--bb-color-border-subtle)',
    }}
  >
    {children}
  </div>
);

export default OwnerInfoSection;
