import { Card } from '@/components/ui/Card';

// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const PetsListTable = ({ pets, renderRow }) => (
  <Card className="overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 dark:bg-dark-bg-secondary border-b border-gray-200 dark:border-dark-border">
          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
            Pet
          </th>
          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
            Owner
          </th>
          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
            Status
          </th>
          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
            Vaccinations
          </th>
          <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-dark-bg-primary">
        {pets.map((pet) => renderRow(pet))}
      </tbody>
    </table>
  </Card>
);

export default PetsListTable;

