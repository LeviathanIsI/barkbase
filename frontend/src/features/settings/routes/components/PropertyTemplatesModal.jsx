import { useState } from 'react';
import { X, Check, Star, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const PropertyTemplatesModal = ({ isOpen, onClose, objectType, onImportTemplates }) => {
  const [selectedTemplates, setSelectedTemplates] = useState([]);

  const templates = [
    {
      id: 'dietary_restrictions',
      name: 'Pet Dietary Restrictions',
      description: 'Track allergies and special feeding requirements',
      type: 'Multi-select dropdown',
      options: ['None / No restrictions', 'Grain-free diet', 'Chicken allergy', 'Beef allergy'],
      popular: true,
      category: 'health'
    },
    {
      id: 'behavioral_flags',
      name: 'Behavioral Flags',
      description: 'Important temperament and handling notes',
      type: 'Multi-select checkboxes',
      options: ['Dog-reactive', 'Cat-reactive', 'Food aggressive', 'Escape artist', 'Fear aggressive'],
      popular: true,
      category: 'behavior'
    },
    {
      id: 'emergency_contact',
      name: 'Emergency Contact Priority',
      description: 'Backup contacts when owner unavailable',
      type: 'Ordered list',
      fields: ['Name', 'Phone', 'Relationship', 'Pickup authorization'],
      popular: true,
      category: 'emergency'
    },
    {
      id: 'vaccination_exception',
      name: 'Vaccination Exception Reason',
      description: 'Document why pet doesn\'t have standard vaccines',
      type: 'Text area',
      note: 'Used for: Titer test records, vet exemptions',
      popular: true,
      category: 'health'
    },
    {
      id: 'daycare_group',
      name: 'Daycare Group Assignment',
      description: 'Which play group the pet belongs to',
      type: 'Single-select dropdown',
      options: ['Small dogs (<25 lbs)', 'Large dogs (25+ lbs)', 'Puppies (<6 months)', 'Shy/timid', 'Seniors'],
      popular: true,
      category: 'operations'
    },
    {
      id: 'preferred_run',
      name: 'Preferred Run/Room Type',
      description: 'Customer preferences for accommodation',
      type: 'Single-select',
      options: ['No preference', 'Quiet area', 'Near window', 'Indoor only', 'Outdoor preferred'],
      popular: false,
      category: 'preferences'
    }
  ];

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTemplates(templates.map(t => t.id));
  };

  const handleImportSelected = () => {
    const selectedTemplateData = templates.filter(t => selectedTemplates.includes(t.id));
    onImportTemplates(selectedTemplateData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Property Templates</h2>
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
                Quick-start with common properties used by similar facilities
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Popular Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">MOST POPULAR</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.filter(t => t.popular).map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplates.includes(template.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary'
                      : 'border-gray-200 dark:border-surface-border hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                  }`}
                  onClick={() => handleTemplateToggle(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateToggle(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">{template.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">{template.description}</p>
                      <div className="text-xs text-gray-500 dark:text-text-secondary mb-2">
                        Type: {template.type}
                      </div>
                      {template.options && (
                        <div className="text-xs text-gray-500 dark:text-text-secondary">
                          Options: {template.options.slice(0, 3).join(', ')}
                          {template.options.length > 3 && ` (${template.options.length} total)`}
                        </div>
                      )}
                      {template.fields && (
                        <div className="text-xs text-gray-500 dark:text-text-secondary">
                          Fields: {template.fields.join(', ')}
                        </div>
                      )}
                      {template.note && (
                        <div className="text-xs text-orange-600 mt-1">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {template.note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Templates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">ALL TEMPLATES</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.filter(t => !t.popular).map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplates.includes(template.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary'
                      : 'border-gray-200 dark:border-surface-border hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                  }`}
                  onClick={() => handleTemplateToggle(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleTemplateToggle(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">{template.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">{template.description}</p>
                      <div className="text-xs text-gray-500 dark:text-text-secondary">
                        Type: {template.type}
                      </div>
                      {template.options && (
                        <div className="text-xs text-gray-500 dark:text-text-secondary">
                          Options: {template.options.slice(0, 3).join(', ')}
                          {template.options.length > 3 && ` (${template.options.length} total)`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-surface-border">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleSelectAll}
              disabled={selectedTemplates.length === templates.length}
            >
              Select All
            </Button>
            {selectedTemplates.length > 0 && (
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {selectedTemplates.length} selected
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImportSelected}
              disabled={selectedTemplates.length === 0}
            >
              Import Selected ({selectedTemplates.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTemplatesModal;
