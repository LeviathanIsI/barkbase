import { useState } from 'react';
import { X, Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';

const criteriaCategories = [
  {
    id: 'data-events',
    name: 'Data events',
    criteria: [
      { id: 'list-membership-changed', label: 'List membership changed', description: 'Added to or removed from a list' },
      { id: 'property-value-changed', label: 'Property value changed', description: 'Field value updated' },
      { id: 'record-created', label: 'Record created', description: 'New record added to system' },
    ],
  },
  {
    id: 'workflow-events',
    name: 'Workflow events',
    criteria: [
      { id: 'enrolled-in-workflow', label: 'Enrolled in workflow', description: 'Added to another workflow' },
      { id: 'unenrolled-from-workflow', label: 'Unenrolled from workflow', description: 'Removed from another workflow' },
    ],
  },
  {
    id: 'object-info',
    name: 'Object information',
    criteria: [
      { id: 'pet-properties', label: 'Pet properties', description: 'Filter by pet attributes' },
      { id: 'owner-properties', label: 'Owner properties', description: 'Filter by owner attributes' },
      { id: 'booking-properties', label: 'Booking properties', description: 'Filter by booking attributes' },
    ],
  },
  {
    id: 'dates',
    name: 'Date properties',
    criteria: [
      { id: 'check-in-date', label: 'Check-in date', description: 'Booking check-in date' },
      { id: 'check-out-date', label: 'Check-out date', description: 'Booking check-out date' },
      { id: 'vaccination-date', label: 'Vaccination expiry', description: 'Vaccine expiration date' },
      { id: 'last-visit-date', label: 'Last visit date', description: 'Date of most recent stay' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing interactions',
    criteria: [
      { id: 'custom-events', label: 'Custom Events', description: 'Track custom event occurrences' },
      { id: 'email-interaction', label: 'Email interaction', description: 'Email sent, opened, clicked' },
      { id: 'sms-interaction', label: 'SMS interaction', description: 'Text sent or replied to' },
    ],
  },
];

const CriteriaSelector = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState('Pet'); // Default filtering object

  const filteredCategories = criteriaCategories.map(category => ({
    ...category,
    criteria: category.criteria.filter(c =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.criteria.length > 0);

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
            <div key={category.id}>
              <h4 className="text-sm font-semibold text-text mb-2">{category.name}</h4>
              <div className="space-y-1">
                {category.criteria.map((criteria) => (
                  <button
                    key={criteria.id}
                    onClick={() => onSelect({
                      type: criteria.id,
                      label: criteria.label,
                      description: criteria.description,
                    })}
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
    </Modal>
  );
};

export default CriteriaSelector;
