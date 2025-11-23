import { cn } from '@/lib/utils';

// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const RelatedPetsSection = ({ children, title = 'Pets', actions, className }) => (
  <section className={cn('space-y-3', className)}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{title}</h2>
      {actions}
    </div>
    <div className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary p-4">
      {children}
    </div>
  </section>
);

export default RelatedPetsSection;

