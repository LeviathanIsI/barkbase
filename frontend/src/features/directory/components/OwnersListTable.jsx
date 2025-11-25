/**
 * Owners List Table - Phase 8 Enterprise Table System
 * Token-based styling for consistent theming.
 */

import { Card } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';
import { Users } from 'lucide-react';

const OwnersListTable = ({ owners, renderRow }) => (
  <Card className="overflow-hidden p-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Owner</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Pets</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Bookings</TableHead>
          <TableHead>Lifetime Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {owners.length === 0 ? (
          <TableEmpty
            icon={Users}
            message="No owners found"
            colSpan={6}
          />
        ) : (
          owners.map((owner) => renderRow(owner))
        )}
      </TableBody>
    </Table>
  </Card>
);

export default OwnersListTable;
