import { FileText, Mail, Cloud, Download } from 'lucide-react';
import Button from '@/components/ui/Button';

const QuickIntegrations = () => {
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">🔗 QUICK INTEGRATIONS</h4>
      <p className="text-gray-600 dark:text-text-secondary mb-6">Export payments directly to your favorite tools</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm">Export to Sheets</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
          <Mail className="w-5 h-5 text-green-600" />
          <span className="text-sm">Email Reports</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
          <Cloud className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm">Sync to QuickBooks</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4">
          <Download className="w-5 h-5 text-orange-600" />
          <span className="text-sm">Download CSV</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickIntegrations;