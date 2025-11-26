import { Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const ExportModal = ({ report, data, isOpen, onClose }) => {
  if (!report || !data) return null;

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button>
        <Download className="w-4 h-4 mr-2" />
        Export Report
      </Button>
    </>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Export Report"
      description={`${data.title} - ${data.period}`}
      size="lg"
      footer={footer}
    >
      <div className="space-y-6">
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
                <Button variant="link" size="sm" className="ml-6">
                  + Add recipient
                </Button>
              </div>

              <label className="flex items-center gap-3">
                <input type="radio" name="delivery" className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Save to Google Drive</span>
              </label>
              <div className="ml-6">
                <span className="text-sm text-gray-600 dark:text-text-secondary">Folder: /Reports/Revenue/</span>
                <Button variant="link" size="sm" className="ml-2">
                  Select Folder
                </Button>
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

      </div>
    </Modal>
  );
};

export default ExportModal;
