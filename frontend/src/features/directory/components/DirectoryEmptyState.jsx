// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const DirectoryEmptyState = ({ title, description, children }) => (
  <div className="rounded-lg border border-dashed border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg-secondary p-8 text-center">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{title}</h3>
    <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">{description}</p>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

export default DirectoryEmptyState;

