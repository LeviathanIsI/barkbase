// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const DirectoryErrorState = ({ message = 'Unable to load data.' }) => (
  <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-50">
    {message}
  </div>
);

export default DirectoryErrorState;

