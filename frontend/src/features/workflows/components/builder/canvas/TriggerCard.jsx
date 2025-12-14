/**
 * TriggerCard - Trigger card component for the workflow canvas
 * Shows the workflow trigger configuration
 */
import { Flag, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TRIGGER_TYPE_CONFIG, TRIGGER_EVENT_CATEGORIES, OBJECT_TYPE_CONFIG } from '../../../constants';

export default function TriggerCard({
  entryCondition,
  objectType,
  isSelected,
  onClick,
}) {
  const hasTrigger = entryCondition?.triggerType;
  const groups = entryCondition?.groups || [];
  const objectLabel = OBJECT_TYPE_CONFIG[objectType]?.label || 'records';

  // Get trigger description based on groups
  const getTriggerContent = () => {
    // If we have groups configured
    if (groups.length > 0) {
      return (
        <div className="space-y-2">
          {groups.map((group, index) => (
            <div key={group.id || index}>
              <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                Group {index + 1}
              </div>
              <div className="px-3 py-2 rounded-md text-sm bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)]">
                {getGroupDescription(group)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Legacy single trigger support
    if (!hasTrigger) {
      return (
        <div className="px-3 py-2 rounded-md text-sm bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-tertiary)] italic">
          Configuring...
        </div>
      );
    }

    const description = getLegacyTriggerDescription();
    return (
      <div className="px-3 py-2 rounded-md text-sm bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)]">
        {description}
      </div>
    );
  };

  // Get description for a single group
  const getGroupDescription = (group) => {
    if (group.type === 'event') {
      return group.eventLabel || 'Event trigger';
    }
    if (group.type === 'schedule') {
      const freq = group.frequency === 'once' ? '' : group.frequency;
      return `On a schedule${freq ? ` (${freq})` : ''}`;
    }
    if (group.type === 'filter') {
      return 'When filter criteria is met';
    }
    return 'Manually triggered only';
  };

  // Legacy trigger description (for backwards compatibility)
  const getLegacyTriggerDescription = () => {
    const triggerType = entryCondition.triggerType;

    if (triggerType === 'manual') {
      return 'Manually triggered only';
    }

    if (triggerType === 'event' && entryCondition.eventType) {
      for (const category of Object.values(TRIGGER_EVENT_CATEGORIES)) {
        const event = category.events.find((e) => e.value === entryCondition.eventType);
        if (event) return event.label;
      }
      return entryCondition.eventType;
    }

    if (triggerType === 'filter_criteria') {
      return 'When filter criteria is met';
    }

    if (triggerType === 'schedule') {
      return 'On a schedule';
    }

    if (triggerType === 'mixed') {
      return 'Multiple triggers configured';
    }

    return TRIGGER_TYPE_CONFIG[triggerType]?.label || 'Configure trigger';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-72 rounded-lg cursor-pointer",
        "bg-[var(--bb-color-bg-elevated)] border-2",
        "transition-all duration-150",
        isSelected
          ? "border-[var(--bb-color-accent)] shadow-lg"
          : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[var(--bb-color-accent-soft)] flex items-center justify-center">
          <Flag size={14} className="text-[var(--bb-color-accent)]" />
        </div>
        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
          Trigger enrollment for {objectLabel}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-2">
          When this happens
        </div>
        {getTriggerContent()}
      </div>

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
