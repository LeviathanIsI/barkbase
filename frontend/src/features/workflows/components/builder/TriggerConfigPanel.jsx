/**
 * TriggerConfigPanel - Dedicated panel for configuring workflow triggers
 * Opens when clicking the Trigger card on the canvas
 * HubSpot-style with tabs, groups, and criteria builder
 */
import { useState } from 'react';
import {
  Search,
  ChevronLeft,
  Plus,
  Trash2,
  Copy,
  Clock,
  Calendar,
  CreditCard,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Database,
  MessageCircle,
  Zap,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import {
  TRIGGER_EVENT_CATEGORIES,
} from '../../constants';

// Icon mapping for generic event categories
const CATEGORY_ICONS = {
  data_values: Database,
  scheduling: Calendar,
  communications: MessageCircle,
  payments: CreditCard,
  automations: Zap,
  pet_health: Heart,
};

export default function TriggerConfigPanel({ onClose, onSave }) {
  const { workflow, setEntryCondition, setObjectType } = useWorkflowBuilderStore();

  const [activeTab, setActiveTab] = useState('triggers'); // triggers | settings
  const [triggerGroups, setTriggerGroups] = useState(() => {
    // Initialize from existing entry condition or create default
    const ec = workflow.entryCondition || {};
    if (ec.groups && ec.groups.length > 0) {
      return ec.groups;
    }
    // Default: just manual trigger
    return [];
  });
  const [showCriteriaPanel, setShowCriteriaPanel] = useState(false);
  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Settings state
  const [settings, setSettings] = useState({
    allowReenrollment: workflow.settings?.allowReenrollment || false,
    reenrollmentDelayDays: workflow.settings?.reenrollmentDelayDays || 30,
  });

  // Handle adding a new group
  const handleAddGroup = () => {
    setEditingGroupIndex(triggerGroups.length);
    setShowCriteriaPanel(true);
  };

  // Handle selecting a criteria/event
  const handleSelectCriteria = (categoryKey, event) => {
    const newGroup = {
      id: `group-${Date.now()}`,
      type: 'event',
      categoryKey,
      eventType: event.value,
      eventLabel: event.label,
    };

    if (editingGroupIndex !== null && editingGroupIndex < triggerGroups.length) {
      // Editing existing group
      const updated = [...triggerGroups];
      updated[editingGroupIndex] = newGroup;
      setTriggerGroups(updated);
    } else {
      // Adding new group
      setTriggerGroups([...triggerGroups, newGroup]);
    }

    setShowCriteriaPanel(false);
    setEditingGroupIndex(null);
  };

  // Handle selecting schedule trigger
  const handleSelectSchedule = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      type: 'schedule',
      frequency: 'daily',
      date: '',
      time: '09:00',
      timezone: 'America/New_York',
    };

    if (editingGroupIndex !== null && editingGroupIndex < triggerGroups.length) {
      const updated = [...triggerGroups];
      updated[editingGroupIndex] = newGroup;
      setTriggerGroups(updated);
    } else {
      setTriggerGroups([...triggerGroups, newGroup]);
    }

    setShowCriteriaPanel(false);
    setEditingGroupIndex(null);
  };

  // Handle selecting filter criteria
  const handleSelectFilter = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      type: 'filter',
      conditions: [],
    };

    if (editingGroupIndex !== null && editingGroupIndex < triggerGroups.length) {
      const updated = [...triggerGroups];
      updated[editingGroupIndex] = newGroup;
      setTriggerGroups(updated);
    } else {
      setTriggerGroups([...triggerGroups, newGroup]);
    }

    setShowCriteriaPanel(false);
    setEditingGroupIndex(null);
  };

  // Handle deleting a group
  const handleDeleteGroup = (index) => {
    setTriggerGroups(triggerGroups.filter((_, i) => i !== index));
  };

  // Handle duplicating a group
  const handleDuplicateGroup = (index) => {
    const group = triggerGroups[index];
    const duplicate = { ...group, id: `group-${Date.now()}` };
    const updated = [...triggerGroups];
    updated.splice(index + 1, 0, duplicate);
    setTriggerGroups(updated);
  };

  // Handle updating schedule group
  const handleUpdateScheduleGroup = (index, field, value) => {
    const updated = [...triggerGroups];
    updated[index] = { ...updated[index], [field]: value };
    setTriggerGroups(updated);
  };

  // Handle save
  const handleSave = () => {
    // Build the entry condition from groups
    const entryCondition = {
      triggerType: triggerGroups.length === 0 ? 'manual' : 'mixed',
      groups: triggerGroups,
      // Legacy fields for compatibility
      eventType: triggerGroups.find(g => g.type === 'event')?.eventType || null,
      filterConfig: triggerGroups.find(g => g.type === 'filter') || null,
      scheduleConfig: triggerGroups.find(g => g.type === 'schedule') || null,
    };

    setEntryCondition(entryCondition);

    // Update settings
    // Note: This should be done through a separate settings action

    onSave?.();
    onClose?.();
  };

  // Toggle category expansion
  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Main panel */}
      <div className="w-[450px] h-full bg-[var(--bb-color-bg-surface)] border-r border-[var(--bb-color-border-subtle)] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--bb-color-text-primary)]">
            Triggers
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium bg-[var(--bb-color-accent)] text-white rounded hover:bg-[var(--bb-color-accent-hover)]"
            >
              Save
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 border-b border-[var(--bb-color-border-subtle)]">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('triggers')}
              className={cn(
                "py-3 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'triggers'
                  ? "text-[var(--bb-color-accent)] border-[var(--bb-color-accent)]"
                  : "text-[var(--bb-color-text-secondary)] border-transparent hover:text-[var(--bb-color-text-primary)]"
              )}
            >
              Start triggers
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "py-3 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'settings'
                  ? "text-[var(--bb-color-accent)] border-[var(--bb-color-accent)]"
                  : "text-[var(--bb-color-text-secondary)] border-transparent hover:text-[var(--bb-color-text-primary)]"
              )}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'triggers' ? (
            <div className="p-4">
              {/* Change start trigger link (when editing) */}
              {triggerGroups.length > 0 && (
                <button
                  onClick={() => {
                    setTriggerGroups([]);
                  }}
                  className="flex items-center gap-1 text-sm text-[var(--bb-color-accent)] mb-4 hover:underline"
                >
                  <ChevronLeft size={16} />
                  Change start trigger
                </button>
              )}

              <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-3">
                Start when this happens
              </h3>

              {/* Manual trigger chip - always shown */}
              <div className="px-4 py-2.5 bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)] rounded-lg text-sm text-[var(--bb-color-text-primary)] mb-4">
                Manually triggered
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
                <span className="text-xs text-[var(--bb-color-text-tertiary)] font-medium">OR</span>
                <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
              </div>

              {/* Trigger groups */}
              {triggerGroups.map((group, index) => (
                <div key={group.id}>
                  <TriggerGroupCard
                    group={group}
                    index={index}
                    onDelete={() => handleDeleteGroup(index)}
                    onDuplicate={() => handleDuplicateGroup(index)}
                    onUpdate={(field, value) => handleUpdateScheduleGroup(index, field, value)}
                  />

                  {/* OR divider after each group */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
                    <span className="text-xs text-[var(--bb-color-text-tertiary)] font-medium">OR</span>
                    <div className="flex-1 h-px bg-[var(--bb-color-border-subtle)]" />
                  </div>
                </div>
              ))}

              {/* Add criteria button */}
              <button
                onClick={handleAddGroup}
                className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--bb-color-accent)] border border-[var(--bb-color-border-subtle)] rounded-lg hover:bg-[var(--bb-color-bg-elevated)]"
              >
                <Plus size={16} />
                Add criteria
              </button>

              {/* Enrollment conditions section */}
              <div className="mt-8">
                <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
                  Only enroll records that meet these conditions (optional)
                </h3>
                <p className="text-xs text-[var(--bb-color-text-tertiary)] mb-3">
                  This workflow doesn't have any criteria
                </p>
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--bb-color-accent)] text-white rounded-lg hover:bg-[var(--bb-color-accent-hover)]">
                  <Plus size={16} />
                  Add criteria
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Settings tab content */}
              <div className="space-y-6">
                {/* Re-enrollment */}
                <div>
                  <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-3">
                    Re-enrollment
                  </h3>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={settings.allowReenrollment}
                      onChange={(e) => setSettings(prev => ({ ...prev, allowReenrollment: e.target.checked }))}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm text-[var(--bb-color-text-primary)]">
                        Allow re-enrollment
                      </div>
                      <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                        Records can be enrolled in this workflow again after completing or exiting
                      </div>
                    </div>
                  </label>

                  {settings.allowReenrollment && (
                    <div className="mt-3 ml-7">
                      <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                        Minimum days before re-enrollment
                      </label>
                      <input
                        type="number"
                        value={settings.reenrollmentDelayDays}
                        onChange={(e) => setSettings(prev => ({ ...prev, reenrollmentDelayDays: parseInt(e.target.value) || 0 }))}
                        className={cn(
                          "w-24 h-8 px-2 rounded",
                          "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                          "text-sm text-[var(--bb-color-text-primary)]",
                          "focus:outline-none focus:border-[var(--bb-color-accent)]"
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Criteria selection panel (slides in from right) */}
      {showCriteriaPanel && (
        <div className="w-[350px] h-full bg-[var(--bb-color-bg-surface)] border-r border-[var(--bb-color-border-subtle)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)]">
              Add criteria
            </h3>
            <button
              onClick={() => {
                setShowCriteriaPanel(false);
                setEditingGroupIndex(null);
              }}
              className="text-sm text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-text-primary)]"
            >
              Cancel
            </button>
          </div>

          <div className="p-4">
            <p className="text-xs text-[var(--bb-color-text-tertiary)] mb-3">
              Select an event to trigger based on
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bb-color-text-tertiary)]"
              />
              <input
                type="text"
                placeholder="Search in criteria categories"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full h-9 pl-9 pr-3 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "placeholder:text-[var(--bb-color-text-tertiary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              />
            </div>
          </div>

          {/* Criteria options */}
          <div className="flex-1 overflow-auto">
            {/* Schedule option */}
            <button
              onClick={handleSelectSchedule}
              className="w-full px-4 py-3 text-left hover:bg-[var(--bb-color-bg-elevated)] border-b border-[var(--bb-color-border-subtle)]"
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-[var(--bb-color-text-tertiary)]" />
                <div>
                  <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                    Based on a schedule
                  </div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                    Example: Daily at 8:00 AM
                  </div>
                </div>
              </div>
            </button>

            {/* Filter option */}
            <button
              onClick={handleSelectFilter}
              className="w-full px-4 py-3 text-left hover:bg-[var(--bb-color-bg-elevated)] border-b border-[var(--bb-color-border-subtle)]"
            >
              <div className="flex items-center gap-3">
                <CheckSquare size={18} className="text-[var(--bb-color-text-tertiary)]" />
                <div>
                  <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                    When filter criteria is met
                  </div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                    Example: Status is equal to Active
                  </div>
                </div>
              </div>
            </button>

            {/* Event categories */}
            {Object.entries(TRIGGER_EVENT_CATEGORIES).map(([key, category]) => {
              const Icon = CATEGORY_ICONS[key] || Calendar;
              const isExpanded = expandedCategories[key];
              const color = category.color || '#6B7280';

              // Filter events by search
              const filteredEvents = searchQuery
                ? category.events.filter(e =>
                    e.label.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : category.events;

              if (searchQuery && filteredEvents.length === 0) return null;

              return (
                <div key={key} className="border-b border-[var(--bb-color-border-subtle)]">
                  <button
                    onClick={() => toggleCategory(key)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bb-color-bg-elevated)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon size={16} style={{ color }} />
                      </div>
                      <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                        {category.label}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-[var(--bb-color-text-tertiary)]" />
                    ) : (
                      <ChevronRight size={16} className="text-[var(--bb-color-text-tertiary)]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pb-2">
                      {filteredEvents.map((event) => (
                        <button
                          key={event.value}
                          onClick={() => handleSelectCriteria(key, event)}
                          className="w-full px-4 py-2 pl-14 text-left text-sm text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]"
                        >
                          {event.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop - click to close */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
      />
    </div>
  );
}

// Trigger group card component
function TriggerGroupCard({ group, index, onDelete, onDuplicate, onUpdate }) {
  if (group.type === 'event') {
    return (
      <div className="bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-accent)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
            Group {index + 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicate}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-text-secondary)]"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-status-negative)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="px-3 py-2 bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded text-sm text-[var(--bb-color-text-secondary)]">
            {group.eventLabel}
          </div>
        </div>
      </div>
    );
  }

  if (group.type === 'schedule') {
    return (
      <div className="bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-accent)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
            Group {index + 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicate}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-text-secondary)]"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-status-negative)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-3 space-y-3">
          <div className="text-sm text-[var(--bb-color-text-secondary)]">
            On a schedule
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
              Frequency *
            </label>
            <select
              value={group.frequency}
              onChange={(e) => onUpdate('frequency', e.target.value)}
              className={cn(
                "w-full h-9 px-3 rounded-md",
                "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
              Date *
            </label>
            <input
              type="date"
              value={group.date}
              onChange={(e) => onUpdate('date', e.target.value)}
              className={cn(
                "w-full h-9 px-3 rounded-md",
                "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
              Time of day *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={group.time}
                onChange={(e) => onUpdate('time', e.target.value)}
                className={cn(
                  "flex-1 h-9 px-3 rounded-md",
                  "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              />
              <span className="text-xs text-[var(--bb-color-text-tertiary)]">
                {group.timezone}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (group.type === 'filter') {
    return (
      <div className="bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-accent)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
            Group {index + 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicate}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-text-secondary)]"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-status-negative)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="px-3 py-2 bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded text-sm text-[var(--bb-color-text-tertiary)]">
            Your criteria will appear here
          </div>
        </div>
      </div>
    );
  }

  return null;
}
