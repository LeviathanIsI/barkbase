import { useState } from 'react';
import { X, Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import PropertyCriteriaSelector from './PropertyCriteriaSelector';

const criteriaCategories = [
  { recordId: 'data-events',
    name: 'Data events',
    criteria: [
      { recordId: 'list-membership-changed', label: 'List membership changed', description: 'Added to or removed from a list' },
      { recordId: 'property-value-changed', label: 'Property value changed', description: 'Field value updated' },
      { recordId: 'record-created', label: 'Record created', description: 'New record added to system' },
    ],
  },
  { recordId: 'workflow-events',
    name: 'Workflow events',
    criteria: [
      { recordId: 'enrolled-in-workflow', label: 'Enrolled in workflow', description: 'Added to another workflow' },
      { recordId: 'unenrolled-from-workflow', label: 'Unenrolled from workflow', description: 'Removed from another workflow' },
    ],
  },
  { recordId: 'object-info',
    name: 'Object information',
    criteria: [
      { recordId: 'pet-properties', label: 'Pet properties', description: 'Filter by pet attributes' },
      { recordId: 'owner-properties', label: 'Owner properties', description: 'Filter by owner attributes' },
      { recordId: 'booking-properties', label: 'Booking properties', description: 'Filter by booking attributes' },
    ],
  },
  { recordId: 'dates',
    name: 'Date properties',
    criteria: [
      { recordId: 'check-in-date', label: 'Check-in date', description: 'Booking check-in date' },
      { recordId: 'check-out-date', label: 'Check-out date', description: 'Booking check-out date' },
      { recordId: 'vaccination-date', label: 'Vaccination expiry', description: 'Vaccine expiration date' },
      { recordId: 'last-visit-date', label: 'Last visit date', description: 'Date of most recent stay' },
    ],
  },
  { recordId: 'marketing',
    name: 'Marketing interactions',
    criteria: [
      { recordId: 'custom-events', label: 'Custom Events', description: 'Track custom event occurrences' },
      { recordId: 'email-interaction', label: 'Email interaction', description: 'Email sent, opened, clicked' },
      { recordId: 'sms-interaction', label: 'SMS interaction', description: 'Text sent or replied to' },
    ],
  },
];

const CriteriaSelector = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('Pet'); // Default filtering object
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [selectedPropertyCriteria, setSelectedPropertyCriteria] = useState(null);

  const filteredCategories = criteriaCategories.map(category => ({
    ...category,
    criteria: category.criteria.filter(c =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.criteria.length > 0);

  const handleCriteriaClick = (criteria) => {
    // Check if this is a property-based criteria
    const propertyTypes = ['pet-properties', 'owner-properties', 'booking-properties'];

    if (propertyTypes.includes(criteria.recordId)) {
      // Open property selector
      setSelectedPropertyCriteria(criteria.recordId);
      setShowPropertySelector(true);
    } else {
      // Regular criteria - pass through
      onSelect({
        type: criteria.recordId,
        label: criteria.label,
        description: criteria.description,
      });
    }
  };

  const handlePropertySelect = (propertyCriteria) => {
    onSelect(propertyCriteria);
    setShowPropertySelector(false);
    setSelectedPropertyCriteria(null);
  };

  return (
    <Modal open={true} onClose={onClose}>
      <div className="max-w-2xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text mb-2">Add criteria</h3>
          <p className="text-sm text-muted">Select an event to trigger based on</p>
        </div>

        {/* Object filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">Filtering on</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Pet">Pet (Current Object)</option>
            <option value="Owner">Owner</option>
            <option value="Booking">Booking</option>
            <option value="Invoice">Invoice</option>
          </select>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">Step 1: Select a filter category</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search in filter categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Criteria list */}
        <div className="max-h-96 overflow-y-auto space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.recordId}>
              <h4 className="text-sm font-semibold text-text mb-2">{category.name}</h4>
              <div className="space-y-1">
                {category.criteria.map((criteria) => (
                  <button
                    key={criteria.recordId}
                    onClick={() => handleCriteriaClick(criteria)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-primary/5 border border-transparent hover:border-primary transition-colors"
                  >
                    <div className="text-sm font-medium text-text">{criteria.label}</div>
                    <div className="text-xs text-muted">{criteria.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Property Criteria Selector */}
      {showPropertySelector && selectedPropertyCriteria && (
        <PropertyCriteriaSelector
          criteriaType={selectedPropertyCriteria}
          onSelect={handlePropertySelect}
          onClose={() => {
            setShowPropertySelector(false);
            setSelectedPropertyCriteria(null);
          }}
        />
      )}
    </Modal>
  );
};

export default CriteriaSelector;
