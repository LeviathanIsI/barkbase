import { useState } from 'react';
import { Database, Download, Trash2, AlertTriangle, FileText, Clock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';

const PrivacyControls = () => {
  const user = useAuthStore((state) => state.user);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ email: '', confirmation: '' });

  const handleDataExport = () => {
    // TODO: Implement data export
  };

  const handleAccountDeletion = () => {
    if (deleteConfirm.email !== user?.email ||
        deleteConfirm.confirmation !== 'DELETE') {
      // TODO: Show error
      return;
    }
    // TODO: Implement account deletion
    setShowDeleteModal(false);
  };

  return (
    <>
      <Card title="Privacy & Data Protection" icon={Database}>
        <div className="space-y-6">
          {/* Data Retention */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-2">DATA RETENTION</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              Your data is automatically backed up daily and retained for:
            </p>
            <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active data:</span>
                <span className="font-medium">Indefinitely (while account active)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Deleted data:</span>
                <span className="font-medium">30 days (recoverable)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>After cancellation:</span>
                <span className="font-medium">60 days, then permanently deleted</span>
              </div>
            </div>
          </div>

          {/* Account Deletion */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-2">ACCOUNT DELETION</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              Permanently delete your account and all associated data.
              <strong className="text-red-600"> This action cannot be undone!</strong>
            </p>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:bg-surface-primary"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Request Account Deletion
            </Button>
          </div>

          {/* Data Export */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-2">DATA EXPORT</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              Download all your data in machine-readable format.
            </p>
            <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Includes:</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Customer & pet profiles</li>
                <li>• Booking history</li>
                <li>• Payment records</li>
                <li>• Staff data</li>
                <li>• Settings & configurations</li>
              </ul>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Last export: Never • File size: ~25 MB
              </p>
            </div>
            <Button onClick={handleDataExport}>
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Delete Your Account</h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">⚠️ WARNING: This will permanently delete:</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• All bookings and customer data</li>
                  <li>• All pet records and photos</li>
                  <li>• All team member accounts</li>
                  <li>• All payment history and invoices</li>
                  <li>• All integrations and settings</li>
                </ul>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                  Before deleting, you can download all your data:
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download All My Data (ZIP file, ~25 MB)
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    Type your email to confirm:
                  </label>
                  <input
                    type="email"
                    value={deleteConfirm.email}
                    onChange={(e) => setDeleteConfirm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={user?.email || 'your-email@example.com'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm.confirmation}
                    onChange={(e) => setDeleteConfirm(prev => ({ ...prev, confirmation: e.target.value }))}
                    placeholder="DELETE"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-surface-border">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleAccountDeletion}
                disabled={
                  deleteConfirm.email !== user?.email ||
                  deleteConfirm.confirmation !== 'DELETE'
                }
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Permanently Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PrivacyControls;
