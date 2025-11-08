import { useState } from 'react';
import { X, Download, Upload, Settings, FileText, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';

const ImportExportModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('export');

  const tabs = [
    { id: 'export', label: 'Export', icon: Download },
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'sync', label: 'Sync', icon: ExternalLink }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Advanced Options</h2>
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
                Import, export, and sync your custom properties
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-surface-border">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Export Properties</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                  Download all property definitions as JSON or CSV files.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">JSON Export</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary">Complete property definitions</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </div>

                <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">CSV Export</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary">Spreadsheet compatible</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What's included:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Property names and labels</li>
                  <li>• Field types and options</li>
                  <li>• Display settings and permissions</li>
                  <li>• Groups and conditional logic</li>
                  <li>• Usage statistics</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Import Properties</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                  Upload property definitions from JSON or CSV files.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-surface-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Drop files here or click to upload</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                  Supports JSON and CSV files exported from BarkBase or other systems
                </p>
                <Button variant="outline">
                  Choose File
                </Button>
              </div>

              <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Import Options:</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Overwrite existing properties with same name</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">Import property groups</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">Import conditional logic rules</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Sync with External Systems</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                  Connect with veterinary software and other systems to sync property definitions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">Vet Software Sync</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary">Sync with your veterinary practice management software</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Configure Sync
                  </Button>
                </div>

                <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <ExternalLink className="w-6 h-6 text-orange-600" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">API Integration</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary">Sync with other business systems</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Setup Integration
                  </Button>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Benefits of Sync:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Automatic field updates from vet software</li>
                  <li>• Consistent data across all systems</li>
                  <li>• Reduced manual data entry</li>
                  <li>• Real-time synchronization</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportExportModal;
