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
  Calendar,
  PawPrint,
  User,
  CreditCard,
  CheckSquare,
  FileText,
  Zap,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import {
  TRIGGER_TYPE_CONFIG,
  TRIGGER_EVENT_CATEGORIES,
  ACTION_CATEGORIES,
  OBJECT_TYPE_CONFIG,
} from '../../constants';

// Icon mapping
const CATEGORY_ICONS = {
  booking: Calendar,
  pet: PawPrint,
  owner: User,
  payment: CreditCard,
  invoice: FileText,
  task: CheckSquare,
};

export default function BuilderLeftPanel({ onAddStep }) {
  const {
    workflow,
    panelMode,
    selectedStepId,
    setEntryCondition,
    setObjectType,
    selectStep,
  } = useWorkflowBuilderStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryKey) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Render trigger selection panel
  if (panelMode === 'trigger') {
    return (
      <TriggerSelectionPanel
        workflow={workflow}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedCategories={expandedCategories}
        toggleCategory={toggleCategory}
        setEntryCondition={setEntryCondition}
        setObjectType={setObjectType}
      />
    );
  }

  // Render action selection panel
  return (
    <ActionSelectionPanel
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      expandedCategories={expandedCategories}
      toggleCategory={toggleCategory}
      onAddStep={onAddStep}
      selectedStepId={selectedStepId}
      selectStep={selectStep}
    />
  );
}

// Trigger selection panel component
function TriggerSelectionPanel({
  workflow,
  searchQuery,
  setSearchQuery,
  expandedCategories,
  toggleCategory,
  setEntryCondition,
  setObjectType,
}) {
  const handleTriggerTypeSelect = (triggerType) => {
    setEntryCondition({
      ...workflow.entryCondition,
      triggerType,
    });
  };

  const handleEventSelect = (categoryKey, event) => {
    // Set the object type based on the event category
    setObjectType(categoryKey);
    setEntryCondition({
      triggerType: 'event',
      eventType: event.value,
      filterConfig: null,
      scheduleConfig: null,
    });
  };

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
                  style={{ backgroundColor: `${OBJECT_TYPE_CONFIG[key]?.color}20` }}
                >
                  <Icon
                    size={18}
                    style={{ color: OBJECT_TYPE_CONFIG[key]?.color }}
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
                {isExpanded ? (
                  <ChevronDown size={18} className="text-[var(--bb-color-text-tertiary)]" />
                ) : (
                  <ChevronRight size={18} className="text-[var(--bb-color-text-tertiary)]" />
                )}
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

// Action selection panel component
function ActionSelectionPanel({
  searchQuery,
  setSearchQuery,
  expandedCategories,
  toggleCategory,
  onAddStep,
}) {
  const handleActionSelect = (action) => {
    const stepType = action.stepType || 'action';
    const actionType = action.stepType ? null : action.type;
    onAddStep?.(stepType, actionType);
  };

  return (
    <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            Add an action
          </h2>
          <button
            onClick={() => selectStep('trigger')}
            className="text-xs text-[var(--bb-color-accent)] hover:underline"
          >
            Edit trigger
          </button>
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
          const isExpanded = expandedCategories[key] !== false; // Default to expanded

          // Filter actions by search query
          const filteredActions = searchQuery
            ? category.actions.filter((a) =>
                a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.description.toLowerCase().includes(searchQuery.toLowerCase())
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
                      key={action.type}
                      onClick={() => handleActionSelect(action)}
                      className={cn(
                        "w-full px-4 py-2 flex items-center gap-3 text-left",
                        "hover:bg-[var(--bb-color-bg-elevated)]"
                      )}
                    >
                      <div className="w-7 h-7 rounded bg-[var(--bb-color-bg-elevated)] flex items-center justify-center">
                        <ActionIcon name={action.icon} />
                      </div>
                      <div>
                        <div className="text-sm text-[var(--bb-color-text-primary)]">
                          {action.label}
                        </div>
                        <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                          {action.description}
                        </div>
                      </div>
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
