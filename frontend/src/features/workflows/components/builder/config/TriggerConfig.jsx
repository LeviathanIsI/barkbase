/**
 * TriggerConfig - Configuration panel for workflow trigger
 */
import { cn } from '@/lib/cn';
import {
  TRIGGER_TYPE_CONFIG,
  TRIGGER_EVENT_CATEGORIES,
  OBJECT_TYPE_CONFIG,
} from '../../../constants';

export default function TriggerConfig({
  entryCondition,
  objectType,
  onChange,
}) {
  const triggerType = entryCondition?.triggerType;

  // Handle trigger type change
  const handleTriggerTypeChange = (newType) => {
    onChange({
      ...entryCondition,
      triggerType: newType,
      eventType: null,
      filterConfig: null,
      scheduleConfig: null,
    });
  };

  // Handle event type change
  const handleEventTypeChange = (eventType) => {
    onChange({
      ...entryCondition,
      eventType,
    });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Trigger type selection */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
          Trigger Type
        </label>
        <div className="space-y-2">
          {Object.entries(TRIGGER_TYPE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleTriggerTypeChange(type)}
              className={cn(
                "w-full px-3 py-2 rounded-md text-left",
                "border transition-colors",
                triggerType === type
                  ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
                  : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]"
              )}
            >
              <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                {config.label}
              </div>
              <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                {config.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Event type selection (if event trigger) */}
      {triggerType === 'event' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
            Event Type
          </label>
          <select
            value={entryCondition?.eventType || ''}
            onChange={(e) => handleEventTypeChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          >
            <option value="">Select an event...</option>
            {Object.entries(TRIGGER_EVENT_CATEGORIES).map(([key, category]) => (
              <optgroup key={key} label={category.label}>
                {category.events.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* Manual trigger info */}
      {triggerType === 'manual' && (
        <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)] text-sm text-[var(--bb-color-text-tertiary)]">
          Records will only be enrolled in this workflow manually.
          You can enroll records from the workflow details page or via the API.
        </div>
      )}

      {/* Filter criteria placeholder */}
      {triggerType === 'filter_criteria' && (
        <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)] text-sm text-[var(--bb-color-text-tertiary)]">
          Filter criteria configuration coming soon.
          Records that match your filter will automatically be enrolled.
        </div>
      )}

      {/* Schedule placeholder */}
      {triggerType === 'schedule' && (
        <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)] text-sm text-[var(--bb-color-text-tertiary)]">
          Schedule configuration coming soon.
          The workflow will run on the specified schedule.
        </div>
      )}

      {/* Object type info */}
      {objectType && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
          <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
            Object Type
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: OBJECT_TYPE_CONFIG[objectType]?.color }}
            />
            <span className="text-sm text-[var(--bb-color-text-primary)]">
              {OBJECT_TYPE_CONFIG[objectType]?.label || objectType}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
