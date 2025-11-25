import { cn } from '@/lib/utils';

/**
 * Token-based container for pet information sections in detail pages.
 * Uses enterprise design tokens for consistent theming.
 */
const PetInfoSection = ({ children, className }) => (
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

export default PetInfoSection;
