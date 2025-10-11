import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { PropertySelector, PropertyConditionBuilder } from '@/components/properties';
import Button from '@/components/ui/Button';

const OBJECT_TYPE_MAP = {
  'pet-properties': 'pets',
  'owner-properties': 'owners',
  'booking-properties': 'bookings',
};

/**
 * PropertyCriteriaSelector - Property selection modal for workflow filters
 * Opens when user selects "Pet properties", "Owner properties", etc.
 */
const PropertyCriteriaSelector = ({ criteriaType, onSelect, onClose }) => {
  const objectType = OBJECT_TYPE_MAP[criteriaType];
  const [step, setStep] = useState('select'); // 'select' or 'configure'
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [condition, setCondition] = useState(null);

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setCondition({
      property,
      operator: '',
      value: '',
    });
    setStep('configure');
  };

  const handleConditionChange = (newCondition) => {
    setCondition(newCondition);
  };

  const handleSave = () => {
    if (!condition || !condition.property || !condition.operator) {
      return;
    }

    // Format the condition for display in the workflow
    onSelect({
      type: 'property-condition',
      propertyId: condition.property.id,
      propertyName: condition.property.name,
      propertyLabel: condition.property.label,
      operator: condition.operator,
      value: condition.value,
      objectType,
      label: formatConditionLabel(condition),
      description: formatConditionDescription(condition),
      condition, // Store full condition for editing later
    });

    onClose();
  };

  const formatConditionLabel = (condition) => {
    const operatorLabels = {
      is_equal_to: 'is equal to',
      is_not_equal_to: 'is not equal to',
      contains: 'contains',
      not_contains: 'does not contain',
      starts_with: 'starts with',
      ends_with: 'ends with',
      is_less_than: 'is less than',
      is_less_than_or_equal_to: 'is less than or equal to',
      is_greater_than: 'is greater than',
      is_greater_than_or_equal_to: 'is greater than or equal to',
      is_between: 'is between',
      is_before: 'is before',
      is_after: 'is after',
      has_ever_been_equal_to: 'has ever been equal to',
      has_never_been_equal_to: 'has never been equal to',
      updated_in_last: 'updated in last',
      not_updated_in_last: 'not updated in last',
      was_updated_after_property: 'was updated after property',
      was_updated_before_property: 'was updated before property',
      is_unknown: 'is unknown',
      is_known: 'is known',
      is_true: 'is true',
      is_false: 'is false',
      is_any_of: 'is any of',
      is_none_of: 'is none of',
    };

    const operator = operatorLabels[condition.operator] || condition.operator;
    const needsValue = !['is_unknown', 'is_known', 'is_true', 'is_false'].includes(condition.operator);

    if (needsValue && condition.value) {
      return `${condition.property.label} ${operator} "${condition.value}"`;
    }

    return `${condition.property.label} ${operator}`;
  };

  const formatConditionDescription = (condition) => {
    return `Filter by ${condition.property.label} (${condition.property.type})`;
  };

  const objectTypeLabel = objectType?.charAt(0).toUpperCase() + objectType?.slice(1);

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {step === 'configure' && (
              <button
                onClick={() => setStep('select')}
                className="p-1 hover:bg-surface rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-muted" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-text">
              {step === 'select' ? `Select ${objectTypeLabel} Property` : 'Configure Filter Condition'}
            </h3>
          </div>
          <p className="text-sm text-muted">
            {step === 'select'
              ? `Choose a property to filter ${objectTypeLabel?.toLowerCase()}s by`
              : `Set the condition for ${selectedProperty?.label}`}
          </p>
        </div>

        {/* Content */}
        {step === 'select' ? (
          <PropertySelector
            objectType={objectType}
            selectedProperty={selectedProperty}
            onSelect={handlePropertySelect}
            showSearch={true}
            showObjectSelector={false}
          />
        ) : (
          <div className="space-y-4">
            <PropertyConditionBuilder
              objectType={objectType}
              condition={condition}
              onChange={handleConditionChange}
              showRemove={false}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {step === 'configure' && (
            <Button
              onClick={handleSave}
              disabled={!condition?.operator || (
                !['is_unknown', 'is_known', 'is_true', 'is_false'].includes(condition?.operator) &&
                !condition?.value
              )}
            >
              Add Filter
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PropertyCriteriaSelector;
