/**
 * TriggerCard - Trigger card component for the workflow canvas
 * Shows the workflow trigger configuration
 */
import { Flag, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TRIGGER_TYPE_CONFIG, TRIGGER_EVENT_CATEGORIES } from '../../../constants';

export default function TriggerCard({
  entryCondition,
  isSelected,
  onClick,
}) {
  const hasTrigger = entryCondition?.triggerType;

  // Get trigger description
  const getTriggerDescription = () => {
    if (!hasTrigger) return 'Configuring...';

    const triggerType = entryCondition.triggerType;

    if (triggerType === 'manual') {
      return 'When manually enrolled';
    }

    if (triggerType === 'event' && entryCondition.eventType) {
      // Find the event label
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
          Trigger
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
          When this happens
        </div>
        <div
          className={cn(
            "px-3 py-2 rounded-md text-sm",
            hasTrigger
              ? "bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)]"
              : "bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-tertiary)] italic"
          )}
        >
          {getTriggerDescription()}
        </div>
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
