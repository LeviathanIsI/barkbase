/**
 * BuilderLeftPanel - Left panel for the workflow builder
 * Shows trigger selection when no trigger is set, action categories otherwise
 */
import { useState } from 'react';
import {
  Search,
  Hand,
  Filter,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Calendar,
  PawPrint,
  User,
  CreditCard,
  CheckSquare,
  FileText,
  Zap,
  Info,
  Check,
  Database,
  MessageCircle,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import {
  TRIGGER_EVENT_CATEGORIES,
  ACTION_CATEGORIES,
  OBJECT_TYPE_CONFIG,
  OBJECT_PROPERTIES,
  CONDITION_OPERATORS,
} from '../../constants';
import PropertyValueInput from './PropertyValueInput';

// Icon mapping for object types
const OBJECT_TYPE_ICONS = {
  pet: PawPrint,
  booking: Calendar,
  owner: User,
  payment: CreditCard,
  task: CheckSquare,
  invoice: FileText,
};

// Icon mapping for generic event categories
const CATEGORY_ICONS = {
  data_values: Database,
  scheduling: Calendar,
  communications: MessageCircle,
  payments: CreditCard,
  automations: Zap,
  pet_health: Heart,
};

export default function BuilderLeftPanel() {
  const {
    workflow,
    panelMode,
    pendingTriggerType,
    pendingStepContext,
    setEntryCondition,
    setObjectType,
    setPendingTriggerType,
    clearSelection,
    addStep,
  } = useWorkflowBuilderStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Render nothing when panel is dormant (trigger configured, no action selected)
  if (panelMode === null) {
    return null;
  }

  // Render trigger selection panel (initial state)
  if (panelMode === 'trigger') {
    return (
      <TriggerSelectionPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedCategories={expandedCategories}
        toggleCategory={toggleCategory}
        setEntryCondition={setEntryCondition}
        setObjectType={setObjectType}
        setPendingTriggerType={setPendingTriggerType}
      />
    );
  }

  // Render trigger configuration panel (after selecting trigger type)
  if (panelMode === 'trigger_config') {
    return (
      <TriggerConfigPanel
        workflow={workflow}
        pendingTriggerType={pendingTriggerType}
        setEntryCondition={setEntryCondition}
        setObjectType={setObjectType}
        onCancel={clearSelection}
      />
    );
  }

  // Render action selection panel (when user clicks + button)
  if (panelMode === 'actions') {
    return (
      <ActionSelectionPanel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedCategories={expandedCategories}
        toggleCategory={toggleCategory}
        addStep={addStep}
        pendingStepContext={pendingStepContext}
      />
    );
  }

  // For 'config' mode, the StepConfigPanel on the right handles it
  return null;
}

// Progress stepper component
function ProgressStepper({ currentStep }) {
  const steps = [
    { key: 'triggers', label: 'Start triggers' },
    { key: 'records', label: 'Eligible records' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
      {steps.map((step, index) => {
        const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
        const isCurrent = step.key === currentStep;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {index > 0 && (
              <div className="w-6 h-px bg-[var(--bb-color-border-subtle)]" />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                  isCompleted && "bg-[#10B981] text-white",
                  isCurrent && "bg-[#F59E0B] text-white",
                  !isCompleted && !isCurrent && "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-tertiary)]"
                )}
              >
                {isCompleted ? <Check size={12} /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "text-[var(--bb-color-text-primary)] font-medium" : "text-[var(--bb-color-text-tertiary)]"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Map event categories to their object types
const EVENT_TO_OBJECT_TYPE = {
  // Data values events
  'property.changed': null, // depends on context
  // Scheduling events
  'booking.created': 'booking',
  'booking.updated': 'booking',
  'booking.confirmed': 'booking',
  'booking.cancelled': 'booking',
  'booking.checked_in': 'booking',
  'booking.checked_out': 'booking',
  // Pet health events
  'pet.vaccination_expiring': 'pet',
  'pet.vaccination_expired': 'pet',
  'pet.birthday': 'pet',
  'pet.created': 'pet',
  'pet.updated': 'pet',
  // Owner events
  'owner.created': 'owner',
  'owner.updated': 'owner',
  // Payment events
  'payment.completed': 'payment',
  'payment.failed': 'payment',
  'invoice.created': 'invoice',
  'invoice.overdue': 'invoice',
  // Task events
  'task.created': 'task',
  'task.completed': 'task',
  'task.overdue': 'task',
};

// Trigger selection panel component
function TriggerSelectionPanel({
  searchQuery,
  setSearchQuery,
  expandedCategories,
  toggleCategory,
  setEntryCondition,
  setObjectType,
  setPendingTriggerType,
}) {
  // Internal state for the multi-step flow
  const [flowStep, setFlowStep] = useState('triggers'); // triggers, records, settings
  const [selectedTriggerType, setSelectedTriggerType] = useState(null);
  const [selectedObjectType, setSelectedObjectType] = useState(null);
  const [objectSearchQuery, setObjectSearchQuery] = useState('');

  // Schedule config state
  const [scheduleConfig, setScheduleConfig] = useState({
    objectType: 'pet',
    frequency: 'daily',
    date: '',
    time: '09:00',
    timezone: 'America/New_York',
  });

  // Handle trigger type selection
  const handleTriggerTypeSelect = (triggerType) => {
    setSelectedTriggerType(triggerType);

    if (triggerType === 'schedule') {
      // For schedule, go directly to settings with embedded object type
      setFlowStep('settings');
    } else {
      // For manual and filter, go to object selection first
      setFlowStep('records');
    }
  };

  // Handle object type selection for manual/filter
  const handleObjectTypeSelect = (objectType) => {
    setSelectedObjectType(objectType);
  };

  // Handle save and continue from object selection (manual or filter_criteria)
  const handleSaveObjectSelection = () => {
    if (!selectedObjectType) return;

    // Set the object type first
    setObjectType(selectedObjectType);

    if (selectedTriggerType === 'filter_criteria') {
      // For filter criteria, go to trigger config panel to build the filter
      setPendingTriggerType('filter_criteria');
    } else {
      // For manual, save directly (no additional config needed)
      setEntryCondition({
        triggerType: 'manual',
        eventType: null,
        filterConfig: null,
        scheduleConfig: null,
      });
    }
  };

  // Handle save schedule config
  const handleSaveScheduleConfig = () => {
    // Set the object type from schedule config
    setObjectType(scheduleConfig.objectType);

    // Set the entry condition with schedule config (schedule is fully configured here)
    setEntryCondition({
      triggerType: 'schedule',
      eventType: null,
      filterConfig: null,
      scheduleConfig: {
        frequency: scheduleConfig.frequency,
        date: scheduleConfig.date,
        time: scheduleConfig.time,
        timezone: scheduleConfig.timezone,
      },
    });
  };

  // Handle event selection (from event categories)
  const handleEventSelect = (categoryKey, event) => {
    // Determine object type from the event
    const objectType = EVENT_TO_OBJECT_TYPE[event.value] || 'pet';

    // Set the object type
    setObjectType(objectType);

    // For most events, save directly
    // For property.changed, go to config panel
    if (event.value === 'property.changed') {
      setPendingTriggerType({ type: 'event', eventType: event.value });
    } else {
      // Set the entry condition with the event (no additional config needed)
      setEntryCondition({
        triggerType: 'event',
        eventType: event.value,
        filterConfig: null,
        scheduleConfig: null,
      });
    }
  };

  // Handle back button
  const handleBack = () => {
    if (flowStep === 'records' || flowStep === 'settings') {
      setFlowStep('triggers');
      setSelectedTriggerType(null);
      setSelectedObjectType(null);
    }
  };

  // Render object type selection screen (for manual/filter)
  if (flowStep === 'records' && (selectedTriggerType === 'manual' || selectedTriggerType === 'filter_criteria')) {
    const objectTypes = Object.entries(OBJECT_TYPE_CONFIG);
    const filteredObjectTypes = objectSearchQuery
      ? objectTypes.filter(([, config]) =>
          config.label.toLowerCase().includes(objectSearchQuery.toLowerCase())
        )
      : objectTypes;

    return (
      <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
        {/* Progress stepper */}
        <ProgressStepper currentStep="records" />

        {/* Header with back and save */}
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-text-primary)]"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={handleSaveObjectSelection}
            disabled={!selectedObjectType}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium",
              selectedObjectType
                ? "bg-[var(--bb-color-accent)] text-white hover:bg-[var(--bb-color-accent-hover)]"
                : "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-tertiary)] cursor-not-allowed"
            )}
          >
            Save and continue
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <h2 className="text-base font-semibold text-[var(--bb-color-text-primary)] mb-2">
            Choose a type of record that can enroll
          </h2>
          <p className="text-sm text-[var(--bb-color-text-tertiary)] mb-4">
            You'll be able to choose records to enroll when you turn on the workflow
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bb-color-text-tertiary)]"
            />
            <input
              type="text"
              placeholder="Search record types..."
              value={objectSearchQuery}
              onChange={(e) => setObjectSearchQuery(e.target.value)}
              className={cn(
                "w-full h-9 pl-9 pr-3 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>

          {/* Object type list */}
          <div className="space-y-2">
            {filteredObjectTypes.map(([key, config]) => {
              const Icon = OBJECT_TYPE_ICONS[key] || FileText;
              const isSelected = selectedObjectType === key;

              return (
                <button
                  key={key}
                  onClick={() => handleObjectTypeSelect(key)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                    "border transition-colors",
                    isSelected
                      ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
                      : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-hover)] hover:bg-[var(--bb-color-bg-elevated)]"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon size={20} style={{ color: config.color }} />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-[var(--bb-color-accent)]" : "text-[var(--bb-color-text-primary)]"
                    )}>
                      {config.label}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[var(--bb-color-accent)] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render schedule configuration screen
  if (flowStep === 'settings' && selectedTriggerType === 'schedule') {
    return (
      <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
        {/* Progress stepper */}
        <ProgressStepper currentStep="settings" />

        {/* Header with back and save */}
        <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-text-primary)]"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <button
            onClick={handleSaveScheduleConfig}
            className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--bb-color-accent)] text-white hover:bg-[var(--bb-color-accent-hover)]"
          >
            Save and continue
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <h2 className="text-base font-semibold text-[var(--bb-color-text-primary)] mb-4">
            Start when this happens
          </h2>

          {/* Schedule config card */}
          <div className="bg-[var(--bb-color-bg-body)] rounded-lg border border-[var(--bb-color-border-subtle)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-[var(--bb-color-accent)]" />
              <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                On a schedule
              </span>
            </div>

            {/* Enroll record type */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Enroll
              </label>
              <select
                value={scheduleConfig.objectType}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, objectType: e.target.value }))}
                className={cn(
                  "w-full h-9 px-3 rounded-md",
                  "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                {Object.entries(OBJECT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Frequency
              </label>
              <select
                value={scheduleConfig.frequency}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, frequency: e.target.value }))}
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
            <div className="mb-4">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={scheduleConfig.date}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, date: e.target.value }))}
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
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Time of day
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={scheduleConfig.time}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, time: e.target.value }))}
                  className={cn(
                    "flex-1 h-9 px-3 rounded-md",
                    "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "focus:outline-none focus:border-[var(--bb-color-accent)]"
                  )}
                />
                <span className="text-xs text-[var(--bb-color-text-tertiary)]">
                  {scheduleConfig.timezone}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Render initial trigger selection
  return (
    <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Choose a trigger to start this workflow
          </h2>
          <Info size={14} className="text-[var(--bb-color-text-tertiary)]" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bb-color-text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Search triggers, forms, properties..."
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

      {/* Trigger type buttons */}
      <div className="p-4 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex gap-2">
          <TriggerTypeButton
            icon={<Hand size={18} />}
            label="Trigger manually"
            onClick={() => handleTriggerTypeSelect('manual')}
          />
          <TriggerTypeButton
            icon={<Filter size={18} />}
            label="Met filter criteria"
            onClick={() => handleTriggerTypeSelect('filter_criteria')}
          />
          <TriggerTypeButton
            icon={<Clock size={18} />}
            label="On a schedule"
            onClick={() => handleTriggerTypeSelect('schedule')}
          />
        </div>
      </div>

      {/* Event categories */}
      <div className="flex-1 overflow-auto">
        {Object.entries(TRIGGER_EVENT_CATEGORIES).map(([key, category]) => {
          const Icon = CATEGORY_ICONS[key] || Zap;
          const isExpanded = expandedCategories[key];
          const categoryColor = category.color || '#6B7280';

          // Filter events by search query
          const filteredEvents = searchQuery
            ? category.events.filter((e) =>
                e.label.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : category.events;

          if (searchQuery && filteredEvents.length === 0) return null;

          return (
            <div key={key} className="border-b border-[var(--bb-color-border-subtle)]">
              <button
                onClick={() => toggleCategory(key)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-left",
                  "hover:bg-[var(--bb-color-bg-elevated)]",
                  "transition-colors"
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${categoryColor}20` }}
                >
                  <Icon
                    size={18}
                    style={{ color: categoryColor }}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                    {category.label}
                  </div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                    {category.description}
                  </div>
                </div>
                <ChevronRight size={18} className="text-[var(--bb-color-text-tertiary)]" />
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {filteredEvents.map((event) => (
                    <button
                      key={event.value}
                      onClick={() => handleEventSelect(key, event)}
                      className={cn(
                        "w-full px-4 py-2 pl-14 text-left",
                        "text-sm text-[var(--bb-color-text-secondary)]",
                        "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]"
                      )}
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

      {/* Skip trigger link */}
      <div className="p-4 border-t border-[var(--bb-color-border-subtle)]">
        <button
          onClick={() => {
            setEntryCondition({
              triggerType: 'manual',
              eventType: null,
              filterConfig: null,
              scheduleConfig: null,
            });
          }}
          className="text-sm text-[var(--bb-color-accent)] hover:underline"
        >
          Skip trigger and choose eligible records
        </button>
      </div>
    </div>
  );
}

// Trigger type button component
function TriggerTypeButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg",
        "border border-[var(--bb-color-border-subtle)]",
        "text-[var(--bb-color-text-secondary)]",
        "hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)]",
        "hover:bg-[var(--bb-color-accent-soft)]",
        "transition-colors"
      )}
    >
      {icon}
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  );
}

// Trigger configuration panel component
function TriggerConfigPanel({
  workflow,
  pendingTriggerType,
  setEntryCondition,
  setObjectType,
  onCancel,
}) {
  // Get properties for the current object type
  const objectType = workflow?.objectType || 'pet';
  const properties = OBJECT_PROPERTIES[objectType] || [];

  // State for filter configuration
  const [filterConditions, setFilterConditions] = useState([
    { field: '', operator: '', value: '' }
  ]);

  // State for property change configuration
  const [propertyConfig, setPropertyConfig] = useState({
    objectType: objectType,
    propertyName: '',
  });

  // Get property definition by name
  const getPropertyByName = (propName, objType = objectType) => {
    const props = OBJECT_PROPERTIES[objType] || [];
    return props.find(p => p.name === propName);
  };

  // Get operators for a property type
  const getOperatorsForProperty = (property) => {
    if (!property) return [];
    const type = property.type || 'text';
    return CONDITION_OPERATORS[type] || CONDITION_OPERATORS.text || [];
  };

  // Handle save for filter_criteria
  const handleSaveFilterConfig = () => {
    setEntryCondition({
      triggerType: 'filter_criteria',
      eventType: null,
      filterConfig: {
        conditions: filterConditions,
        logic: 'and',
      },
      scheduleConfig: null,
    });
  };

  // Handle save for property.changed event
  const handleSavePropertyConfig = () => {
    setObjectType(propertyConfig.objectType);
    setEntryCondition({
      triggerType: 'event',
      eventType: 'property.changed',
      filterConfig: {
        objectType: propertyConfig.objectType,
        propertyName: propertyConfig.propertyName,
      },
      scheduleConfig: null,
    });
  };

  // Add a condition row
  const addCondition = () => {
    setFilterConditions([...filterConditions, { field: '', operator: '', value: '' }]);
  };

  // Update a condition
  const updateCondition = (index, updates) => {
    const newConditions = [...filterConditions];
    // If field changed, reset operator and value
    if (updates.field !== undefined && updates.field !== newConditions[index].field) {
      newConditions[index] = { field: updates.field, operator: '', value: '' };
    } else {
      newConditions[index] = { ...newConditions[index], ...updates };
    }
    setFilterConditions(newConditions);
  };

  // Remove a condition
  const removeCondition = (index) => {
    if (filterConditions.length > 1) {
      setFilterConditions(filterConditions.filter((_, i) => i !== index));
    }
  };

  // Determine which config to show
  const isPropertyChange = pendingTriggerType?.type === 'event' && pendingTriggerType?.eventType === 'property.changed';
  const isFilterCriteria = pendingTriggerType === 'filter_criteria';

  // Properties for property change config
  const propertyChangeProperties = OBJECT_PROPERTIES[propertyConfig.objectType] || [];

  return (
    <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-sm text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-text-primary)]"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={isPropertyChange ? handleSavePropertyConfig : handleSaveFilterConfig}
          className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--bb-color-accent)] text-white hover:bg-[var(--bb-color-accent-hover)]"
        >
          Save
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isPropertyChange ? (
          // Property change configuration
          <>
            <h2 className="text-base font-semibold text-[var(--bb-color-text-primary)] mb-2">
              Property Changed Trigger
            </h2>
            <p className="text-sm text-[var(--bb-color-text-tertiary)] mb-4">
              Trigger when a specific property value changes on a record
            </p>

            {/* Object type */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Record type
              </label>
              <select
                value={propertyConfig.objectType}
                onChange={(e) => setPropertyConfig(prev => ({ ...prev, objectType: e.target.value, propertyName: '' }))}
                className={cn(
                  "w-full h-9 px-3 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                {Object.entries(OBJECT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Property name */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Property
              </label>
              <select
                value={propertyConfig.propertyName}
                onChange={(e) => setPropertyConfig(prev => ({ ...prev, propertyName: e.target.value }))}
                className={cn(
                  "w-full h-9 px-3 rounded-md",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "focus:outline-none focus:border-[var(--bb-color-accent)]"
                )}
              >
                <option value="">Select a property...</option>
                {propertyChangeProperties.map((prop) => (
                  <option key={prop.name} value={prop.name}>{prop.label}</option>
                ))}
              </select>
            </div>
          </>
        ) : isFilterCriteria ? (
          // Filter criteria configuration
          <>
            <h2 className="text-base font-semibold text-[var(--bb-color-text-primary)] mb-2">
              Filter Conditions
            </h2>
            <p className="text-sm text-[var(--bb-color-text-tertiary)] mb-4">
              Define conditions that records must meet to be enrolled
            </p>

            {/* Condition rows */}
            <div className="space-y-3">
              {filterConditions.map((condition, index) => {
                const selectedProperty = getPropertyByName(condition.field);
                const operators = getOperatorsForProperty(selectedProperty);
                const noValueOperators = ['is_known', 'is_unknown', 'is_true', 'is_false'];
                const showValueInput = condition.operator && !noValueOperators.includes(condition.operator);

                return (
                  <div key={index} className="bg-[var(--bb-color-bg-body)] rounded-lg border border-[var(--bb-color-border-subtle)] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-[var(--bb-color-text-tertiary)]">
                        {index === 0 ? 'Where' : 'And'}
                      </span>
                      {filterConditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(index)}
                          className="ml-auto text-xs text-[var(--bb-color-text-tertiary)] hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Field */}
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      className={cn(
                        "w-full h-8 px-2 rounded mb-2",
                        "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                        "text-sm text-[var(--bb-color-text-primary)]",
                        "focus:outline-none focus:border-[var(--bb-color-accent)]"
                      )}
                    >
                      <option value="">Select field...</option>
                      {properties.map((prop) => (
                        <option key={prop.name} value={prop.name}>{prop.label}</option>
                      ))}
                    </select>

                    {/* Operator - only show if field is selected */}
                    {condition.field && (
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, { operator: e.target.value, value: '' })}
                        className={cn(
                          "w-full h-8 px-2 rounded mb-2",
                          "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                          "text-sm text-[var(--bb-color-text-primary)]",
                          "focus:outline-none focus:border-[var(--bb-color-accent)]"
                        )}
                      >
                        <option value="">Select operator...</option>
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    )}

                    {/* Value - dynamic based on property type */}
                    {showValueInput && (
                      <PropertyValueInput
                        property={selectedProperty}
                        value={condition.value}
                        onChange={(val) => updateCondition(index, { value: val })}
                        operator={condition.operator}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add condition button */}
            <button
              onClick={addCondition}
              className="mt-3 w-full py-2 text-sm text-[var(--bb-color-accent)] hover:underline"
            >
              + Add condition
            </button>
          </>
        ) : (
          // Unknown state
          <div className="text-sm text-[var(--bb-color-text-tertiary)]">
            Unknown trigger configuration type
          </div>
        )}
      </div>
    </div>
  );
}

// Action selection panel component
function ActionSelectionPanel({
  searchQuery,
  setSearchQuery,
  expandedCategories,
  toggleCategory,
  addStep,
  pendingStepContext,
}) {
  const handleActionSelect = (action) => {
    const stepType = action.stepType || 'action';
    const actionType = action.stepType ? null : action.type;
    const afterStepId = pendingStepContext?.afterStepId || null;
    const branchPath = pendingStepContext?.branchPath || null;
    addStep(stepType, actionType, afterStepId, branchPath);
  };

  return (
    <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Add an action
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bb-color-text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Search actions..."
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

      {/* Action categories */}
      <div className="flex-1 overflow-auto">
        {Object.entries(ACTION_CATEGORIES).map(([key, category]) => {
          const isExpanded = expandedCategories[key] !== false; // Default expanded

          // Filter actions by search query
          const filteredActions = searchQuery
            ? category.actions.filter((a) =>
                a.label.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : category.actions;

          if (searchQuery && filteredActions.length === 0) return null;

          return (
            <div key={key} className="border-b border-[var(--bb-color-border-subtle)]">
              <button
                onClick={() => toggleCategory(key)}
                className={cn(
                  "w-full px-4 py-3 flex items-center justify-between text-left",
                  "hover:bg-[var(--bb-color-bg-elevated)]",
                  "transition-colors"
                )}
              >
                <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                  {category.label}
                </span>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-[var(--bb-color-text-tertiary)]" />
                ) : (
                  <ChevronRight size={18} className="text-[var(--bb-color-text-tertiary)]" />
                )}
              </button>

              {isExpanded && (
                <div className="pb-2">
                  {filteredActions.map((action) => (
                    <button
                      key={action.type || action.stepType}
                      onClick={() => handleActionSelect(action)}
                      className={cn(
                        "w-full px-4 py-2 flex items-center gap-3 text-left",
                        "hover:bg-[var(--bb-color-bg-elevated)]"
                      )}
                    >
                      <ActionIcon name={action.icon} />
                      <span className="text-sm text-[var(--bb-color-text-secondary)]">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Action icon component (maps icon names to lucide icons)
function ActionIcon({ name }) {
  // Simple static mapping for common icons
  const iconMap = {
    smartphone: <PhoneIcon />,
    mail: <MailIcon />,
    bell: <BellIcon />,
    'check-square': <CheckSquare size={14} />,
    'edit-3': <EditIcon />,
    'user-plus': <UserPlusIcon />,
    'user-minus': <UserMinusIcon />,
    'log-in': <LogInIcon />,
    'log-out': <LogOutIcon />,
    clock: <Clock size={14} />,
    'git-branch': <GitBranchIcon />,
    shield: <ShieldIcon />,
    square: <SquareIcon />,
    send: <SendIcon />,
  };

  return iconMap[name] || <Zap size={14} className="text-[var(--bb-color-text-tertiary)]" />;
}

// Simple icon components
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
  );
}

function UserMinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
      <polyline points="10 17 15 12 10 7"></polyline>
      <line x1="15" y1="12" x2="3" y2="12"></line>
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--bb-color-text-tertiary)]">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}
