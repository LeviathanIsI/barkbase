// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const PetsListTable = ({ pets, renderRow }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border bg-white dark:bg-dark-bg-secondary">
        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
          {pets.map((pet) => renderRow(pet))}
        </tbody>
      </table>
    </div>
  );
};

export default PetsListTable;

