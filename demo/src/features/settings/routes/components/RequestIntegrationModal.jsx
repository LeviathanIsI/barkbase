import { useState } from 'react';
import { X, MessageSquare, ThumbsUp } from 'lucide-react';
import Button from '@/components/ui/Button';

const RequestIntegrationModal = ({ isOpen, onClose }) => {
  const [integrationName, setIntegrationName] = useState('');
  const [useCase, setUseCase] = useState('');

  const requestedIntegrations = [
    { name: 'PetDesk', votes: 23, status: 'in-progress', description: 'Client communication platform for vet clinics' },
    { name: 'enterprise', votes: 18, status: 'requested', description: 'CRM and marketing automation' },
    { name: 'Salesforce', votes: 12, status: 'requested', description: 'Enterprise CRM platform' },
    { name: 'ServiceM8', votes: 9, status: 'requested', description: 'Field service management' }
  ];

  const handleSubmit = () => {
    // TODO: Submit integration request
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Request New Integration</h2>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Suggest an integration you'd like to see</p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Integration Name *
              </label>
              <input
                type="text"
                value={integrationName}
                onChange={(e) => setIntegrationName(e.target.value)}
                placeholder="e.g., Acuity Scheduling, Gingr, etc."
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                How would you use it?
              </label>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe your use case and why this integration would be valuable..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Most Requested */}
          <div className="border-t border-gray-200 dark:border-surface-border pt-6">
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">Most Requested Integrations</h3>
            <div className="space-y-3">
              {requestedIntegrations.map((integration, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-text-primary">{integration.name}</span>
                      {integration.status === 'in-progress' && (
                        <span className="text-xs bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                          In Progress ✓
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">{integration.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-text-secondary">
                      <ThumbsUp className="w-4 h-4" />
                      {integration.votes}
                    </div>
                    {integration.status === 'requested' && (
                      <Button size="sm" variant="outline">
                        Vote
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Button variant="outline">
                View All Requests & Vote
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-[var(--bb-space-6)] border-t border-[var(--bb-color-border-subtle)]">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            We'll review your request and may reach out for more details
          </p>
          <div className="flex gap-[var(--bb-space-3)]">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!integrationName.trim()}>
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestIntegrationModal;
