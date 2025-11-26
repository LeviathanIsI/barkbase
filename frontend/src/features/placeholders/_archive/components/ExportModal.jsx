import { X, Download, FileText, Mail, Cloud } from 'lucide-react';
import Button from '@/components/ui/Button';

const ExportModal = ({ report, data, isOpen, onClose }) => {
  if (!isOpen || !report || !data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Export Report</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">{data.title} - {data.period}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">FORMAT</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input type="radio" name="format" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">PDF (for printing/sharing)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="format" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Excel (.xlsx) - Editable spreadsheet</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="format" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">CSV (.csv) - Import into other systems</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="radio" name="format" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Google Sheets - Direct export to Google Drive</span>
              </label>
            </div>
          </div>

          {/* Include Options */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">INCLUDE</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Summary page</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Charts and graphs</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Detailed transaction list</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Customer breakdown</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Raw data (all fields)</span>
              </label>
            </div>
          </div>

          {/* Delivery Method */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">DELIVERY METHOD</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="radio" name="delivery" defaultChecked className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Download now</span>
              </label>

              <div className="ml-6 space-y-2">
                <label className="flex items-center gap-3">
                  <input type="radio" name="delivery" className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm">Email to:</span>
                </label>
                <input
                  type="email"
                  placeholder="owner@happypaws.com"
                  className="ml-6 w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                />
                <button className="ml-6 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300">
                  + Add recipient
                </button>
              </div>

              <label className="flex items-center gap-3">
                <input type="radio" name="delivery" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Save to Google Drive</span>
              </label>
              <div className="ml-6">
                <span className="text-sm text-gray-600 dark:text-text-secondary">Folder: /Reports/Revenue/</span>
                <button className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300">
                  Select Folder
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">ADVANCED OPTIONS</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Password protect PDF</span>
              </label>
              <div className="ml-6">
                <input
                  type="password"
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                  disabled
                />
              </div>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Include comparison to previous period</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Add facility branding (logo, colors)</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Anonymize customer names (for sharing)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
