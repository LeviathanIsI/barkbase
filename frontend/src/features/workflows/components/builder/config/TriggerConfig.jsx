/**
 * TriggerConfig - Configuration panel for workflow trigger
 * Supports: manual, filter_criteria, schedule, event, property_changed
 */
import { cn } from '@/lib/cn';
import {
  TRIGGER_TYPE_CONFIG,
  TRIGGER_EVENT_CATEGORIES,
  OBJECT_TYPE_CONFIG,
  OBJECT_PROPERTIES,
  PROPERTY_CHANGE_TYPES,
  SCHEDULE_FREQUENCIES,
  DAYS_OF_WEEK_FULL,
  MONTHS,
  DAYS_OF_MONTH,
  COMMON_TIMEZONES,
  getPropertyConfig,
} from '../../../constants';
import ConditionBuilder from './ConditionBuilder';
import PropertyValueInput from './PropertyValueInput';

export default function TriggerConfig({
  entryCondition,
  objectType,
  onChange,
}) {
  const triggerType = entryCondition?.triggerType;
  const eventType = entryCondition?.eventType;

  // Handle trigger type change
  const handleTriggerTypeChange = (newType) => {
    onChange({
      ...entryCondition,
      triggerType: newType,
      eventType: null,
      filterConfig: null,
      scheduleConfig: null,
      propertyConfig: null,
    });
  };

  // Handle event type change
  const handleEventTypeChange = (newEventType) => {
    const config = {
      ...entryCondition,
      eventType: newEventType,
    };
    // Initialize property config if property.changed event
    if (newEventType === 'property.changed') {
      config.propertyConfig = {
        property: '',
        changeType: 'any_change',
        fromValue: '',
        toValue: '',
      };
    } else {
      config.propertyConfig = null;
    }
    onChange(config);
  };

  // Handle filter config change
  const handleFilterConfigChange = (filterConfig) => {
    onChange({
      ...entryCondition,
      filterConfig,
    });
  };

  // Handle schedule config change
  const handleScheduleConfigChange = (field, value) => {
    onChange({
      ...entryCondition,
      scheduleConfig: {
        ...entryCondition?.scheduleConfig,
        [field]: value,
      },
    });
  };

  // Handle property config change
  const handlePropertyConfigChange = (field, value) => {
    onChange({
      ...entryCondition,
      propertyConfig: {
        ...entryCondition?.propertyConfig,
        [field]: value,
      },
    });
  };

  const properties = OBJECT_PROPERTIES[objectType] || [];
  const selectedPropertyConfig = entryCondition?.propertyConfig?.property
    ? getPropertyConfig(objectType, entryCondition.propertyConfig.property)
    : null;

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

      {/* Manual trigger info */}
      {triggerType === 'manual' && (
        <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)] text-sm text-[var(--bb-color-text-tertiary)]">
          Records will only be enrolled in this workflow manually.
          You can enroll records from the workflow details page or via the API.
        </div>
      )}

      {/* Filter criteria config */}
      {triggerType === 'filter' && objectType && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--bb-color-text-secondary)]">
            Enroll {OBJECT_TYPE_CONFIG[objectType]?.pluralLabel?.toLowerCase() || 'records'} when they meet these conditions:
          </div>
          <ConditionBuilder
            objectType={objectType}
            conditions={entryCondition?.filterConfig || { logic: 'and', conditions: [] }}
            onChange={handleFilterConfigChange}
            label={null}
          />
        </div>
      )}

      {/* Schedule config */}
      {triggerType === 'schedule' && (
        <div className="space-y-4">
          {/* Frequency selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
              Frequency
            </label>
            <select
              value={entryCondition?.scheduleConfig?.frequency || ''}
              onChange={(e) => handleScheduleConfigChange('frequency', e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            >
              <option value="">Select frequency...</option>
              {SCHEDULE_FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          {/* Once: Date picker */}
          {entryCondition?.scheduleConfig?.frequency === 'once' && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Date
              </label>
              <input
                type="date"
                value={entryCondition?.scheduleConfig?.date || ''}
                onChange={(e) => handleScheduleConfigChange('date', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              />
            </div>
          )}

          {/* Weekly: Day of week */}
          {entryCondition?.scheduleConfig?.frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Day of Week
              </label>
              <select
                value={entryCondition?.scheduleConfig?.dayOfWeek || ''}
                onChange={(e) => handleScheduleConfigChange('dayOfWeek', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                <option value="">Select day...</option>
                {DAYS_OF_WEEK_FULL.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monthly: Day of month */}
          {entryCondition?.scheduleConfig?.frequency === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Day of Month
              </label>
              <select
                value={entryCondition?.scheduleConfig?.dayOfMonth || ''}
                onChange={(e) => handleScheduleConfigChange('dayOfMonth', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                <option value="">Select day...</option>
                {DAYS_OF_MONTH.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Annually: Month and day */}
          {entryCondition?.scheduleConfig?.frequency === 'annually' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                  Month
                </label>
                <select
                  value={entryCondition?.scheduleConfig?.month || ''}
                  onChange={(e) => handleScheduleConfigChange('month', parseInt(e.target.value) || '')}
                  className={cn(
                    "w-full px-3 py-2 rounded-md",
                    "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "focus:outline-none focus:border-[var(--bb-color-accent)]"
                  )}
                >
                  <option value="">Select month...</option>
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                  Day of Month
                </label>
                <select
                  value={entryCondition?.scheduleConfig?.dayOfMonth || ''}
                  onChange={(e) => handleScheduleConfigChange('dayOfMonth', e.target.value === 'last' ? 'last' : parseInt(e.target.value) || '')}
                  className={cn(
                    "w-full px-3 py-2 rounded-md",
                    "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "focus:outline-none focus:border-[var(--bb-color-accent)]"
                  )}
                >
                  <option value="">Select day...</option>
                  {DAYS_OF_MONTH.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Time picker (for all frequencies) */}
          {entryCondition?.scheduleConfig?.frequency && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Time
              </label>
              <input
                type="time"
                value={entryCondition?.scheduleConfig?.time || '09:00'}
                onChange={(e) => handleScheduleConfigChange('time', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              />
            </div>
          )}

          {/* Timezone selector */}
          {entryCondition?.scheduleConfig?.frequency && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Timezone
              </label>
              <select
                value={entryCondition?.scheduleConfig?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'}
                onChange={(e) => handleScheduleConfigChange('timezone', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional filter for schedule */}
          {entryCondition?.scheduleConfig?.frequency && (
            <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Filter Records (Optional)
              </label>
              <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-3">
                Only enroll records that match these conditions
              </div>
              <ConditionBuilder
                objectType={objectType}
                conditions={entryCondition?.scheduleConfig?.filter || { logic: 'and', conditions: [] }}
                onChange={(filter) => handleScheduleConfigChange('filter', filter)}
                label={null}
              />
            </div>
          )}
        </div>
      )}

      {/* Event type selection (if event trigger) */}
      {triggerType === 'event' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
              Event Type
            </label>
            <select
              value={eventType || ''}
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

          {/* Property changed configuration */}
          {eventType === 'property.changed' && objectType && (
            <div className="space-y-4 p-3 rounded-md bg-[var(--bb-color-bg-subtle)] border border-[var(--bb-color-border-subtle)]">
              {/* Property selector */}
              <div>
                <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                  Property
                </label>
                <select
                  value={entryCondition?.propertyConfig?.property || ''}
                  onChange={(e) => handlePropertyConfigChange('property', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-md",
                    "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "focus:outline-none focus:border-[var(--bb-color-accent)]"
                  )}
                >
                  <option value="">Select property...</option>
                  {properties.map((prop) => (
                    <option key={prop.name} value={prop.name}>
                      {prop.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Change type selector */}
              {entryCondition?.propertyConfig?.property && (
                <div>
                  <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                    Change Type
                  </label>
                  <select
                    value={entryCondition?.propertyConfig?.changeType || 'any_change'}
                    onChange={(e) => handlePropertyConfigChange('changeType', e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-md",
                      "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                      "text-sm text-[var(--bb-color-text-primary)]",
                      "focus:outline-none focus:border-[var(--bb-color-accent)]"
                    )}
                  >
                    {PROPERTY_CHANGE_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* From value (for changed_from and changed_from_to) */}
              {(entryCondition?.propertyConfig?.changeType === 'changed_from' ||
                entryCondition?.propertyConfig?.changeType === 'changed_from_to') && (
                <div>
                  <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                    From Value
                  </label>
                  <PropertyValueInput
                    property={selectedPropertyConfig}
                    value={entryCondition?.propertyConfig?.fromValue || ''}
                    onChange={(val) => handlePropertyConfigChange('fromValue', val)}
                    placeholder="Previous value..."
                  />
                </div>
              )}

              {/* To value (for changed_to and changed_from_to) */}
              {(entryCondition?.propertyConfig?.changeType === 'changed_to' ||
                entryCondition?.propertyConfig?.changeType === 'changed_from_to') && (
                <div>
                  <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                    To Value
                  </label>
                  <PropertyValueInput
                    property={selectedPropertyConfig}
                    value={entryCondition?.propertyConfig?.toValue || ''}
                    onChange={(val) => handlePropertyConfigChange('toValue', val)}
                    placeholder="New value..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Refinement filter for events */}
          {eventType && eventType !== 'property.changed' && (
            <div className="pt-4 border-t border-[var(--bb-color-border-subtle)]">
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                Refinement Filter (Optional)
              </label>
              <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-3">
                Only trigger when the record also meets these conditions
              </div>
              <ConditionBuilder
                objectType={objectType}
                conditions={entryCondition?.refinementFilter || { logic: 'and', conditions: [] }}
                onChange={(filter) => onChange({ ...entryCondition, refinementFilter: filter })}
                label={null}
              />
            </div>
          )}
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
