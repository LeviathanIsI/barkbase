import { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle, FileText, FileSpreadsheet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { downloadReportExport, EXPORT_TYPES, EXPORT_FORMATS } from '../api';

const ExportModal = ({ report, data, isOpen, onClose }) => {
  const [format, setFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);

  if (!report && !data) return null;

  // Map report types to API export types
  const reportTypeMapping = {
    revenue: EXPORT_TYPES.REVENUE,
    bookings: EXPORT_TYPES.BOOKINGS,
    customers: EXPORT_TYPES.CUSTOMERS,
    occupancy: EXPORT_TYPES.OCCUPANCY,
    pets: EXPORT_TYPES.PETS,
    vaccinations: EXPORT_TYPES.VACCINATIONS,
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportResult(null);

    try {
      const reportType = reportTypeMapping[report?.type || report?.id] || report?.type || 'revenue';
      const params = {
        format,
        startDate: data?.startDate || report?.startDate,
        endDate: data?.endDate || report?.endDate,
      };

      const result = await downloadReportExport(reportType, params);
      setExportResult(result);
      
      // Close modal after short delay on success
      setTimeout(() => {
        onClose();
        setExportResult(null);
      }, 1500);
    } catch (err) {
      console.error('[ExportModal] Export failed:', err);
      setError(err.message || 'Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setExportResult(null);
      setError(null);
      onClose();
    }
  };

  const footer = (
    <>
      <Button variant="outline" onClick={handleClose} disabled={isExporting}>
        Cancel
      </Button>
      <Button onClick={handleExport} disabled={isExporting}>
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : exportResult ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </>
        )}
      </Button>
    </>
  );

  const reportTitle = data?.title || report?.name || report?.title || 'Report';
  const reportPeriod = data?.period || 
    (report?.startDate && report?.endDate ? `${report.startDate} - ${report.endDate}` : 'All Time');

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Export Report"
      description={`${reportTitle} - ${reportPeriod}`}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Success Message */}
        {exportResult && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Export successful!</p>
              <p className="text-sm text-green-600 dark:text-green-400">{exportResult.filename}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Export failed</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Format Selection */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">FORMAT</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary transition-colors">
              <input 
                type="radio" 
                name="format" 
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-blue-600 dark:text-blue-400" 
              />
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <span className="text-sm font-medium">CSV (.csv)</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Import into Excel, Google Sheets, or other systems</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-surface-border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary transition-colors">
              <input 
                type="radio" 
                name="format" 
                value="json"
                checked={format === 'json'}
                onChange={(e) => setFormat(e.target.value)}
                className="text-blue-600 dark:text-blue-400" 
              />
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <span className="text-sm font-medium">JSON (.json)</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">Includes summary statistics, ideal for developers</p>
              </div>
            </label>
          </div>
        </div>

        {/* Available Report Types */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">AVAILABLE EXPORT TYPES</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries({
              revenue: 'Revenue by date with totals',
              bookings: 'All bookings with customer details',
              customers: 'Customer list with lifetime value',
              occupancy: 'Daily occupancy rates',
              pets: 'Pet database with owner info',
              vaccinations: 'Vaccination records & expiration status',
            }).map(([type, description]) => (
              <div key={type} className="p-2 text-sm border border-gray-100 dark:border-surface-border rounded">
                <span className="font-medium capitalize">{type}</span>
                <p className="text-xs text-gray-500 dark:text-text-secondary">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Export Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Exports include all data for the selected date range and report type. 
            Large exports may take a few moments to generate.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
