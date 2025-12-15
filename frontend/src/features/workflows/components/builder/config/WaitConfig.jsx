/**
 * WaitConfig - Configuration panel for wait steps
 */
import { cn } from '@/lib/cn';
import { WAIT_TYPE_CONFIG, DURATION_UNITS } from '../../../constants';

export default function WaitConfig({ step, onChange }) {
  const config = step.config || {};
  const waitType = config.waitType || 'duration';

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

      {/* Wait type selection */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
          Wait Type
        </label>
        <div className="space-y-2">
          {Object.entries(WAIT_TYPE_CONFIG).map(([type, meta]) => (
            <button
              key={type}
              onClick={() => handleConfigChange('waitType', type)}
              className={cn(
                "w-full px-3 py-2 rounded-md text-left",
                "border transition-colors",
                waitType === type
                  ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
                  : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]"
              )}
            >
              <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                {meta.label}
              </div>
              <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                {meta.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration config */}
      {waitType === 'duration' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
            Wait Duration
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={config.duration || 1}
              onChange={(e) => handleConfigChange('duration', parseInt(e.target.value) || 1)}
              className={cn(
                "w-20 px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
            <select
              value={config.durationUnit || 'days'}
              onChange={(e) => handleConfigChange('durationUnit', e.target.value)}
              className={cn(
                "flex-1 px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            >
              {DURATION_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Time of day config */}
      {waitType === 'until_time' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
            Wait Until
          </label>
          <input
            type="time"
            value={config.timeOfDay || '09:00'}
            onChange={(e) => handleConfigChange('timeOfDay', e.target.value)}
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
        </div>
      )}

      {/* Date field config */}
      {waitType === 'until_date' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
            Date Field
          </label>
          <input
            type="text"
            value={config.dateField || ''}
            onChange={(e) => handleConfigChange('dateField', e.target.value)}
            placeholder="e.g., booking.check_in_date"
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
          <div className="mt-2 text-xs text-[var(--bb-color-text-tertiary)]">
            The workflow will wait until the date stored in this field.
          </div>
        </div>
      )}

      {/* Event config */}
      {waitType === 'until_event' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
          <div className="text-sm text-[var(--bb-color-text-tertiary)]">
            Event-based waiting coming soon.
          </div>
        </div>
      )}
    </div>
  );
}
