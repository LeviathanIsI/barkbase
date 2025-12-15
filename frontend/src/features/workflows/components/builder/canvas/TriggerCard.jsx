/**
 * TriggerCard - Trigger card component for the workflow canvas
 * Shows the workflow trigger configuration with detailed condition summaries
 */
import { Flag, RefreshCw, Hand, Clock, Filter, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  TRIGGER_EVENT_CATEGORIES,
  OBJECT_TYPE_CONFIG,
  OBJECT_PROPERTIES,
  CONDITION_OPERATORS,
} from '../../../constants';

// Get property label by name from OBJECT_PROPERTIES
function getPropertyLabel(objectType, propertyName) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  const prop = properties.find((p) => p.name === propertyName);
  return prop?.label || propertyName?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

// Format condition value for display
function formatConditionValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    if (value.type === 'relative') {
      return `${value.amount} ${value.unit} ${value.direction}`;
    }
    if (value.type === 'today') return 'Today';
    if (value.date) return value.date;
  }
  return String(value);
}

// Render a single condition row
function ConditionRow({ condition, objectType }) {
  const propertyLabel = getPropertyLabel(objectType, condition.field);
  const operatorLabel = getOperatorLabel(condition.operator);
  const value = formatConditionValue(condition.value);
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

// Render filter criteria summary with condition groups
function FilterCriteriaSummary({ filterConfig, objectType, objectLabel }) {
  const conditions = filterConfig?.conditions || [];

  if (conditions.length === 0) {
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

      <div className="bg-[var(--bb-color-bg-body)] rounded-lg p-3 border border-[var(--bb-color-border-subtle)]">
        <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] mb-2">
          Group 1
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
    </div>
  );
}

// Render property changed event summary
function PropertyChangedSummary({ filterConfig, objectType }) {
  const propertyName = filterConfig?.propertyName;
  const changeType = filterConfig?.changeType;
  const fromValue = formatConditionValue(filterConfig?.fromValue);
  const toValue = formatConditionValue(filterConfig?.toValue);
  const propObjectType = filterConfig?.objectType || objectType;
  const propertyLabel = getPropertyLabel(propObjectType, propertyName);

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

// Render schedule trigger summary
function ScheduleSummary({ scheduleConfig, objectLabel }) {
  const { frequency, date, time, timezone } = scheduleConfig || {};

  let scheduleText = '';
  switch (frequency) {
    case 'once':
      scheduleText = `Once${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}`;
      break;
    case 'daily':
      scheduleText = `Daily${time ? ` at ${time}` : ''}`;
      break;
    case 'weekly':
      scheduleText = `Weekly${time ? ` at ${time}` : ''}`;
      break;
    case 'monthly':
      scheduleText = `Monthly${time ? ` at ${time}` : ''}`;
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
          {timezone && (
            <span className="text-[var(--bb-color-text-tertiary)] ml-2 text-xs">
              ({timezone})
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
  isSelected,
  onClick,
}) {
  const hasTrigger = entryCondition?.triggerType;
  const objectLabel = OBJECT_TYPE_CONFIG[objectType]?.label || 'Records';
  const TriggerIcon = getTriggerIcon(entryCondition?.triggerType);

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
          Re-enroll off
        </div>
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
  );
}
