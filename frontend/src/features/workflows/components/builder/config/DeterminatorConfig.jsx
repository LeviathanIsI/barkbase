/**
 * DeterminatorConfig - Configuration panel for determinator (if/then) steps
 * Uses ConditionBuilder for property-based filtering
 */
import { cn } from '@/lib/cn';
import ConditionBuilder from './ConditionBuilder';

export default function DeterminatorConfig({ step, objectType, onChange }) {
  const config = step.config || {};
  const conditions = config.conditions || { logic: 'and', conditions: [] };

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

  // Handle conditions change from ConditionBuilder
  const handleConditionsChange = (newConditions) => {
    handleConfigChange('conditions', newConditions);
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

      {/* Conditions using ConditionBuilder */}
      <ConditionBuilder
        objectType={objectType}
        conditions={conditions}
        onChange={handleConditionsChange}
        label="Conditions"
      />
    </div>
  );
}
