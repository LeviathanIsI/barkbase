/**
 * ConditionBuilder
 * Builds filter conditions with multiple groups
 * - AND logic within each group
 * - OR logic between groups
 * Used by TriggerConfig (filter_criteria), DeterminatorConfig, and GoalConfig
 */
import { Plus, Trash2, X } from 'lucide-react';
import {
  OBJECT_PROPERTIES,
  CONDITION_OPERATORS,
} from '../../../constants';
import PropertyValueInput, { PropertyMultiValueInput } from './PropertyValueInput';
import { normalizeConditionConfig } from './conditionUtils';

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
  canRemove,
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
              operator={condition.operator}
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
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={removeButtonStyles}
            title="Remove condition"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Single condition group (with AND logic within)
 */
function ConditionGroupCard({
  group,
  groupIndex,
  objectType,
  onChange,
  onRemove,
  canRemove,
}) {
  const { conditions = [] } = group;

  const handleConditionChange = (condIndex, updatedCondition) => {
    const newConditions = [...conditions];
    newConditions[condIndex] = updatedCondition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleConditionRemove = (condIndex) => {
    const newConditions = conditions.filter((_, i) => i !== condIndex);
    onChange({ ...group, conditions: newConditions });
  };

  const handleAddCondition = () => {
    onChange({
      ...group,
      conditions: [...conditions, { field: '', operator: '', value: '' }],
    });
  };

  // Can remove condition if there's more than one condition OR if there's more than one group
  const canRemoveCondition = conditions.length > 1 || canRemove;

  return (
    <div style={groupCardStyles}>
      {/* Group header */}
      <div style={groupHeaderStyles}>
        <span style={groupTitleStyles}>
          Group {groupIndex + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={groupRemoveStyles}
            title="Remove group"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Conditions within group */}
      <div style={groupConditionsStyles}>
        {conditions.map((condition, condIndex) => (
          <div key={condIndex}>
            {/* AND divider within group */}
            {condIndex > 0 && (
              <div style={andDividerStyles}>
                <span style={andTextStyles}>and</span>
                <div style={andLineStyles} />
              </div>
            )}

            <ConditionRow
              condition={condition}
              objectType={objectType}
              onChange={(updated) => handleConditionChange(condIndex, updated)}
              onRemove={() => handleConditionRemove(condIndex)}
              canRemove={canRemoveCondition}
            />
          </div>
        ))}
      </div>

      {/* Add condition button */}
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
  conditions,
  onChange,
  label = 'Filter conditions',
}) {
  // Normalize to new groups format
  const normalizedConfig = normalizeConditionConfig(conditions);
  const groups = normalizedConfig.groups;

  // Add a new group
  const handleAddGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      logic: 'and',
      conditions: [{ field: '', operator: '', value: '' }],
    };
    onChange({
      ...normalizedConfig,
      groups: [...groups, newGroup],
    });
  };

  // Remove a group
  const handleRemoveGroup = (groupId) => {
    if (groups.length <= 1) return; // Keep at least one group
    onChange({
      ...normalizedConfig,
      groups: groups.filter(g => g.id !== groupId),
    });
  };

  // Update a group
  const handleUpdateGroup = (groupId, updatedGroup) => {
    onChange({
      ...normalizedConfig,
      groups: groups.map(g => g.id === groupId ? updatedGroup : g),
    });
  };

  return (
    <div style={containerStyles}>
      {label && <label style={labelStyles}>{label}</label>}

      <div style={groupsContainerStyles}>
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            {/* OR divider between groups */}
            {groupIndex > 0 && (
              <div style={orDividerStyles}>
                <div style={orLineStyles} />
                <span style={orTextStyles}>OR</span>
                <div style={orLineStyles} />
              </div>
            )}

            <ConditionGroupCard
              group={group}
              groupIndex={groupIndex}
              objectType={objectType}
              onChange={(updated) => handleUpdateGroup(group.id, updated)}
              onRemove={() => handleRemoveGroup(group.id)}
              canRemove={groups.length > 1}
            />
          </div>
        ))}

        {/* Add group button */}
        <button
          type="button"
          onClick={handleAddGroup}
          style={addGroupButtonStyles}
        >
          <Plus size={14} />
          Add group (OR)
        </button>
      </div>
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

const groupsContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
};

const groupCardStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '12px',
  backgroundColor: 'var(--bb-color-bg-subtle, #1a1a1a)',
  borderRadius: '8px',
  border: '1px solid var(--bb-color-border, #3a3a3a)',
};

const groupHeaderStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const groupTitleStyles = {
  fontSize: '12px',
  fontWeight: '500',
  color: 'var(--bb-color-text-secondary, #888)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const groupRemoveStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '4px',
  color: 'var(--bb-color-text-muted, #666)',
  cursor: 'pointer',
  transition: 'color 0.2s',
};

const groupConditionsStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const conditionRowStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
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

const andDividerStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  margin: '8px 0',
};

const andTextStyles = {
  fontSize: '11px',
  fontWeight: '500',
  color: 'var(--bb-color-text-tertiary, #666)',
  textTransform: 'lowercase',
};

const andLineStyles = {
  flex: 1,
  height: '1px',
  backgroundColor: 'var(--bb-color-border, #3a3a3a)',
};

const orDividerStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  margin: '16px 0',
};

const orLineStyles = {
  flex: 1,
  height: '1px',
  backgroundColor: 'var(--bb-color-border, #3a3a3a)',
};

const orTextStyles = {
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--bb-color-warning, #F59E0B)',
  backgroundColor: 'var(--bb-color-bg-body, #0d0d0d)',
  padding: '4px 12px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const addGroupButtonStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  marginTop: '12px',
  backgroundColor: 'transparent',
  border: '1px dashed var(--bb-color-border, #3a3a3a)',
  borderRadius: '8px',
  color: 'var(--bb-color-text-secondary, #888)',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
