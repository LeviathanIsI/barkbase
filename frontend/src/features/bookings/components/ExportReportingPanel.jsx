import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import Button from '@/components/ui/Button';

const ExportReportingPanel = () => {
  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">📊 Export & Reports</h4>
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="w-full justify-start">
          <FileText className="w-4 h-4 mr-2" />
          PDF Report
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Table className="w-4 h-4 mr-2" />
          Excel Export
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV Export
        </Button>
      </div>
    </div>
  );
};

export default ExportReportingPanel;
