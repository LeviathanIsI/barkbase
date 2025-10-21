import { FileText, Mail, Cloud, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

const QuickIntegrations = () => {
  const handleExportToSheets = async () => {
    try {
      const response = await fetch('/api/v1/integrations/google-sheets/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payments' })
      });
      if (response.ok) {
        toast.success('Exported to Google Sheets');
      } else {
        toast.error('Failed to export to Sheets');
      }
    } catch (error) {
      toast.error('Google Sheets integration not configured');
    }
  };

  const handleEmailReports = async () => {
    try {
      const response = await fetch('/api/v1/reports/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payments' })
      });
      if (response.ok) {
        toast.success('Report emailed successfully');
      } else {
        toast.error('Failed to email report');
      }
    } catch (error) {
      toast.error('Email service not configured');
    }
  };

  const handleSyncQuickBooks = async () => {
    try {
      const response = await fetch('/api/v1/integrations/quickbooks/sync', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        toast.success('Synced to QuickBooks');
      } else {
        toast.error('Failed to sync to QuickBooks');
      }
    } catch (error) {
      toast.error('QuickBooks integration not configured');
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch('/api/v1/payments/export/csv', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('CSV downloaded');
      } else {
        toast.error('Failed to download CSV');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">🔗 QUICK INTEGRATIONS</h4>
      <p className="text-gray-600 mb-6">Export payments directly to your favorite tools</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button variant="outline" className="flex items-center gap-2 h-auto p-4" onClick={handleExportToSheets}>
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm">Export to Sheets</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4" onClick={handleEmailReports}>
          <Mail className="w-5 h-5 text-green-600" />
          <span className="text-sm">Email Reports</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4" onClick={handleSyncQuickBooks}>
          <Cloud className="w-5 h-5 text-purple-600" />
          <span className="text-sm">Sync to QuickBooks</span>
        </Button>

        <Button variant="outline" className="flex items-center gap-2 h-auto p-4" onClick={handleDownloadCSV}>
          <Download className="w-5 h-5 text-orange-600" />
          <span className="text-sm">Download CSV</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickIntegrations;