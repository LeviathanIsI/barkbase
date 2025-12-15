/**
 * ConditionBuilder
 * Builds filter conditions with AND/OR logic
 * Used by TriggerConfig (filter_criteria) and DeterminatorConfig
 */
import { Plus, Trash2 } from 'lucide-react';
import {
  OBJECT_PROPERTIES,
  CONDITION_OPERATORS,
} from '../../../constants';
import PropertyValueInput, { PropertyMultiValueInput } from './PropertyValueInput';

// Operators that need multiple values
const MULTI_VALUE_OPERATORS = [
  'is_equal_to_any',
  'is_not_equal_to_any',
  'contains_any',
  'does_not_contain_any',
  'starts_with_any',
  'ends_with_any',
  'is_any_of',
  'is_none_of',
];

// Operators that need two values (range)
const RANGE_OPERATORS = ['is_between', 'is_not_between'];

// Operators that need no value
const NO_VALUE_OPERATORS = ['is_known', 'is_unknown', 'is_true', 'is_false'];

/**
 * Single condition row
 */
function ConditionRow({
  condition,
  objectType,
  onChange,
  onRemove,
  isFirst,
  logicOperator,
  onLogicChange,
}) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  const selectedProperty = properties.find(p => p.name === condition.field);
  const propertyType = selectedProperty?.type || 'text';
  const operators = CONDITION_OPERATORS[propertyType] || CONDITION_OPERATORS.text;

  const handleFieldChange = (field) => {
    onChange({ ...condition, field, operator: '', value: '', values: [] });
  };

  const handleOperatorChange = (operator) => {
    onChange({ ...condition, operator, value: '', values: [] });
  };

  const handleValueChange = (value) => {
    onChange({ ...condition, value });
  };

  const handleValuesChange = (values) => {
    onChange({ ...condition, values });
  };

  const handleRangeChange = (key, val) => {
    onChange({ ...condition, [key]: val });
  };

  const needsValue = condition.operator && !NO_VALUE_OPERATORS.includes(condition.operator);
  const needsMultiValue = MULTI_VALUE_OPERATORS.includes(condition.operator);
  const needsRange = RANGE_OPERATORS.includes(condition.operator);

  return (
    <div style={conditionRowStyles}>
      {/* Logic operator (AND/OR) - shown for non-first rows */}
      {!isFirst && (
        <div style={logicSelectorStyles}>
          <select
            value={logicOperator}
            onChange={(e) => onLogicChange(e.target.value)}
            style={logicSelectStyles}
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
        </div>
      )}

      <div style={conditionFieldsStyles}>
        {/* Property selector */}
        <div style={fieldGroupStyles}>
          <select
            value={condition.field || ''}
            onChange={(e) => handleFieldChange(e.target.value)}
            style={selectStyles}
          >
            <option value="">Select property...</option>
            {properties.map((prop) => (
              <option key={prop.name} value={prop.name}>
                {prop.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator selector */}
        {condition.field && (
          <div style={fieldGroupStyles}>
            <select
              value={condition.operator || ''}
              onChange={(e) => handleOperatorChange(e.target.value)}
              style={selectStyles}
            >
              <option value="">Select operator...</option>
              {operators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Value input */}
        {needsValue && !needsMultiValue && !needsRange && (
          <div style={fieldGroupStyles}>
            <PropertyValueInput
              property={selectedProperty}
              value={condition.value}
              onChange={handleValueChange}
              placeholder="Enter value..."
            />
          </div>
        )}

        {/* Multi-value input */}
        {needsMultiValue && (
          <div style={fieldGroupStyles}>
            <PropertyMultiValueInput
              property={selectedProperty}
              values={condition.values || []}
              onChange={handleValuesChange}
              placeholder="Add value..."
            />
          </div>
        )}

        {/* Range inputs */}
        {needsRange && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PropertyValueInput
              property={selectedProperty}
              value={condition.rangeStart}
              onChange={(val) => handleRangeChange('rangeStart', val)}
              placeholder="From..."
            />
            <span style={{ color: 'var(--bb-color-text-muted, #888)' }}>and</span>
            <PropertyValueInput
              property={selectedProperty}
              value={condition.rangeEnd}
              onChange={(val) => handleRangeChange('rangeEnd', val)}
              placeholder="To..."
            />
          </div>
        )}

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          style={removeButtonStyles}
          title="Remove condition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Condition group (for nested AND/OR)
 */
function ConditionGroup({
  group,
  objectType,
  onChange,
  depth = 0,
}) {
  const { logic = 'and', conditions = [] } = group;

  const handleLogicChange = (newLogic) => {
    onChange({ ...group, logic: newLogic });
  };

  const handleConditionChange = (index, updatedCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updatedCondition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleConditionRemove = (index) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions: newConditions });
  };

  const handleAddCondition = () => {
    onChange({
      ...group,
      conditions: [...conditions, { field: '', operator: '', value: '' }],
    });
  };

  return (
    <div style={{ ...groupContainerStyles, marginLeft: depth > 0 ? '20px' : 0 }}>
      {conditions.map((condition, index) => (
        <ConditionRow
          key={index}
          condition={condition}
          objectType={objectType}
          onChange={(updated) => handleConditionChange(index, updated)}
          onRemove={() => handleConditionRemove(index)}
          isFirst={index === 0}
          logicOperator={logic}
          onLogicChange={handleLogicChange}
        />
      ))}

      <button
        type="button"
        onClick={handleAddCondition}
        style={addConditionButtonStyles}
      >
        <Plus size={14} />
        Add condition
      </button>
    </div>
  );
}

/**
 * Main ConditionBuilder component
 */
export default function ConditionBuilder({
  objectType,
  conditions = { logic: 'and', conditions: [] },
  onChange,
  label = 'Filter conditions',
}) {
  // Initialize with empty condition if none exist
  const currentConditions = conditions.conditions?.length > 0
    ? conditions
    : { logic: 'and', conditions: [{ field: '', operator: '', value: '' }] };

  return (
    <div style={containerStyles}>
      {label && <label style={labelStyles}>{label}</label>}
      <ConditionGroup
        group={currentConditions}
        objectType={objectType}
        onChange={onChange}
      />
    </div>
  );
}

// Styles
const containerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const labelStyles = {
  fontSize: '14px',
  fontWeight: '500',
  color: 'var(--bb-color-text, #ffffff)',
  marginBottom: '4px',
};

const groupContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '12px',
  backgroundColor: 'var(--bb-color-bg-subtle, #1a1a1a)',
  borderRadius: '8px',
  border: '1px solid var(--bb-color-border, #3a3a3a)',
};

const conditionRowStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const logicSelectorStyles = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '4px',
};

const logicSelectStyles = {
  padding: '4px 8px',
  backgroundColor: 'var(--bb-color-primary, #3B82F6)',
  border: 'none',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
};

const conditionFieldsStyles = {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const fieldGroupStyles = {
  flex: '1 1 200px',
  minWidth: '150px',
};

const selectStyles = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'var(--bb-color-input-bg, #2a2a2a)',
  border: '1px solid var(--bb-color-border, #3a3a3a)',
  borderRadius: '6px',
  color: 'var(--bb-color-text, #ffffff)',
  fontSize: '14px',
  cursor: 'pointer',
};

const removeButtonStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  backgroundColor: 'transparent',
  border: '1px solid var(--bb-color-border, #3a3a3a)',
  borderRadius: '6px',
  color: 'var(--bb-color-text-muted, #888)',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const addConditionButtonStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  backgroundColor: 'transparent',
  border: '1px dashed var(--bb-color-border, #3a3a3a)',
  borderRadius: '6px',
  color: 'var(--bb-color-primary, #3B82F6)',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  alignSelf: 'flex-start',
};
