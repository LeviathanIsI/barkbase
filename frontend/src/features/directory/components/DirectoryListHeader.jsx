// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const DirectoryListHeader = ({ title, actions, children }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">
          {title}
        </h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
};

export default DirectoryListHeader;

