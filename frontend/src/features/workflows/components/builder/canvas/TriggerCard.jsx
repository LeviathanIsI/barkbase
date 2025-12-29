/**
 * TriggerCard - Trigger card component for the workflow canvas
 * Shows the workflow trigger configuration with detailed condition summaries
 */
import { Flag, RefreshCw, Hand, Clock, Filter, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  TRIGGER_EVENT_CATEGORIES,
  OBJECT_TYPE_CONFIG,
  OBJECT_PROPERTIES,
  CONDITION_OPERATORS,
  DAYS_OF_WEEK_FULL,
  MONTHS,
  COMMON_TIMEZONES,
} from '../../../constants';
import { normalizeConditionConfig } from '../config/conditionUtils';

// Get property definition by name from OBJECT_PROPERTIES
function getPropertyDefinition(objectType, propertyName) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  return properties.find((p) => p.name === propertyName);
}


// Get operator label from CONDITION_OPERATORS
function getOperatorLabel(operator, propertyType = 'text') {
  const operators = CONDITION_OPERATORS[propertyType] || CONDITION_OPERATORS.text || [];
  const op = operators.find((o) => o.value === operator);
  return op?.label || operator?.replace(/_/g, ' ');
}

// Get event label from TRIGGER_EVENT_CATEGORIES
function getEventLabel(eventType) {
  for (const category of Object.values(TRIGGER_EVENT_CATEGORIES)) {
    const event = category.events?.find((e) => e.value === eventType);
    if (event) return event.label;
  }
  // Fallback: convert event type to readable label
  return eventType?.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format condition value for display - looks up labels from property options
// Format a date string for display
function formatDateString(dateStr, tzFormatDate = null) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (tzFormatDate) {
    return tzFormatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format a date value object for display
function formatDateValue(value) {
  if (!value) return '';

  // Handle "today" type
  if (value.type === 'today') {
    return 'today';
  }

  // Handle "exact" date type
  if (value.type === 'exact') {
    return formatDateString(value.date);
  }

  // Handle "relative" date type
  if (value.type === 'relative') {
    const direction = value.direction === 'ago' ? 'ago' : 'from now';
    return `${value.amount} ${value.unit} ${direction}`;
  }

  // Handle legacy string date values
  if (typeof value === 'string') {
    return formatDateString(value);
  }

  // Handle simple number values (for "X days ago" operators)
  if (typeof value === 'number') {
    return `${value} days`;
  }

  // Handle date range (for "is between" operator)
  if (value.from || value.to) {
    const fromStr = formatDateValue(value.from);
    const toStr = formatDateValue(value.to);
    return `${fromStr} and ${toStr}`;
  }

  return String(value);
}

function formatConditionValue(value, property) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'True' : 'False';

  // Look up label from property options for enum/select fields
  if (property?.options && typeof value === 'string') {
    const option = property.options.find((opt) => opt.value === value);
    if (option) return option.label;
  }

  // Handle array values - look up labels for each item
  if (Array.isArray(value)) {
    if (property?.options) {
      return value
        .map((v) => {
          const option = property.options.find((opt) => opt.value === v);
          return option?.label || v;
        })
        .join(', ');
    }
    return value.join(', ');
  }

  // Handle date values with special formatting
  if (property?.type === 'date' && typeof value === 'object') {
    return formatDateValue(value);
  }

  // Handle number values for date operators (X days)
  if (property?.type === 'date' && typeof value === 'number') {
    return `${value} days`;
  }

  if (typeof value === 'object') {
    if (value.type === 'relative') {
      const direction = value.direction === 'ago' ? 'ago' : 'from now';
      return `${value.amount} ${value.unit} ${direction}`;
    }
    if (value.type === 'today') return 'today';
    if (value.type === 'exact' && value.date) return formatDateString(value.date);
    if (value.date) return formatDateString(value.date);
  }
  return String(value);
}

// Render a single condition row
function ConditionRow({ condition, objectType }) {
  const property = getPropertyDefinition(objectType, condition.field);
  const propertyLabel = property?.label || condition.field?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const operatorLabel = getOperatorLabel(condition.operator, property?.type);
  const value = formatConditionValue(condition.value, property);
  const noValueOperators = ['is_known', 'is_unknown', 'is_true', 'is_false'];
  const showValue = !noValueOperators.includes(condition.operator) && value;

  return (
    <div className="bg-[var(--bb-color-bg-surface)] rounded-md px-3 py-2 text-sm">
      <span className="text-[var(--bb-color-accent)]">{propertyLabel}</span>
      {' '}
      <span className="text-[var(--bb-color-text-secondary)]">{operatorLabel}</span>
      {showValue && (
        <>
          {' '}
          <span className="text-[var(--bb-color-accent)]">{value}</span>
        </>
      )}
    </div>
  );
}

// Render a single condition group
function ConditionGroup({ group, groupIndex, objectType }) {
  const { conditions = [] } = group;

  if (conditions.length === 0) {
    return (
      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="text-xs text-[var(--bb-color-text-tertiary)] italic">
          No conditions in this group
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
      <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] mb-2">
        Group {groupIndex + 1}
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="text-xs text-[var(--bb-color-text-tertiary)] my-1.5 ml-2">
                and
              </div>
            )}
            <ConditionRow condition={condition} objectType={objectType} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Render filter criteria summary with condition groups
function FilterCriteriaSummary({ filterConfig, objectType, objectLabel }) {
  // Normalize to new groups format (handles backwards compatibility)
  const normalizedConfig = normalizeConditionConfig(filterConfig);
  const groups = normalizedConfig.groups || [];

  // Check if we have any conditions at all
  const hasConditions = groups.some((g) => g.conditions && g.conditions.length > 0);

  if (!hasConditions) {
    return (
      <div className="text-sm text-[var(--bb-color-text-secondary)]">
        Only enroll {objectLabel.toLowerCase()}s that meet conditions
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--bb-color-text-secondary)] mb-3">
        Only enroll {objectLabel.toLowerCase()}s that meet these conditions
      </p>

      <div className="space-y-0">
        {groups.map((group, groupIndex) => (
          <div key={group.id || groupIndex}>
            {/* OR divider between groups */}
            {groupIndex > 0 && (
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
                <span className="text-xs font-semibold text-[var(--bb-color-warning)] bg-[var(--bb-color-bg-elevated)] px-2 py-1 rounded uppercase tracking-wide">
                  OR
                </span>
                <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
              </div>
            )}

            <ConditionGroup
              group={group}
              groupIndex={groupIndex}
              objectType={objectType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Render property changed event summary
function PropertyChangedSummary({ filterConfig, objectType }) {
  const propertyName = filterConfig?.propertyName;
  const changeType = filterConfig?.changeType;
  const propObjectType = filterConfig?.objectType || objectType;
  const property = getPropertyDefinition(propObjectType, propertyName);
  const propertyLabel = property?.label || propertyName?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const fromValue = formatConditionValue(filterConfig?.fromValue, property);
  const toValue = formatConditionValue(filterConfig?.toValue, property);

  return (
    <div>
      <p className="text-sm text-[var(--bb-color-text-secondary)] mb-3">
        When this happens
      </p>

      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="bg-[var(--bb-color-bg-surface)] rounded-md px-3 py-2 text-sm">
          <span className="text-[var(--bb-color-accent)]">{propertyLabel}</span>
          {' '}
          {changeType === 'any_change' && (
            <span className="text-[var(--bb-color-text-secondary)]">is changed</span>
          )}
          {changeType === 'changed_to' && (
            <>
              <span className="text-[var(--bb-color-text-secondary)]">is changed to</span>
              {toValue && (
                <>
                  {' '}
                  <span className="text-[var(--bb-color-accent)]">{toValue}</span>
                </>
              )}
            </>
          )}
          {changeType === 'changed_from' && (
            <>
              <span className="text-[var(--bb-color-text-secondary)]">is changed from</span>
              {fromValue && (
                <>
                  {' '}
                  <span className="text-[var(--bb-color-accent)]">{fromValue}</span>
                </>
              )}
            </>
          )}
          {changeType === 'changed_from_to' && (
            <>
              <span className="text-[var(--bb-color-text-secondary)]">is changed from</span>
              {fromValue && (
                <>
                  {' '}
                  <span className="text-[var(--bb-color-accent)]">{fromValue}</span>
                </>
              )}
              {' '}
              <span className="text-[var(--bb-color-text-secondary)]">to</span>
              {toValue && (
                <>
                  {' '}
                  <span className="text-[var(--bb-color-accent)]">{toValue}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Format time from 24h to 12h format
function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Get ordinal suffix for day of month
function getOrdinalSuffix(day) {
  if (day === 'last') return '';
  const n = Number(day);
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Format day of month with ordinal
function formatDayOfMonth(day) {
  if (day === 'last') return 'the last day';
  return `the ${day}${getOrdinalSuffix(day)}`;
}

// Get timezone abbreviation from timezone string
function getTimezoneAbbr(timezone) {
  if (!timezone) return '';
  const tz = COMMON_TIMEZONES.find((t) => t.value === timezone);
  if (tz) {
    // Extract abbreviation from label like "Eastern Time (ET)" -> "ET"
    const match = tz.label.match(/\(([^)]+)\)/);
    return match ? match[1] : timezone;
  }
  return timezone;
}

// Get day name from value
function getDayName(dayValue) {
  const day = DAYS_OF_WEEK_FULL.find((d) => d.value === dayValue);
  return day?.label || dayValue;
}

// Get month name from value
function getMonthName(monthValue) {
  const month = MONTHS.find((m) => m.value === monthValue);
  return month?.label || monthValue;
}

// Format date for display
function formatDate(dateStr, tzFormatDate = null) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (tzFormatDate) {
    return tzFormatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Render schedule trigger summary
function ScheduleSummary({ scheduleConfig, objectLabel }) {
  const { frequency, date, time, timezone, dayOfWeek, dayOfMonth, month } = scheduleConfig || {};

  const timeStr = formatTime(time);
  const tzAbbr = getTimezoneAbbr(timezone);

  let scheduleText = '';
  switch (frequency) {
    case 'once':
      scheduleText = date
        ? `Once on ${formatDate(date)}${timeStr ? ` at ${timeStr}` : ''}`
        : 'Once (date not set)';
      break;
    case 'daily':
      scheduleText = timeStr ? `Daily at ${timeStr}` : 'Daily';
      break;
    case 'weekly':
      scheduleText = dayOfWeek
        ? `Every ${getDayName(dayOfWeek)}${timeStr ? ` at ${timeStr}` : ''}`
        : 'Weekly (day not set)';
      break;
    case 'monthly':
      scheduleText = dayOfMonth
        ? `Monthly on ${formatDayOfMonth(dayOfMonth)}${timeStr ? ` at ${timeStr}` : ''}`
        : 'Monthly (day not set)';
      break;
    case 'annually':
      scheduleText = month && dayOfMonth
        ? `Annually on ${getMonthName(month)} ${dayOfMonth === 'last' ? '(last day)' : dayOfMonth}${timeStr ? ` at ${timeStr}` : ''}`
        : 'Annually (date not set)';
      break;
    default:
      scheduleText = 'On a schedule';
  }

  return (
    <div>
      <p className="text-sm text-[var(--bb-color-text-secondary)] mb-3">
        Enroll {objectLabel.toLowerCase()}s on a schedule
      </p>

      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="bg-[var(--bb-color-bg-surface)] rounded-md px-3 py-2 text-sm">
          <span className="text-[var(--bb-color-accent)]">{scheduleText}</span>
          {tzAbbr && (
            <span className="text-[var(--bb-color-text-tertiary)] ml-2">
              {tzAbbr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Render event trigger summary (non-property-changed events)
function EventSummary({ eventType }) {
  const eventLabel = getEventLabel(eventType);

  return (
    <div>
      <p className="text-sm text-[var(--bb-color-text-secondary)] mb-3">
        When this happens
      </p>

      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="bg-[var(--bb-color-bg-surface)] rounded-md px-3 py-2 text-sm">
          <span className="text-[var(--bb-color-accent)]">{eventLabel}</span>
        </div>
      </div>
    </div>
  );
}

// Render manual trigger summary
function ManualSummary({ objectLabel }) {
  return (
    <div>
      <p className="text-sm text-[var(--bb-color-text-secondary)] mb-3">
        Manually enroll {objectLabel.toLowerCase()}s
      </p>

      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="bg-[var(--bb-color-bg-surface)] rounded-md px-3 py-2 text-sm text-[var(--bb-color-text-secondary)]">
          Select records to enroll when activating the workflow
        </div>
      </div>
    </div>
  );
}

// Get the icon for the trigger type
function getTriggerIcon(triggerType) {
  switch (triggerType) {
    case 'manual':
      return Hand;
    case 'schedule':
      return Clock;
    case 'filter_criteria':
      return Filter;
    case 'event':
      return Zap;
    default:
      return Flag;
  }
}

export default function TriggerCard({
  entryCondition,
  objectType,
  settings,
  isSelected,
  onClick,
  onSettingsClick,
}) {
  const hasTrigger = entryCondition?.triggerType;
  const objectLabel = OBJECT_TYPE_CONFIG[objectType]?.label || 'Records';
  const TriggerIcon = getTriggerIcon(entryCondition?.triggerType);
  const allowReenrollment = settings?.allowReenrollment || false;

  // Render the appropriate trigger summary based on trigger type
  const renderTriggerContent = () => {
    if (!hasTrigger) {
      return (
        <div className="px-3 py-2 rounded-md text-sm bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-tertiary)] italic">
          Configuring...
        </div>
      );
    }

    const { triggerType, eventType, filterConfig, scheduleConfig } = entryCondition;

    switch (triggerType) {
      case 'manual':
        return <ManualSummary objectLabel={objectLabel} />;

      case 'schedule':
        return <ScheduleSummary scheduleConfig={scheduleConfig} objectLabel={objectLabel} />;

      case 'filter_criteria':
        return (
          <FilterCriteriaSummary
            filterConfig={filterConfig}
            objectType={objectType}
            objectLabel={objectLabel}
          />
        );

      case 'event':
        if (eventType === 'property.changed') {
          return <PropertyChangedSummary filterConfig={filterConfig} objectType={objectType} />;
        }
        return <EventSummary eventType={eventType} />;

      default:
        return (
          <div className="px-3 py-2 rounded-md text-sm bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-secondary)]">
            {triggerType}
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-80 rounded-lg cursor-pointer',
        'bg-[var(--bb-color-bg-elevated)] border-2',
        'transition-all duration-150',
        isSelected
          ? 'border-[var(--bb-color-accent)] shadow-lg'
          : 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[var(--bb-color-accent-soft)] flex items-center justify-center">
          <TriggerIcon size={14} className="text-[var(--bb-color-accent)]" />
        </div>
        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
          Trigger enrollment for {objectLabel}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">{renderTriggerContent()}</div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--bb-color-text-tertiary)]">
          <RefreshCw size={12} />
          Re-enroll {allowReenrollment ? 'on' : 'off'}
        </div>
        <div className="flex items-center gap-3">
          {onSettingsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick?.();
              }}
              className="text-xs text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-accent)]"
            >
              Settings
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="text-xs text-[var(--bb-color-accent)] hover:underline"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
