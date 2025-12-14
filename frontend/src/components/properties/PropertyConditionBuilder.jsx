import { useState } from 'react';
import { X } from 'lucide-react';
import PropertySelector from './PropertySelector';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

// Operators based on property type
const OPERATORS_BY_TYPE = {
  string: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'has_ever_been_equal_to', label: 'has ever been equal to' },
    { value: 'has_never_been_equal_to', label: 'has never been equal to' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  number: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_less_than', label: 'is less than' },
    { value: 'is_less_than_or_equal_to', label: 'is less than or equal to' },
    { value: 'is_greater_than', label: 'is greater than' },
    { value: 'is_greater_than_or_equal_to', label: 'is greater than or equal to' },
    { value: 'is_between', label: 'is between' },
    { value: 'has_ever_been_equal_to', label: 'has ever been equal to' },
    { value: 'has_never_been_equal_to', label: 'has never been equal to' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  currency: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_less_than', label: 'is less than' },
    { value: 'is_less_than_or_equal_to', label: 'is less than or equal to' },
    { value: 'is_greater_than', label: 'is greater than' },
    { value: 'is_greater_than_or_equal_to', label: 'is greater than or equal to' },
    { value: 'is_between', label: 'is between' },
    { value: 'has_ever_been_equal_to', label: 'has ever been equal to' },
    { value: 'has_never_been_equal_to', label: 'has never been equal to' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  date: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
    { value: 'was_updated_after_property', label: 'was updated after property' },
    { value: 'was_updated_before_property', label: 'was updated before property' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  datetime: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
    { value: 'was_updated_after_property', label: 'was updated after property' },
    { value: 'was_updated_before_property', label: 'was updated before property' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  enum: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_none_of', label: 'is none of' },
    { value: 'has_ever_been_equal_to', label: 'has ever been equal to' },
    { value: 'has_never_been_equal_to', label: 'has never been equal to' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  multi_enum: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_none_of', label: 'is none of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  email: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  phone: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
  url: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
  ],
};

/**
 * PropertyConditionBuilder - Build filter conditions for workflows and queries
 * Supports all property types with appropriate operators
 */
const PropertyConditionBuilder = ({
  objectType,
  condition = null,
  onChange,
  onRemove,
  showRemove = true,
  className = '',
}) => {
  const [showPropertySelector, setShowPropertySelector] = useState(!condition?.property);
  const [selectedProperty, setSelectedProperty] = useState(condition?.property || null);
  const [operator, setOperator] = useState(condition?.operator || '');
  const [value, setValue] = useState(condition?.value || '');

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
    setShowPropertySelector(false);
    setOperator('');
    setValue('');

    if (onChange) {
      onChange({
        property,
        operator: '',
        value: '',
      });
    }
  };

  const handleOperatorChange = (newOperator) => {
    setOperator(newOperator);

    // Clear value for operators that don't need a value
    const needsValue = !['is_unknown', 'is_known', 'is_true', 'is_false'].includes(newOperator);
    const newValue = needsValue ? value : '';
    setValue(newValue);

    if (onChange) {
      onChange({
        property: selectedProperty,
        operator: newOperator,
        value: newValue,
      });
    }
  };

  const handleValueChange = (newValue) => {
    setValue(newValue);

    if (onChange) {
      onChange({
        property: selectedProperty,
        operator,
        value: newValue,
      });
    }
  };

  const operators = selectedProperty
    ? OPERATORS_BY_TYPE[selectedProperty.type] || OPERATORS_BY_TYPE.string
    : [];

  const needsValue = operator && !['is_unknown', 'is_known', 'is_true', 'is_false'].includes(operator);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-3">
          {/* Property Selector */}
          {showPropertySelector ? (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select property
              </label>
              <PropertySelector
                objectType={objectType}
                selectedProperty={selectedProperty}
                onSelect={handlePropertySelect}
                className="max-w-md"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Property
              </label>
              <button
                onClick={() => setShowPropertySelector(true)}
                className="w-full text-left px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text hover:border-primary transition-colors"
              >
                {selectedProperty?.label || 'Select property...'}
              </button>
            </div>
          )}

          {/* Operator Selector */}
          {selectedProperty && !showPropertySelector && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Operator
              </label>
              <StyledSelect
                options={[
                  { value: '', label: 'Select operator...' },
                  ...operators.map((op) => ({ value: op.value, label: op.label })),
                ]}
                value={operator}
                onChange={(opt) => handleOperatorChange(opt?.value || '')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          )}

          {/* Value Input */}
          {needsValue && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Value
              </label>
              {selectedProperty?.type === 'enum' && selectedProperty?.options?.choices ? (
                <StyledSelect
                  options={[
                    { value: '', label: 'Select value...' },
                    ...selectedProperty.options.choices.map((choice) => ({
                      value: choice,
                      label: choice,
                    })),
                  ]}
                  value={value}
                  onChange={(opt) => handleValueChange(opt?.value || '')}
                  isClearable={false}
                  isSearchable={false}
                />
              ) : selectedProperty?.type === 'date' ? (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : selectedProperty?.type === 'datetime' ? (
                <input
                  type="datetime-local"
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : selectedProperty?.type === 'number' || selectedProperty?.type === 'currency' ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Enter value..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Enter value..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}
            </div>
          )}
        </div>

        {/* Remove Button */}
        {showRemove && (
          <button
            onClick={onRemove}
            className="mt-8 p-2 text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Remove condition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PropertyConditionBuilder;
