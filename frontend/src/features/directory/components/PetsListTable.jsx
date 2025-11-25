/**
 * Pets List Table - Phase 8 Enterprise Table System
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
import { PawPrint } from 'lucide-react';

const PetsListTable = ({ pets, renderRow }) => (
  <Card className="overflow-hidden p-0">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pet</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vaccinations</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pets.length === 0 ? (
          <TableEmpty
            icon={PawPrint}
            message="No pets found"
            colSpan={5}
          />
        ) : (
          pets.map((pet) => renderRow(pet))
        )}
      </TableBody>
    </Table>
  </Card>
);

export default PetsListTable;
