/**
 * Workflow Builder / Editor
 * HubSpot-style builder with contextual left sidebar and workflow canvas
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  GitBranch,
  Plus,
  Play,
  Pause,
  Save,
  Trash2,
  Settings,
  MessageSquare,
  Mail,
  Bell,
  Clock,
  Split,
  StopCircle,
  ShieldCheck,
  ClipboardList,
  Users,
  Tag,
  Edit3,
  Eye,
  MoreVertical,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  ArrowRight,
  X,
  Search,
  Flag,
  Hand,
  Filter,
  Calendar,
  PawPrint,
  CreditCard,
  FileText,
  CalendarDays,
  RefreshCw,
  Sparkles,
  Webhook,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import {
  getWorkflow,
  updateWorkflow,
  getWorkflowSteps,
  updateWorkflowSteps,
  activateWorkflow,
} from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Trigger type options
const TRIGGER_TYPES = [
  {
    id: 'manual',
    label: 'Trigger manually',
    icon: Hand,
  },
  {
    id: 'filter_criteria',
    label: 'Met filter criteria',
    icon: Filter,
  },
  {
    id: 'schedule',
    label: 'On a schedule',
    icon: Calendar,
  },
];

// Trigger categories
const TRIGGER_CATEGORIES = [
  {
    id: 'data_values',
    label: 'Data values',
    description: 'When data is created, changed or meets conditions',
    icon: Zap,
    color: 'text-teal-500',
  },
  {
    id: 'communication',
    label: 'Emails, calls, & communication',
    description: 'When information is sent or discussed',
    icon: Mail,
    color: 'text-orange-500',
  },
  {
    id: 'operations',
    label: 'Operations & tasks',
    description: 'When bookings, check-ins, or tasks occur',
    icon: ClipboardList,
    color: 'text-blue-500',
  },
  {
    id: 'automations',
    label: 'Automations triggered',
    description: 'When automated steps start or complete',
    icon: RefreshCw,
    color: 'text-purple-500',
  },
];

// Event options by category
const TRIGGER_EVENTS = {
  data_values: [
    { id: 'pet.created', label: 'Pet is created' },
    { id: 'pet.updated', label: 'Pet property changed' },
    { id: 'owner.created', label: 'Owner is created' },
    { id: 'owner.updated', label: 'Owner property changed' },
    { id: 'pet.vaccination_expiring', label: 'Vaccination expiring (7 days)' },
    { id: 'pet.vaccination_expired', label: 'Vaccination expired' },
    { id: 'pet.birthday', label: 'Pet birthday' },
  ],
  communication: [
    { id: 'email.sent', label: 'Email sent' },
    { id: 'email.opened', label: 'Email opened' },
    { id: 'sms.sent', label: 'SMS sent' },
    { id: 'sms.received', label: 'SMS received' },
  ],
  operations: [
    { id: 'booking.created', label: 'Booking created' },
    { id: 'booking.checked_in', label: 'Pet checked in' },
    { id: 'booking.checked_out', label: 'Pet checked out' },
    { id: 'booking.cancelled', label: 'Booking cancelled' },
    { id: 'task.created', label: 'Task created' },
    { id: 'task.completed', label: 'Task completed' },
    { id: 'task.overdue', label: 'Task overdue' },
  ],
  automations: [
    { id: 'workflow.enrolled', label: 'Enrolled in workflow' },
    { id: 'workflow.completed', label: 'Completed workflow' },
    { id: 'workflow.unenrolled', label: 'Unenrolled from workflow' },
  ],
};

// Action categories
const ACTION_CATEGORIES = [
  {
    id: 'communications',
    label: 'Communications',
    description: 'Send emails and notifications to your customers and...',
    icon: MessageSquare,
    color: 'text-blue-500',
  },
  {
    id: 'crm',
    label: 'CRM',
    description: 'Create and update CRM records and property values',
    icon: Users,
    color: 'text-green-500',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Manage tasks, assignments, and operational records',
    icon: ClipboardList,
    color: 'text-orange-500',
  },
  {
    id: 'data_ops',
    label: 'Data ops',
    description: 'Create code or webhooks for your apps, and forma...',
    icon: Webhook,
    color: 'text-purple-500',
  },
];

// Quick actions
const QUICK_ACTIONS = [
  { id: 'delay', label: 'Delay', icon: Clock },
  { id: 'branch', label: 'Branch', icon: Split },
  { id: 'go_to_workflow', label: 'Go to workflow', icon: ArrowRight },
  { id: 'go_to_action', label: 'Go to action', icon: ArrowRight },
];

// Action options by category
const ACTION_OPTIONS = {
  communications: [
    { id: 'send_sms', label: 'Send SMS', description: 'Send SMS message to owner' },
    { id: 'send_email', label: 'Send Email', description: 'Send email to owner' },
    { id: 'send_notification', label: 'Send Notification', description: 'Internal notification to staff' },
  ],
  crm: [
    { id: 'update_field', label: 'Update property', description: 'Update a field value' },
    { id: 'add_to_segment', label: 'Add to segment', description: 'Add record to a segment' },
    { id: 'remove_from_segment', label: 'Remove from segment', description: 'Remove record from segment' },
  ],
  operations: [
    { id: 'create_task', label: 'Create task', description: 'Create a task for staff' },
    { id: 'assign_staff', label: 'Assign staff', description: 'Assign a staff member' },
  ],
  data_ops: [
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
  assign_staff: Users,
  update_field: Edit3,
  add_to_segment: Tag,
  remove_from_segment: Tag,
  delay: Clock,
  branch: Split,
  webhook: Webhook,
  custom_code: FileText,
  terminus: StopCircle,
};

// Panel types
const PANEL_TYPES = {
  TRIGGER: 'trigger',
  ACTION: 'action',
  STEP_CONFIG: 'step_config',
  SETTINGS: 'settings',
  NONE: null,
};

// ========== Trigger Panel ==========
const TriggerPanel = ({ workflow, onSave, onCancel }) => {
  const [triggerType, setTriggerType] = useState(workflow?.entry_condition?.trigger_type || 'manual');
  const [selectedEvent, setSelectedEvent] = useState(workflow?.entry_condition?.event_type || null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleSave = () => {
    const entryCondition = {
      trigger_type: triggerType,
      event_type: selectedEvent,
    };
    onSave({ entry_condition: entryCondition });
  };

  const getTriggerSummary = () => {
    if (triggerType === 'manual') return 'Manually triggered only';
    if (selectedEvent) {
      const allEvents = Object.values(TRIGGER_EVENTS).flat();
      const event = allEvents.find(e => e.id === selectedEvent);
      return event?.label || selectedEvent;
    }
    return 'Configuring...';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">Triggers</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]">
          Start triggers
        </button>
        <button className="px-4 py-2 text-sm font-medium text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">Start when this happens</p>

        {/* Current trigger display */}
        <div
          className="px-4 py-3 rounded-lg border mb-4"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-primary)]">{getTriggerSummary()}</p>
        </div>

        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
          <span className="text-xs text-[color:var(--bb-color-text-muted)]">OR</span>
          <div className="flex-1 h-px bg-[color:var(--bb-color-border-subtle)]" />
        </div>

        {/* Quick trigger types */}
        <div className="flex gap-2 mb-4">
          {TRIGGER_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setTriggerType(type.id);
                  if (type.id === 'manual') setSelectedEvent(null);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border text-center min-w-[90px] transition-all',
                  triggerType === type.id
                    ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
                    : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
                )}
                style={{ backgroundColor: triggerType === type.id ? undefined : 'var(--bb-color-bg-surface)' }}
              >
                <Icon className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Trigger options with illustrations */}
        <div className="space-y-3">
          <TriggerOptionCard
            icon={Sparkles}
            badge="BETA"
            label="Generate a trigger with AI"
            description="Describe what should start this workflow and AI will build a trigger for you"
            onClick={() => toast.info('AI triggers coming soon')}
          />

          <TriggerOptionCard
            icon={Zap}
            label="When an event occurs"
            description="Example: Pet has completed a check-in"
            selected={triggerType === 'event'}
            onClick={() => setTriggerType('event')}
          />

          <TriggerOptionCard
            icon={Filter}
            label="When filter criteria is met"
            description="Example: Species is equal to Dog AND Breed contains Labrador"
            selected={triggerType === 'filter_criteria'}
            onClick={() => setTriggerType('filter_criteria')}
          />

          <TriggerOptionCard
            icon={Calendar}
            label="Based on a schedule"
            description="Example: Daily at 8:00 AM"
            selected={triggerType === 'schedule'}
            onClick={() => setTriggerType('schedule')}
          />
        </div>

        {/* Event Categories (when event trigger selected) */}
        {triggerType === 'event' && (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">Choose trigger event</p>
            {TRIGGER_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategory === category.id;
              const events = TRIGGER_EVENTS[category.id] || [];

              return (
                <div
                  key={category.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                  >
                    <Icon className={cn('h-5 w-5', category.color)} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{category.label}</p>
                      <p className="text-xs text-[color:var(--bb-color-text-muted)]">{category.description}</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-[color:var(--bb-color-text-muted)] transition-transform', isExpanded && 'rotate-90')} />
                  </button>

                  {isExpanded && events.length > 0 && (
                    <div className="border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                      {events.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => setSelectedEvent(event.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            selectedEvent === event.id
                              ? 'bg-[color:var(--bb-color-accent-soft)]'
                              : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
                          )}
                        >
                          <div className={cn('h-2 w-2 rounded-full', selectedEvent === event.id ? 'bg-[color:var(--bb-color-accent)]' : 'bg-gray-300')} />
                          <span className="text-sm text-[color:var(--bb-color-text-primary)]">{event.label}</span>
                          {selectedEvent === event.id && <CheckCircle className="h-4 w-4 text-[color:var(--bb-color-accent)] ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Advanced options */}
        <div className="mt-6">
          <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-2">Advanced options</p>
          <TriggerOptionCard
            icon={Webhook}
            label="When a webhook is received"
            description="Example: Webhook is received from a third party app"
            onClick={() => toast.info('Webhook triggers coming soon')}
          />
        </div>

        {/* Skip trigger link */}
        <button className="mt-4 text-sm text-[color:var(--bb-color-accent)] hover:underline">
          Skip trigger and choose eligible records
        </button>
      </div>
    </div>
  );
};

// Trigger option card component
// eslint-disable-next-line no-unused-vars
const TriggerOptionCard = ({ icon: Icon, label, description, badge, selected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
      selected
        ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
        : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
    )}
    style={{ backgroundColor: selected ? undefined : 'var(--bb-color-bg-surface)' }}
  >
    <div className="h-12 w-12 rounded-lg bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center shrink-0">
      <Icon className="h-6 w-6 text-[color:var(--bb-color-accent)]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{label}</p>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5">{description}</p>
    </div>
  </button>
);

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">Choose an action</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* AI Option */}
        <div
          className="flex items-start gap-3 p-4 rounded-lg border mb-4"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div className="h-12 w-12 rounded-lg bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-[color:var(--bb-color-accent)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">Generate actions with AI</p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mb-2">Describe your workflow and AI will build actions for you.</p>
            <Button size="sm" variant="secondary" onClick={() => toast.info('AI actions coming soon')}>
              Use AI to generate
            </Button>
          </div>
        </div>

        {/* Browse all actions */}
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">Browse all actions</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search actions"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          />
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleSelectQuickAction(action.id)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border min-w-[70px] transition-all border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
              >
                <Icon className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-[10px] font-medium text-[color:var(--bb-color-text-primary)]">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action categories */}
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">BarkBase</p>
        <div className="space-y-2">
          {ACTION_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.id;
            const actions = ACTION_OPTIONS[category.id] || [];

            return (
              <div
                key={category.id}
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                >
                  <Icon className={cn('h-5 w-5', category.color)} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{category.label}</p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">{category.description}</p>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 text-[color:var(--bb-color-text-muted)] transition-transform', isExpanded && 'rotate-90')} />
                </button>

                {isExpanded && actions.length > 0 && (
                  <div className="border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                    {actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleSelectAction(action.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                      >
                        <div className="h-2 w-2 rounded-full bg-gray-300" />
                        <div className="flex-1">
                          <p className="text-sm text-[color:var(--bb-color-text-primary)]">{action.label}</p>
                          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{action.description}</p>
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
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
                  className="w-20 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
                <select
                  value={config.unit || 'days'}
                  onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
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
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
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
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                rows={6}
                placeholder="Email body..."
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
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
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2 block">Description</label>
              <textarea
                value={config.task_description || ''}
                onChange={(e) => setConfig({ ...config, task_description: e.target.value })}
                rows={3}
                placeholder="Task description..."
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              />
            </div>
          </div>
        )}

        {/* Generic placeholder for other types */}
        {!['wait', 'send_sms', 'send_email', 'create_task'].includes(step.step_type) && !['send_sms', 'send_email', 'create_task'].includes(step.action_type) && (
          <div className="p-4 rounded-lg bg-[color:var(--bb-color-bg-elevated)] text-center">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">Configuration options coming soon</p>
          </div>
        )}

        {/* Delete button */}
        <div className="mt-8 pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('Delete this step?')) onDelete(step.id);
            }}
            className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
    <div className="flex-1 overflow-auto p-8 bg-[color:var(--bb-color-bg-base)]">
      <div className="max-w-md mx-auto">
        {/* Trigger Card */}
        <div
          onClick={onEditTrigger}
          className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-accent)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Flag className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
            <span className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">Trigger enrollment for {workflow?.object_type || 'records'}</span>
          </div>
          <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">When this happens</p>
          <div
            className="px-3 py-2 rounded-lg border"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">Group 1</p>
            <p className="text-sm text-[color:var(--bb-color-text-primary)]">{getTriggerSummary()}</p>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-[color:var(--bb-color-text-muted)]">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              <span>Re-enroll off</span>
            </div>
            <span className="text-[color:var(--bb-color-accent)] font-medium">Details</span>
          </div>
        </div>

        {/* Connector + Add Button */}
        <div className="flex flex-col items-center py-2">
          <div className="w-px h-4 bg-[color:var(--bb-color-border-subtle)]" />
          <button
            onClick={() => onAddStep(0)}
            className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-dashed hover:border-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)] transition-all"
            style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
          >
            <Plus className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
          </button>
          <div className="w-px h-4 bg-[color:var(--bb-color-border-subtle)]" />
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const Icon = getStepIcon(step);
          return (
            <div key={step.id}>
              {/* Step Card */}
              <div
                onClick={() => onEditStep(step)}
                className="p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all"
                style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">{index + 1}. {step.step_type === 'action' ? 'Action' : step.step_type}</p>
                    <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{getStepLabel(step)}</p>
                  </div>
                </div>
              </div>

              {/* Connector + Add Button */}
              <div className="flex flex-col items-center py-2">
                <div className="w-px h-4 bg-[color:var(--bb-color-border-subtle)]" />
                <button
                  onClick={() => onAddStep(index + 1)}
                  className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-dashed hover:border-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)] transition-all"
                  style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
                >
                  <Plus className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                </button>
                <div className="w-px h-4 bg-[color:var(--bb-color-border-subtle)]" />
              </div>
            </div>
          );
        })}

        {/* End Card */}
        <div
          className="px-6 py-3 rounded-xl border text-center"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">End</span>
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
      // Clear the param
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

      setWorkflow(workflowResponse.data);
      setSteps(stepsResponse.data?.steps || stepsResponse.data || []);
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

  // Open trigger panel
  const openTriggerPanel = () => {
    setActivePanel(PANEL_TYPES.TRIGGER);
    setEditingStep(null);
  };

  // Open action panel
  const openActionPanel = (index) => {
    setInsertAtIndex(index);
    setActivePanel(PANEL_TYPES.ACTION);
    setEditingStep(null);
  };

  // Open step config panel
  const openStepConfigPanel = (step) => {
    setEditingStep(step);
    setActivePanel(PANEL_TYPES.STEP_CONFIG);
  };

  // Close panel
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
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
            Back
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workflow?.name || ''}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            onBlur={() => handleUpdateWorkflow({ name: workflow?.name })}
            className="text-lg font-medium text-center bg-transparent border-none focus:outline-none focus:ring-0 text-[color:var(--bb-color-text-primary)]"
            style={{ minWidth: '200px' }}
          />
          <Edit3 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        </div>

        <div className="flex items-center gap-2">
          {workflow?.status === 'active' ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              ON
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              OFF
            </span>
          )}
          <Button onClick={handleActivate} disabled={isUpdatingStatus}>
            {isUpdatingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Review and turn on'
            )}
          </Button>
        </div>
      </div>

      {/* Menu bar */}
      <div
        className="flex items-center gap-1 px-4 py-1 border-b text-sm shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        {['File', 'Edit', 'Settings', 'View', 'Help'].map((item) => (
          <button
            key={item}
            className="px-3 py-1.5 rounded hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-secondary)]"
          >
            {item} <ChevronDown className="h-3 w-3 inline-block ml-0.5" />
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {activePanel !== PANEL_TYPES.NONE && (
          <div
            className="w-[340px] border-r shrink-0 overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {activePanel === PANEL_TYPES.TRIGGER && (
              <TriggerPanel
                workflow={workflow}
                onSave={handleUpdateWorkflow}
                onCancel={closePanel}
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
