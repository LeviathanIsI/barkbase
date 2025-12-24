import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';

const Exports = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Data Exports</h1>
          <p className="mt-1 text-sm text-muted">Export your data for backup or migration purposes</p>
        </div>
      </header>

      <Card title="Export Workspace Data" description="Download a complete export of your workspace.">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Export includes pets, owners, bookings, payments, audit logs, and membership data in JSON format.
          </p>
          <Button variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            Download Export (Coming Soon)
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Exports;