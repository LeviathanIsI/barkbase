/**
 * Workflow Builder / Editor
 * HubSpot-inspired builder with contextual left panel and workflow canvas
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Play,
  Pause,
  Trash2,
  MessageSquare,
  Mail,
  Bell,
  Clock,
  Split,
  StopCircle,
  ClipboardList,
  Users,
  Tag,
  Edit3,
  Loader2,
  AlertCircle,
  Zap,
  X,
  Search,
  Flag,
  Hand,
  Filter,
  Calendar,
  RefreshCw,
  Sparkles,
  Webhook,
  ArrowRight,
  CheckCircle2,
  FileText,
  Copy,
  Save,
  MoreHorizontal,
  Undo,
  Redo,
  Globe,
  Database,
  Megaphone,
  Bot,
  PawPrint,
  CreditCard,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import {
  getWorkflow,
  updateWorkflow,
  getWorkflowSteps,
  updateWorkflowSteps,
  activateWorkflow,
  pauseWorkflow,
} from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Object type configuration
const OBJECT_TYPE_CONFIG = {
  pet: { label: 'Pet', icon: PawPrint },
  booking: { label: 'Booking', icon: Calendar },
  owner: { label: 'Owner', icon: Users },
  payment: { label: 'Payment', icon: CreditCard },
  task: { label: 'Task', icon: ClipboardList },
  invoice: { label: 'Invoice', icon: FileText },
};

// Trigger categories with HubSpot-style descriptions
const TRIGGER_CATEGORIES = [
  {
    id: 'data_values',
    label: 'Data values',
    description: 'When data is created, changed or meets conditions',
    icon: Database,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  {
    id: 'communication',
    label: 'Emails, calls, & communication',
    description: 'When information is sent or discussed',
    icon: Mail,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'operations',
    label: 'Operations & tasks',
    description: 'When bookings, check-ins, or tasks occur',
    icon: ClipboardList,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'automations',
    label: 'Automations triggered',
    description: 'When automated steps start or complete',
    icon: RefreshCw,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'custom',
    label: 'Custom events & external events',
    description: 'Requires custom configuration',
    icon: Webhook,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
];

// Event options by category
const TRIGGER_EVENTS = {
  data_values: [
    { id: 'pet.created', label: 'Pet is created', objectType: 'pet' },
    { id: 'pet.updated', label: 'Pet property changed', objectType: 'pet' },
    { id: 'owner.created', label: 'Owner is created', objectType: 'owner' },
    { id: 'owner.updated', label: 'Owner property changed', objectType: 'owner' },
    { id: 'pet.vaccination_expiring', label: 'Vaccination expiring (7 days)', objectType: 'pet' },
    { id: 'pet.vaccination_expired', label: 'Vaccination expired', objectType: 'pet' },
    { id: 'pet.birthday', label: 'Pet birthday', objectType: 'pet' },
  ],
  communication: [
    { id: 'email.sent', label: 'Email sent', objectType: 'owner' },
    { id: 'email.opened', label: 'Email opened', objectType: 'owner' },
    { id: 'sms.sent', label: 'SMS sent', objectType: 'owner' },
    { id: 'sms.received', label: 'SMS received', objectType: 'owner' },
  ],
  operations: [
    { id: 'booking.created', label: 'Booking created', objectType: 'booking' },
    { id: 'booking.confirmed', label: 'Booking confirmed', objectType: 'booking' },
    { id: 'booking.checked_in', label: 'Pet checked in', objectType: 'booking' },
    { id: 'booking.checked_out', label: 'Pet checked out', objectType: 'booking' },
    { id: 'booking.cancelled', label: 'Booking cancelled', objectType: 'booking' },
    { id: 'task.created', label: 'Task created', objectType: 'task' },
    { id: 'task.completed', label: 'Task completed', objectType: 'task' },
    { id: 'task.overdue', label: 'Task overdue', objectType: 'task' },
  ],
  automations: [
    { id: 'workflow.enrolled', label: 'Enrolled in workflow', objectType: 'pet' },
    { id: 'workflow.completed', label: 'Completed workflow', objectType: 'pet' },
    { id: 'workflow.unenrolled', label: 'Unenrolled from workflow', objectType: 'pet' },
  ],
  custom: [
    { id: 'webhook.received', label: 'Webhook is received', objectType: 'pet' },
  ],
};

// Action categories
const ACTION_CATEGORIES = [
  {
    id: 'ai',
    label: 'AI',
    description: 'Ask AI to do anything',
    icon: Bot,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    id: 'communications',
    label: 'Communications',
    description: 'Send emails and notifications to your customers and team',
    icon: MessageSquare,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Create and update CRM records and property values',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Manage records and statuses for your segments and lists',
    icon: Megaphone,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'data_ops',
    label: 'Data ops',
    description: 'Create code or webhooks for your apps, and format data',
    icon: Globe,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

// Action options by category
const ACTION_OPTIONS = {
  ai: [
    { id: 'ai_action', label: 'Ask AI to do anything', description: 'Let AI handle complex logic' },
  ],
  communications: [
    { id: 'send_sms', label: 'Send SMS', description: 'Send SMS message to owner' },
    { id: 'send_email', label: 'Send Email', description: 'Send email to owner' },
    { id: 'send_notification', label: 'Send in-app notification', description: 'Notify staff members' },
  ],
  crm: [
    { id: 'update_field', label: 'Set property value', description: 'Update a field value' },
    { id: 'copy_property', label: 'Copy property value', description: 'Copy value to another field' },
    { id: 'clear_property', label: 'Clear property value', description: 'Remove field value' },
  ],
  marketing: [
    { id: 'add_to_segment', label: 'Add to segment', description: 'Add record to a segment' },
    { id: 'remove_from_segment', label: 'Remove from segment', description: 'Remove record from segment' },
  ],
  data_ops: [
    { id: 'create_task', label: 'Create task', description: 'Create a task for staff' },
    { id: 'webhook', label: 'Send webhook', description: 'Send data to external system' },
    { id: 'custom_code', label: 'Custom code', description: 'Run custom logic' },
  ],
};

// Step type icons
const STEP_TYPE_ICONS = {
  send_sms: MessageSquare,
  send_email: Mail,
  send_notification: Bell,
  create_task: ClipboardList,
  update_field: Edit3,
  add_to_segment: Tag,
  remove_from_segment: Tag,
  delay: Clock,
  branch: Split,
  webhook: Webhook,
  terminus: StopCircle,
};

// Panel types
const PANEL_TYPES = {
  TRIGGER: 'trigger',
  OBJECT_TYPE: 'object_type',
  ACTION: 'action',
  STEP_CONFIG: 'step_config',
  NONE: null,
};

// ========== Trigger Type Option Card (with illustration style) ==========
// eslint-disable-next-line no-unused-vars
const TriggerTypeCard = ({ icon: Icon, label, description, badge, selected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
      selected
        ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
        : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-border-default)] hover:bg-[color:var(--bb-color-bg-elevated)]'
    )}
  >
    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[color:var(--bb-color-bg-elevated)] to-[color:var(--bb-color-bg-surface)] border border-[color:var(--bb-color-border-subtle)] flex items-center justify-center shrink-0">
      <Icon className="h-7 w-7 text-[color:var(--bb-color-accent)]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">{label}</p>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-500">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">{description}</p>
    </div>
    {selected && <CheckCircle2 className="h-5 w-5 text-[color:var(--bb-color-accent)] shrink-0" />}
  </button>
);

// ========== Category Accordion ==========
const CategoryAccordion = ({ category, expanded, onToggle, children }) => {
  const Icon = category.icon;
  
  return (
    <div className="border-b border-[color:var(--bb-color-border-subtle)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3 px-1 hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
      >
        <ChevronRight className={cn('h-4 w-4 text-[color:var(--bb-color-text-muted)] transition-transform', expanded && 'rotate-90')} />
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', category.bgColor)}>
          <Icon className={cn('h-4 w-4', category.color)} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{category.label}</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{category.description}</p>
        </div>
      </button>
      {expanded && (
        <div className="pb-2 pl-12">
          {children}
        </div>
      )}
    </div>
  );
};

// ========== Trigger Panel ==========
const TriggerPanel = ({ workflow, onSave, onCancel, onSelectObjectType }) => {
  const [triggerType, setTriggerType] = useState(workflow?.entry_condition?.trigger_type || 'manual');
  const [selectedEvent, setSelectedEvent] = useState(workflow?.entry_condition?.event_type || null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSave = () => {
    const entryCondition = {
      trigger_type: triggerType,
      event_type: selectedEvent,
    };
    onSave({ entry_condition: entryCondition });
  };

  // eslint-disable-next-line no-unused-vars
  const getTriggerSummary = () => {
    if (triggerType === 'manual') return 'Manually triggered only';
    if (selectedEvent) {
      const allEvents = Object.values(TRIGGER_EVENTS).flat();
      const event = allEvents.find(e => e.id === selectedEvent);
      return event?.label || selectedEvent;
    }
    return 'Configuring...';
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event.id);
    // Auto-set object type based on event
    if (event.objectType && workflow?.object_type !== event.objectType) {
      onSave({ 
        entry_condition: { trigger_type: 'event', event_type: event.id },
        object_type: event.objectType 
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--bb-color-bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--bb-color-border-subtle)]">
        <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">Triggers</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[color:var(--bb-color-border-subtle)]">
        <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)] -mb-px">
          Start triggers
        </button>
        <button className="px-4 py-2.5 text-sm font-medium text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search triggers, forms, properties, emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] focus:border-transparent"
          />
        </div>

        {/* Quick trigger type buttons */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'manual', label: 'Trigger manually', icon: Hand },
            { id: 'filter_criteria', label: 'Met filter criteria', icon: Filter },
            { id: 'schedule', label: 'On a schedule', icon: Calendar },
          ].map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setTriggerType(type.id);
                  if (type.id === 'manual') setSelectedEvent(null);
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border text-center flex-1 transition-all',
                  triggerType === type.id
                    ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
                    : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-border-default)]'
                )}
              >
                <Icon className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)] leading-tight">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Trigger categories */}
        <div className="space-y-0 border border-[color:var(--bb-color-border-subtle)] rounded-lg overflow-hidden">
          {TRIGGER_CATEGORIES.map((category) => {
            const events = TRIGGER_EVENTS[category.id] || [];
            const isExpanded = expandedCategory === category.id;

            return (
              <CategoryAccordion
                key={category.id}
                category={category}
                expanded={isExpanded}
                onToggle={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setTriggerType('event');
                      handleEventSelect(event);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors',
                      selectedEvent === event.id
                        ? 'bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]'
                        : 'text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                    )}
                  >
                    <span>{event.label}</span>
                    {selectedEvent === event.id && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                  </button>
                ))}
              </CategoryAccordion>
            );
          })}
        </div>

        {/* Skip trigger link */}
        <button 
          onClick={onSelectObjectType}
          className="mt-4 text-sm text-[color:var(--bb-color-accent)] hover:underline"
        >
          Skip trigger and choose eligible records
        </button>
      </div>
    </div>
  );
};

// ========== Object Type Selection Panel ==========
const ObjectTypePanel = ({ workflow, onSave, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(workflow?.object_type || 'pet');

  const filteredTypes = Object.entries(OBJECT_TYPE_CONFIG).filter(([, config]) =>
    config.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    onSave({ object_type: selectedType });
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--bb-color-bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--bb-color-border-subtle)]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </Button>
        </div>
        <Button size="sm" onClick={handleSave}>Save and continue</Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-[color:var(--bb-color-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-[color:var(--bb-color-accent)] flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">Start triggers</span>
          </div>
          <div className="flex-1 h-0.5 bg-[color:var(--bb-color-accent)]" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full border-2 border-[color:var(--bb-color-accent)] bg-transparent" />
            <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">Eligible records</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-base font-semibold text-[color:var(--bb-color-text-primary)] mb-1">
          Choose a type of record that can enroll
        </h3>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
          You'll be able to choose records to enroll when you turn on the workflow
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] focus:border-transparent"
          />
        </div>

        {/* Object type list */}
        <div className="space-y-1">
          {filteredTypes.map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                selectedType === type
                  ? 'bg-[color:var(--bb-color-accent-soft)]'
                  : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
              )}
            >
              <span className={cn(
                'text-sm font-medium',
                selectedType === type ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-primary)]'
              )}>
                {config.label}
              </span>
              {selectedType === type && <CheckCircle2 className="h-4 w-4 text-[color:var(--bb-color-accent)] ml-auto" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ========== Action Panel ==========
const ActionPanel = ({ onAddStep, onCancel }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectAction = (actionId) => {
    onAddStep({
      step_type: 'action',
      action_type: actionId,
      config: {},
    });
  };

  const handleSelectQuickAction = (actionId) => {
    if (actionId === 'delay') {
      onAddStep({
        step_type: 'wait',
        action_type: null,
        config: { duration: 1, unit: 'days' },
      });
    } else if (actionId === 'branch') {
      onAddStep({
        step_type: 'determinator',
        action_type: null,
        config: {},
      });
    } else {
      toast.info(`${actionId} coming soon`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--bb-color-bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--bb-color-border-subtle)]">
        <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">Choose an action</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* AI Generate */}
        <div className="p-4 rounded-xl border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] mb-6">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-pink-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Generate actions with AI</p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5 mb-3">
                Describe your workflow and AI will build actions for you.
              </p>
              <Button size="sm" onClick={() => toast.info('AI actions coming soon')}>
                Use AI to generate
              </Button>
            </div>
          </div>
        </div>

        {/* Browse all actions */}
        <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3">Browse all actions</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search actions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] focus:border-transparent"
          />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'delay', label: 'Delay', icon: Clock },
            { id: 'branch', label: 'Branch', icon: Split },
            { id: 'go_to_workflow', label: 'Go to workflow', icon: ArrowRight },
            { id: 'go_to_action', label: 'Go to action', icon: ArrowRight },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleSelectQuickAction(action.id)}
                className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-border-default)] transition-colors"
              >
                <Icon className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-[10px] font-medium text-[color:var(--bb-color-text-primary)] whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* BarkBase section */}
        <p className="text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase tracking-wider mb-3">BarkBase</p>

        {/* Action categories */}
        <div className="space-y-0 border border-[color:var(--bb-color-border-subtle)] rounded-lg overflow-hidden">
          {ACTION_CATEGORIES.map((category) => {
            const actions = ACTION_OPTIONS[category.id] || [];
            const isExpanded = expandedCategory === category.id;

            return (
              <CategoryAccordion
                key={category.id}
                category={category}
                expanded={isExpanded}
                onToggle={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action.id)}
                    className="w-full flex flex-col px-3 py-2 rounded-md text-left hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                  >
                    <span className="text-sm text-[color:var(--bb-color-text-primary)]">{action.label}</span>
                    <span className="text-xs text-[color:var(--bb-color-text-muted)]">{action.description}</span>
                  </button>
                ))}
              </CategoryAccordion>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ========== Step Configuration Panel ==========
const StepConfigPanel = ({ step, onSave, onCancel, onDelete }) => {
  const [config, setConfig] = useState(step?.config || {});

  const handleSave = () => {
    onSave({ ...step, config });
  };

  const getStepLabel = () => {
    if (step.step_type === 'wait') return 'Delay';
    if (step.step_type === 'determinator') return 'Branch';
    const actionConfig = Object.values(ACTION_OPTIONS).flat().find(a => a.id === step.action_type);
    return actionConfig?.label || step.action_type || 'Configure step';
  };

  return (
    <div className="h-full flex flex-col bg-[color:var(--bb-color-bg-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--bb-color-border-subtle)]">
        <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">{getStepLabel()}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
          You are currently editing this action...
        </p>

        {/* Wait/Delay configuration */}
        {step.step_type === 'wait' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Delay duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={config.duration || 1}
                  onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 1 })}
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                />
                <select
                  value={config.unit || 'days'}
                  onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SMS configuration */}
        {step.action_type === 'send_sms' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                rows={4}
                placeholder="Enter SMS message..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
              />
            </div>
          </div>
        )}

        {/* Email configuration */}
        {step.action_type === 'send_email' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Subject</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                placeholder="Email subject..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                rows={6}
                placeholder="Email body..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
              />
            </div>
          </div>
        )}

        {/* Task configuration */}
        {step.action_type === 'create_task' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Task title</label>
              <input
                type="text"
                value={config.task_title || ''}
                onChange={(e) => setConfig({ ...config, task_title: e.target.value })}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Description</label>
              <textarea
                value={config.task_description || ''}
                onChange={(e) => setConfig({ ...config, task_description: e.target.value })}
                rows={3}
                placeholder="Task description..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
              />
            </div>
          </div>
        )}

        {/* Generic placeholder for other types */}
        {!['wait'].includes(step.step_type) && !['send_sms', 'send_email', 'create_task'].includes(step.action_type) && (
          <div className="p-4 rounded-lg bg-[color:var(--bb-color-bg-elevated)] text-center">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">Configuration options coming soon</p>
          </div>
        )}

        {/* Delete button */}
        <div className="mt-8 pt-4 border-t border-[color:var(--bb-color-border-subtle)]">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Delete this step?')) onDelete(step.id);
            }}
            className="w-full text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete step
          </Button>
        </div>
      </div>
    </div>
  );
};

// ========== Workflow Canvas ==========
const WorkflowCanvas = ({ workflow, steps, onEditTrigger, onAddStep, onEditStep }) => {
  const objectConfig = OBJECT_TYPE_CONFIG[workflow?.object_type] || OBJECT_TYPE_CONFIG.pet;

  const getTriggerSummary = () => {
    const ec = workflow?.entry_condition || {};
    if (ec.trigger_type === 'manual') return 'Manually triggered only';
    if (ec.event_type) {
      const allEvents = Object.values(TRIGGER_EVENTS).flat();
      const event = allEvents.find(e => e.id === ec.event_type);
      return event?.label || ec.event_type;
    }
    return 'Configuring...';
  };

  const getStepLabel = (step) => {
    if (step.step_type === 'wait') {
      const config = step.config || {};
      if (config.duration && config.unit) {
        return `Delay ${config.duration} ${config.unit}`;
      }
      return 'Delay';
    }
    if (step.step_type === 'determinator') return 'Branch';
    if (step.step_type === 'terminus') return 'End workflow';

    const actionConfig = Object.values(ACTION_OPTIONS).flat().find(a => a.id === step.action_type);
    return actionConfig?.label || step.action_type || 'Action';
  };

  const getStepIcon = (step) => {
    if (step.step_type === 'wait') return Clock;
    if (step.step_type === 'determinator') return Split;
    if (step.step_type === 'terminus') return StopCircle;
    return STEP_TYPE_ICONS[step.action_type] || Zap;
  };

  return (
    <div className="flex-1 overflow-auto bg-[color:var(--bb-color-bg-base)]">
      <div className="min-h-full p-8 flex justify-center">
        <div className="w-full max-w-md">
          {/* Trigger Card */}
          <div
            onClick={onEditTrigger}
            className="p-5 rounded-xl border-2 border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-bg-surface)] cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flag className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
              <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">
                Trigger enrollment for {objectConfig.label.toLowerCase()}s
              </span>
            </div>
            
            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">When this happens</p>
            
            <div className="px-4 py-3 rounded-lg bg-[color:var(--bb-color-bg-elevated)] border border-[color:var(--bb-color-border-subtle)]">
              <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1">Group 1</p>
              <p className="text-sm text-[color:var(--bb-color-text-primary)]">{getTriggerSummary()}</p>
            </div>
            
            <div className="flex items-center justify-between mt-4 text-xs">
              <div className="flex items-center gap-2 text-[color:var(--bb-color-text-muted)]">
                <RefreshCw className="h-3 w-3" />
                <span>Re-enroll off</span>
              </div>
              <span className="text-[color:var(--bb-color-accent)] font-medium cursor-pointer hover:underline">Details</span>
            </div>
          </div>

          {/* Connector + Add Button */}
          <div className="flex flex-col items-center py-1">
            <div className="w-px h-6 bg-[color:var(--bb-color-border-subtle)]" />
            <button
              onClick={() => onAddStep(0)}
              className="group flex items-center justify-center h-7 w-7 rounded-full border-2 border-dashed border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)] transition-all"
            >
              <Plus className="h-4 w-4 text-[color:var(--bb-color-text-muted)] group-hover:text-[color:var(--bb-color-accent)]" />
            </button>
            <div className="w-px h-6 bg-[color:var(--bb-color-border-subtle)]" />
          </div>

          {/* Steps */}
          {steps.map((step, index) => {
            const Icon = getStepIcon(step);
            return (
              <div key={step.id}>
                {/* Step Card */}
                <div
                  onClick={() => onEditStep(step)}
                  className="p-4 rounded-xl border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] cursor-pointer hover:shadow-lg hover:border-[color:var(--bb-color-border-default)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center">
                      <Icon className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                        {index + 1}. {step.step_type === 'action' ? 'Action' : step.step_type.charAt(0).toUpperCase() + step.step_type.slice(1)}
                      </p>
                      <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">{getStepLabel(step)}</p>
                    </div>
                  </div>
                </div>

                {/* Connector + Add Button */}
                <div className="flex flex-col items-center py-1">
                  <div className="w-px h-6 bg-[color:var(--bb-color-border-subtle)]" />
                  <button
                    onClick={() => onAddStep(index + 1)}
                    className="group flex items-center justify-center h-7 w-7 rounded-full border-2 border-dashed border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)] transition-all"
                  >
                    <Plus className="h-4 w-4 text-[color:var(--bb-color-text-muted)] group-hover:text-[color:var(--bb-color-accent)]" />
                  </button>
                  <div className="w-px h-6 bg-[color:var(--bb-color-border-subtle)]" />
                </div>
              </div>
            );
          })}

          {/* End Card */}
          <div className="px-8 py-3 rounded-xl border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] text-center">
            <span className="text-sm text-[color:var(--bb-color-text-muted)]">End</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== Main Component ==========
export default function WorkflowBuilderPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [_isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Panel state
  const [activePanel, setActivePanel] = useState(PANEL_TYPES.NONE);
  const [editingStep, setEditingStep] = useState(null);
  const [insertAtIndex, setInsertAtIndex] = useState(null);

  // Check if we should open trigger panel on load
  useEffect(() => {
    const panel = searchParams.get('panel');
    if (panel === 'trigger') {
      setActivePanel(PANEL_TYPES.TRIGGER);
      searchParams.delete('panel');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch workflow and steps
  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [workflowResponse, stepsResponse] = await Promise.all([
        getWorkflow(id),
        getWorkflowSteps(id),
      ]);

      setWorkflow(workflowResponse.data || workflowResponse);
      setSteps(stepsResponse.data?.steps || stepsResponse.steps || stepsResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch workflow:', err);
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  // Save steps
  const handleSaveSteps = useCallback(async (newSteps) => {
    try {
      setIsSaving(true);
      await updateWorkflowSteps(id, newSteps);
      setSteps(newSteps);
      toast.success('Workflow saved');
    } catch (err) {
      console.error('Failed to save workflow:', err);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Update workflow
  const handleUpdateWorkflow = useCallback(async (data) => {
    try {
      setIsSaving(true);
      await updateWorkflow(id, data);
      setWorkflow((prev) => ({ ...prev, ...data }));
      toast.success('Workflow updated');
      setActivePanel(PANEL_TYPES.NONE);
    } catch (err) {
      console.error('Failed to update workflow:', err);
      toast.error('Failed to update workflow');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Activate workflow
  const handleActivate = useCallback(async () => {
    try {
      setIsUpdatingStatus(true);
      await activateWorkflow(id);
      setWorkflow((prev) => ({ ...prev, status: 'active' }));
      toast.success('Workflow activated');
    } catch (err) {
      console.error('Failed to activate workflow:', err);
      toast.error('Failed to activate workflow');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [id]);

  // Pause workflow
  const handlePause = useCallback(async () => {
    try {
      setIsUpdatingStatus(true);
      await pauseWorkflow(id);
      setWorkflow((prev) => ({ ...prev, status: 'paused' }));
      toast.success('Workflow paused');
    } catch (err) {
      console.error('Failed to pause workflow:', err);
      toast.error('Failed to pause workflow');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [id]);

  // Add step
  const handleAddStep = useCallback((step) => {
    const newStep = {
      ...step,
      id: `temp-${Date.now()}`,
      position: insertAtIndex !== null ? insertAtIndex : steps.length,
    };

    let newSteps;
    if (insertAtIndex !== null) {
      newSteps = [...steps];
      newSteps.splice(insertAtIndex, 0, newStep);
      newSteps = newSteps.map((s, i) => ({ ...s, position: i }));
    } else {
      newSteps = [...steps, newStep];
    }

    handleSaveSteps(newSteps);
    setInsertAtIndex(null);
    setActivePanel(PANEL_TYPES.NONE);
  }, [steps, insertAtIndex, handleSaveSteps]);

  // Update step
  const handleUpdateStep = useCallback((updatedStep) => {
    const newSteps = steps.map((s) => (s.id === updatedStep.id ? updatedStep : s));
    handleSaveSteps(newSteps);
    setEditingStep(null);
    setActivePanel(PANEL_TYPES.NONE);
  }, [steps, handleSaveSteps]);

  // Delete step
  const handleDeleteStep = useCallback((stepId) => {
    const newSteps = steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, position: i }));
    handleSaveSteps(newSteps);
    setEditingStep(null);
    setActivePanel(PANEL_TYPES.NONE);
  }, [steps, handleSaveSteps]);

  // Panel handlers
  const openTriggerPanel = () => {
    setActivePanel(PANEL_TYPES.TRIGGER);
    setEditingStep(null);
  };

  const openObjectTypePanel = () => {
    setActivePanel(PANEL_TYPES.OBJECT_TYPE);
    setEditingStep(null);
  };

  const openActionPanel = (index) => {
    setInsertAtIndex(index);
    setActivePanel(PANEL_TYPES.ACTION);
    setEditingStep(null);
  };

  const openStepConfigPanel = (step) => {
    setEditingStep(step);
    setActivePanel(PANEL_TYPES.STEP_CONFIG);
  };

  const closePanel = () => {
    setActivePanel(PANEL_TYPES.NONE);
    setEditingStep(null);
    setInsertAtIndex(null);
  };

  if (loading) {
    return <LoadingState label="Loading workflow..." variant="mascot" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">Error Loading Workflow</h2>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">{error}</p>
        <Button onClick={() => navigate('/workflows')}>Back to Workflows</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-[color:var(--bb-color-bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--bb-color-bg-surface)] border-b border-[color:var(--bb-color-border-subtle)] shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
          Back
        </Button>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workflow?.name || ''}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            onBlur={() => handleUpdateWorkflow({ name: workflow?.name })}
            className="text-base font-medium text-center bg-transparent border-none focus:outline-none focus:ring-0 text-[color:var(--bb-color-text-primary)] min-w-[200px]"
          />
          <Edit3 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        </div>

        <div className="flex items-center gap-2">
          {workflow?.status === 'active' ? (
            <>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
                ON
              </span>
              <Button variant="secondary" size="sm" onClick={handlePause} disabled={isUpdatingStatus}>
                {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Turn off'}
              </Button>
            </>
          ) : (
            <Button onClick={handleActivate} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Review and turn on
            </Button>
          )}
        </div>
      </div>

      {/* Menu bar */}
      <div className="flex items-center gap-1 px-4 py-1 bg-[color:var(--bb-color-bg-surface)] border-b border-[color:var(--bb-color-border-subtle)] shrink-0">
        {['File', 'Edit', 'Settings', 'View', 'Help'].map((item) => (
          <button
            key={item}
            className="px-3 py-1.5 text-sm rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-secondary)]"
          >
            {item} <ChevronDown className="h-3 w-3 inline-block ml-0.5" />
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]">
            <Undo className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]">
            <Copy className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]">
            <Save className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {activePanel !== PANEL_TYPES.NONE && (
          <div className="w-[380px] border-r border-[color:var(--bb-color-border-subtle)] shrink-0 overflow-hidden flex flex-col">
            {activePanel === PANEL_TYPES.TRIGGER && (
              <TriggerPanel
                workflow={workflow}
                onSave={handleUpdateWorkflow}
                onCancel={closePanel}
                onSelectObjectType={openObjectTypePanel}
              />
            )}
            {activePanel === PANEL_TYPES.OBJECT_TYPE && (
              <ObjectTypePanel
                workflow={workflow}
                onSave={(data) => {
                  handleUpdateWorkflow(data);
                  setActivePanel(PANEL_TYPES.TRIGGER);
                }}
                onCancel={() => setActivePanel(PANEL_TYPES.TRIGGER)}
              />
            )}
            {activePanel === PANEL_TYPES.ACTION && (
              <ActionPanel
                onAddStep={handleAddStep}
                onCancel={closePanel}
              />
            )}
            {activePanel === PANEL_TYPES.STEP_CONFIG && editingStep && (
              <StepConfigPanel
                step={editingStep}
                onSave={handleUpdateStep}
                onCancel={closePanel}
                onDelete={handleDeleteStep}
              />
            )}
          </div>
        )}

        {/* Workflow Canvas */}
        <WorkflowCanvas
          workflow={workflow}
          steps={steps}
          onEditTrigger={openTriggerPanel}
          onAddStep={openActionPanel}
          onEditStep={openStepConfigPanel}
        />
      </div>
    </div>
  );
}
