import { X, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

const IntegrationManagementModal = ({ isOpen, onClose, integration }) => {
  if (!isOpen || !integration) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
              Manage {integration.name}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-900">✅ Connected & Syncing</div>
                <div className="text-sm text-green-700">Last sync: 2 minutes ago • Next sync: Real-time</div>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="text-center text-gray-600 dark:text-text-secondary">
            <p>Integration management interface coming soon.</p>
            <p className="text-sm mt-2">You'll be able to monitor sync activity, manage settings, and troubleshoot issues here.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationManagementModal;
