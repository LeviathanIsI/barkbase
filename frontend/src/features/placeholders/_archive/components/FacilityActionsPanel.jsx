import { Download, Upload, FileText, Settings, Wrench, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';

const FacilityActionsPanel = () => {
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg shadow-lg p-4">
      <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-3">🔧 Facility Actions</h4>
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Settings className="w-4 h-4 mr-2" />
          Edit Facility Settings
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Download className="w-4 h-4 mr-2" />
          Export Configuration
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Upload className="w-4 h-4 mr-2" />
          Import Runs from File
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <FileText className="w-4 h-4 mr-2" />
          Print Facility Map
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Wrench className="w-4 h-4 mr-2" />
          Maintenance Mode
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Shield className="w-4 h-4 mr-2" />
          Compliance Check
        </Button>
      </div>
    </div>
  );
};

export default FacilityActionsPanel;
