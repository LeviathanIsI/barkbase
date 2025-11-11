import { useState } from 'react';
import { X, Check, Star, Eye, Home, Gamepad2, Scissors, Building } from 'lucide-react';
import Button from '@/components/ui/Button';

const IndustryTemplatesModal = ({ isOpen, onClose, onImportTemplates }) => {
  const [selectedTemplates, setSelectedTemplates] = useState([]);

  const templates = [
    {
      id: 'boarding-facility',
      name: 'Boarding Facility',
      icon: Home,
      description: 'Perfect for overnight pet accommodations',
      includes: [
        'Standard boarding (per night)',
        'Suite boarding (premium accommodations)',
        'Cat boarding (separate pricing)',
        'Day boarding (drop-in)',
        'Extended stay discounts (7+ nights)',
        'Holiday surcharges (configurable dates)'
      ],
      serviceCount: 6,
      popular: true
    },
    {
      id: 'daycare-facility',
      name: 'Daycare Facility',
      icon: Gamepad2,
      description: 'For dogs who play during the day',
      includes: [
        'Full day daycare',
        'Half day daycare',
        'Daycare packages (5-day, 10-day, 20-day)',
        'Unlimited monthly membership',
        'Evaluation/temperament test',
        'Group size pricing (small/large dogs)'
      ],
      serviceCount: 6,
      popular: true
    },
    {
      id: 'grooming-salon',
      name: 'Grooming Salon',
      icon: Scissors,
      description: 'Full-service grooming and spa',
      includes: [
        'Bath & brush (size-based pricing)',
        'Full groom with haircut',
        'Nail trim only',
        'Teeth brushing',
        'De-shedding treatment',
        'Breed-specific grooming styles'
      ],
      serviceCount: 6,
      popular: true
    },
    {
      id: 'all-in-one-facility',
      name: 'All-in-One Facility',
      icon: Building,
      description: 'Boarding + Daycare + Grooming + Training',
      includes: [
        'All services from above templates',
        'Bundle discounts (boarding + grooming)',
        'Training classes (group and private)',
        'Add-on services (photos, webcam access)',
        'Membership programs',
        'Holiday and seasonal pricing'
      ],
      serviceCount: 15,
      popular: false
    }
  ];

  const handleTemplateToggle = (templateId) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handlePreviewTemplate = (templateId) => {
    // TODO: Open template preview
  };

  const handleImportSelected = () => {
    const selectedTemplateData = templates.filter(t => selectedTemplates.includes(t.id));
    onImportTemplates(selectedTemplateData);
  };

  const handleStartFromScratch = () => {
    onClose();
    // TODO: Navigate to create service page
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Choose Your Service Template</h2>
              <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
                Start with pre-configured services for your facility type
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
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {templates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplates.includes(template.id);

              return (
                <div
                  key={template.id}
                  className={`border rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary shadow-md' : 'border-gray-200 dark:border-surface-border hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleTemplateToggle(template.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-text-secondary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-text-primary">{template.name}</h3>
                          {template.popular && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-text-secondary">{template.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewTemplate(template.id);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTemplateToggle(template.id)}
                        className="rounded border-gray-300 dark:border-surface-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-text-primary text-sm">Includes:</h4>
                    <ul className="space-y-1">
                      {template.includes.slice(0, 4).map((item, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-text-secondary flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-surface-secondary rounded-full flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                      {template.includes.length > 4 && (
                        <li className="text-sm text-gray-500 dark:text-text-secondary">
                          +{template.includes.length - 4} more services...
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-text-secondary">
                        {template.serviceCount} services included
                      </span>
                      {template.popular && (
                        <span className="text-xs bg-yellow-100 dark:bg-surface-secondary text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                          Most Popular
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection Summary */}
          {selectedTemplates.length > 0 && (
            <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {templates.filter(t => selectedTemplates.includes(t.id)).reduce((sum, t) => sum + t.serviceCount, 0)} services total
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedTemplates([])}>
                    Clear All
                  </Button>
                  <Button onClick={handleImportSelected}>
                    Import Selected ({selectedTemplates.length})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Start from Scratch Option */}
          <div className="border-t border-gray-200 dark:border-surface-border pt-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-text-secondary mb-4">
                Prefer to build your services from scratch?
              </p>
              <Button variant="outline" onClick={handleStartFromScratch}>
                Start from Scratch Instead
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-surface-border">
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            Templates can be customized after import
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

export default IndustryTemplatesModal;
