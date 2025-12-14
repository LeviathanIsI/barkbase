/**
 * DeterminatorConfig - Configuration panel for determinator (if/then) steps
 */
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { CONDITION_OPERATORS } from '../../../constants';

export default function DeterminatorConfig({ step, onChange }) {
  const config = step.config || {};
  const conditions = config.conditions || [];
  const conditionLogic = config.conditionLogic || 'and';

  // Handle config change
  const handleConfigChange = (field, value) => {
    onChange({
      config: {
        ...config,
        [field]: value,
      },
    });
  };

  // Handle name change
  const handleNameChange = (name) => {
    onChange({ name });
  };

  // Add a new condition
  const handleAddCondition = () => {
    handleConfigChange('conditions', [
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: '',
        operator: 'equals',
        value: '',
        type: 'text',
      },
    ]);
  };

  // Update a condition
  const handleUpdateCondition = (index, updates) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    handleConfigChange('conditions', newConditions);
  };

  // Remove a condition
  const handleRemoveCondition = (index) => {
    handleConfigChange('conditions', conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Step name */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Step Name
        </label>
        <input
          type="text"
          value={step.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Info */}
      <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)]">
        <div className="text-sm text-[var(--bb-color-text-secondary)]">
          Records that match these conditions will follow the <strong className="text-[#10B981]">Yes</strong> branch.
          Others will follow the <strong className="text-[#EF4444]">No</strong> branch.
        </div>
      </div>

      {/* Condition logic */}
      {conditions.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
            Match
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleConfigChange('conditionLogic', 'and')}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm",
                "border transition-colors",
                conditionLogic === 'and'
                  ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]"
                  : "border-[var(--bb-color-border-subtle)] text-[var(--bb-color-text-secondary)]"
              )}
            >
              All conditions (AND)
            </button>
            <button
              onClick={() => handleConfigChange('conditionLogic', 'or')}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm",
                "border transition-colors",
                conditionLogic === 'or'
                  ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]"
                  : "border-[var(--bb-color-border-subtle)] text-[var(--bb-color-text-secondary)]"
              )}
            >
              Any condition (OR)
            </button>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
          Conditions
        </label>

        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={condition.id || index}
              condition={condition}
              onUpdate={(updates) => handleUpdateCondition(index, updates)}
              onRemove={() => handleRemoveCondition(index)}
              showLogic={index > 0}
              logic={conditionLogic}
            />
          ))}

          {conditions.length === 0 && (
            <div className="text-sm text-[var(--bb-color-text-tertiary)] text-center py-4">
              No conditions yet. Add one to define the branching logic.
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddCondition}
          className="mt-3"
          leftIcon={<Plus size={14} />}
        >
          Add condition
        </Button>
      </div>
    </div>
  );
}

// Condition row component
function ConditionRow({ condition, onUpdate, onRemove, showLogic, logic }) {
  const operators = CONDITION_OPERATORS[condition.type?.toUpperCase()] || CONDITION_OPERATORS.TEXT;

  return (
    <div className="space-y-2">
      {/* Logic indicator */}
      {showLogic && (
        <div className="text-xs text-[var(--bb-color-text-tertiary)] uppercase">
          {logic}
        </div>
      )}

      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          {/* Field */}
          <input
            type="text"
            value={condition.field || ''}
            onChange={(e) => onUpdate({ field: e.target.value })}
            placeholder="Field name..."
            className={cn(
              "w-full px-3 py-1.5 rounded-md text-sm",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />

          {/* Operator */}
          <select
            value={condition.operator || 'equals'}
            onChange={(e) => onUpdate({ operator: e.target.value })}
            className={cn(
              "w-full px-3 py-1.5 rounded-md text-sm",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value (if operator needs it) */}
          {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(condition.operator) && (
            <input
              type="text"
              value={condition.value || ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Value..."
              className={cn(
                "w-full px-3 py-1.5 rounded-md text-sm",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className={cn(
            "p-1.5 rounded mt-1",
            "text-[var(--bb-color-text-tertiary)]",
            "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-status-negative)]"
          )}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
