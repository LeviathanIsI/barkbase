import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const ServiceCreationModal = ({ isOpen, onClose, category, existingService, onSubmit }) => {
  const [serviceName, setServiceName] = useState(existingService?.name || '');
  const [description, setDescription] = useState(existingService?.description || '');
  const [basePrice, setBasePrice] = useState(existingService?.basePrice || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: serviceName,
      description,
      basePrice: parseFloat(basePrice),
      category
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
              {existingService ? 'Edit Service' : 'Create Service'}
            </h2>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Service Name *
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Base Price *
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-[var(--bb-space-3)] p-[var(--bb-space-6)] border-t border-[var(--bb-color-border-subtle)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {existingService ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCreationModal;
