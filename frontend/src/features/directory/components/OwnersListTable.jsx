import { Card } from '@/components/ui/Card';

// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const OwnersListTable = ({ owners, renderRow }) => (
  <Card className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-300 dark:border-surface-border">
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Owner</th>
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Contact</th>
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Pets</th>
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Status</th>
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Bookings</th>
          <th className="py-3 px-4 text-left font-semibold text-gray-900 dark:text-text-primary">Lifetime Value</th>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => renderRow(owner))}
      </tbody>
    </table>
  </Card>
);

export default OwnersListTable;

