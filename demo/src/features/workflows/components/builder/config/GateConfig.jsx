/**
 * GateConfig - Configuration panel for gate steps
 * Similar to determinator but without branching - just pass/fail
 * Uses ConditionBuilder for property-based filtering
 */
import { cn } from '@/lib/cn';
import ConditionBuilder from './ConditionBuilder';

export default function GateConfig({ step, objectType, onChange }) {
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
          Records that <strong>do not match</strong> these conditions will be
          removed from the workflow at this point.
        </div>
      </div>

      {/* Conditions using ConditionBuilder */}
      <ConditionBuilder
        objectType={objectType}
        conditions={conditions}
        onChange={handleConditionsChange}
        label="Continue if"
      />
    </div>
  );
}
