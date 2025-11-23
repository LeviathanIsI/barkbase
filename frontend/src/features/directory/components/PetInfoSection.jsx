import { cn } from '@/lib/utils';

// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const PetInfoSection = ({ children, className }) => (
  <div
    className={cn(
      'rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary p-6',
      className
    )}
  >
    {children}
  </div>
);

export default PetInfoSection;

