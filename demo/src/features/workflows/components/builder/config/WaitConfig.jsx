/**
 * WaitConfig - Configuration panel for wait steps
 * Supports: duration, calendar_date, date_property, day_of_week, event
 */
import { cn } from '@/lib/cn';
import {
  WAIT_TYPE_CONFIG,
  DURATION_UNITS,
  COMMON_TIMEZONES,
  DAYS_OF_WEEK_FULL,
  DATE_TIMING_OPTIONS,
  DATE_OFFSET_UNITS,
  WAIT_EVENTS_BY_OBJECT_TYPE,
  OBJECT_PROPERTIES,
} from '../../../constants';
import ConditionBuilder from './ConditionBuilder';

// Get date properties for a given object type
function getDateProperties(objectType) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  return properties
    .filter((p) => p.type === 'date' || p.type === 'datetime')
    .map((p) => ({ value: p.name, label: p.label }));
}

// Get events for a given object type
function getEventsForObjectType(objectType) {
  return WAIT_EVENTS_BY_OBJECT_TYPE[objectType] || [];
}

export default function WaitConfig({ step, onChange, objectType }) {
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

  // Handle wait type change - reset config when type changes
  const handleWaitTypeChange = (newType) => {
    // Reset config with new type and sensible defaults
    const newConfig = { waitType: newType };

    switch (newType) {
      case 'duration':
        newConfig.duration = 1;
        newConfig.durationUnit = 'days';
        break;
      case 'calendar_date':
        newConfig.date = '';
        newConfig.time = '09:00';
        newConfig.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
        break;
      case 'date_property':
        newConfig.property = '';
        newConfig.timing = 'on';
        newConfig.time = '09:00';
        break;
      case 'day_of_week':
        newConfig.day = 'monday';
        newConfig.time = '09:00';
        newConfig.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
        break;
      case 'event':
        newConfig.eventType = '';
        newConfig.maxWaitAmount = 30;
        newConfig.maxWaitUnit = 'days';
        break;
    }

    onChange({ config: newConfig });
  };

  const dateProperties = getDateProperties(objectType);
  const availableEvents = getEventsForObjectType(objectType);

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
            'w-full px-3 py-2 rounded-md',
            'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
            'text-sm text-[var(--bb-color-text-primary)]',
            'focus:outline-none focus:border-[var(--bb-color-accent)]'
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
              onClick={() => handleWaitTypeChange(type)}
              className={cn(
                'w-full px-3 py-2 rounded-md text-left',
                'border transition-colors',
                waitType === type
                  ? 'border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]'
                  : 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]'
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
                'w-20 px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
            <select
              value={config.durationUnit || 'days'}
              onChange={(e) => handleConfigChange('durationUnit', e.target.value)}
              className={cn(
                'flex-1 px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
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

      {/* Calendar date config */}
      {waitType === 'calendar_date' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)] space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Date
            </label>
            <input
              type="date"
              value={config.date || ''}
              onChange={(e) => handleConfigChange('date', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Time
            </label>
            <input
              type="time"
              value={config.time || '09:00'}
              onChange={(e) => handleConfigChange('time', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Timezone
            </label>
            <select
              value={config.timezone || 'America/New_York'}
              onChange={(e) => handleConfigChange('timezone', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={config.addBranch || false}
              onChange={(e) => handleConfigChange('addBranch', e.target.checked)}
              className="rounded border-[var(--bb-color-border-subtle)]"
            />
            <span className="text-sm text-[var(--bb-color-text-secondary)]">
              Add branch for records reaching this step after the date
            </span>
          </label>
        </div>
      )}

      {/* Date property config */}
      {waitType === 'date_property' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)] space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Date Property
            </label>
            {dateProperties.length > 0 ? (
              <select
                value={config.property || ''}
                onChange={(e) => handleConfigChange('property', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              >
                <option value="">Select date property...</option>
                {dateProperties.map((prop) => (
                  <option key={prop.value} value={prop.value}>
                    {prop.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-[var(--bb-color-text-tertiary)] italic">
                No date properties available for this object type
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              When to Execute
            </label>
            <select
              value={config.timing || 'on'}
              onChange={(e) => handleConfigChange('timing', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            >
              {DATE_TIMING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Offset for before/after */}
          {['before', 'after'].includes(config.timing) && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={config.offsetAmount || 1}
                onChange={(e) => handleConfigChange('offsetAmount', parseInt(e.target.value) || 1)}
                className={cn(
                  'w-20 px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              />
              <select
                value={config.offsetUnit || 'days'}
                onChange={(e) => handleConfigChange('offsetUnit', e.target.value)}
                className={cn(
                  'w-24 px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              >
                {DATE_OFFSET_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-[var(--bb-color-text-tertiary)]">
                {config.timing} the date
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              At Time
            </label>
            <input
              type="time"
              value={config.time || '09:00'}
              onChange={(e) => handleConfigChange('time', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={config.addBranch || false}
              onChange={(e) => handleConfigChange('addBranch', e.target.checked)}
              className="rounded border-[var(--bb-color-border-subtle)]"
            />
            <span className="text-sm text-[var(--bb-color-text-secondary)]">
              Add branch for records with unknown or past dates
            </span>
          </label>
        </div>
      )}

      {/* Day of week config */}
      {waitType === 'day_of_week' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)] space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Day
            </label>
            <select
              value={config.day || 'monday'}
              onChange={(e) => handleConfigChange('day', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            >
              {DAYS_OF_WEEK_FULL.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              At Time
            </label>
            <input
              type="time"
              value={config.time || '09:00'}
              onChange={(e) => handleConfigChange('time', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Timezone
            </label>
            <select
              value={config.timezone || 'America/New_York'}
              onChange={(e) => handleConfigChange('timezone', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[var(--bb-color-text-tertiary)]">
            If today is the selected day and the time has passed, the record will wait until next week.
          </p>
        </div>
      )}

      {/* Event config */}
      {waitType === 'event' && (
        <div className="pt-4 border-t border-[var(--bb-color-border-subtle)] space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Wait Until This Event Occurs
            </label>
            {availableEvents.length > 0 ? (
              <select
                value={config.eventType || ''}
                onChange={(e) => handleConfigChange('eventType', e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              >
                <option value="">Select event...</option>
                {availableEvents.map((event) => (
                  <option key={event.value} value={event.value}>
                    {event.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-[var(--bb-color-text-tertiary)] italic">
                No events available for this object type
              </div>
            )}
          </div>

          {/* Optional event filter */}
          {config.eventType && (
            <div>
              <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-2">
                With These Conditions (Optional)
              </label>
              <ConditionBuilder
                objectType={objectType}
                conditions={config.eventFilter}
                onChange={(filter) => handleConfigChange('eventFilter', filter)}
                label=""
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Maximum Wait Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={config.maxWaitAmount || 30}
                onChange={(e) => handleConfigChange('maxWaitAmount', parseInt(e.target.value) || 30)}
                className={cn(
                  'w-20 px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              />
              <select
                value={config.maxWaitUnit || 'days'}
                onChange={(e) => handleConfigChange('maxWaitUnit', e.target.value)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              >
                <option value="days">days</option>
                <option value="weeks">weeks</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={config.addBranch || false}
              onChange={(e) => handleConfigChange('addBranch', e.target.checked)}
              className="rounded border-[var(--bb-color-border-subtle)]"
            />
            <span className="text-sm text-[var(--bb-color-text-secondary)]">
              Add branch for records where event doesn&apos;t occur within max wait
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
