import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';
import SettingsPage from '../components/SettingsPage';

const Exports = () => {
  return (
    
    <SettingsPage title="Data Exports" description="Export your data for backup or migration purposes">
      <Card title="Export Workspace Data" description="Download a complete export of your workspace.">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Export includes pets, owners, bookings, payments, audit logs, and membership data in JSON format.
          </p>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Export (Coming Soon)
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Exports;