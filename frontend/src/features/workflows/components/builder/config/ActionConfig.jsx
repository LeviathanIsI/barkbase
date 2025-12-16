/**
 * ActionConfig - Configuration panel for action steps
 * Full configurations for: SMS, Email, Task, Update Field, Webhook, Segments
 */
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Info } from 'lucide-react';
import {
  ACTION_CATEGORIES,
  OBJECT_PROPERTIES,
} from '../../../constants';
import PropertyValueInput from './PropertyValueInput';
import SegmentSelect from './SegmentSelect';
import WorkflowSelect from './WorkflowSelect';
import MessagePreview from './MessagePreview';
import UserSelect from './UserSelect';

// SMS character limits
const SMS_CHAR_LIMIT = 160;
const SMS_WARN_THRESHOLD = 140;

// Get action metadata
const getActionMeta = (actionType) => {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    const action = category.actions.find((a) => a.type === actionType);
    if (action) return action;
  }
  return null;
};

export default function ActionConfig({ step, objectType, onChange }) {
  const actionMeta = getActionMeta(step.actionType);

  // Handle config field change
  const handleConfigChange = (field, value) => {
    onChange({
      config: {
        ...step.config,
        [field]: value,
      },
    });
  };

  // Handle name change
  const handleNameChange = (name) => {
    onChange({ name });
  };

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
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Action type display */}
      {actionMeta && (
        <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)]">
          <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
            Action Type
          </div>
          <div className="text-sm text-[var(--bb-color-text-primary)]">
            {actionMeta.label}
          </div>
        </div>
      )}

      {/* Action-specific configuration */}
      {renderActionConfig(step, objectType, handleConfigChange)}
    </div>
  );
}

// Render action-specific config fields
function renderActionConfig(step, objectType, onChange) {
  switch (step.actionType) {
    case 'send_sms':
      return <SendSmsConfig config={step.config} objectType={objectType} onChange={onChange} />;

    case 'send_email':
      return <SendEmailConfig config={step.config} objectType={objectType} onChange={onChange} />;

    case 'send_notification':
      return <SendNotificationConfig config={step.config} onChange={onChange} />;

    case 'create_task':
      return <CreateTaskConfig config={step.config} objectType={objectType} onChange={onChange} />;

    case 'update_field':
      return <UpdateFieldConfig config={step.config} objectType={objectType} onChange={onChange} />;

    case 'webhook':
      return <WebhookConfig config={step.config} objectType={objectType} onChange={onChange} />;

    case 'add_to_segment':
      return <SegmentConfig config={step.config} objectType={objectType} onChange={onChange} action="add" />;

    case 'remove_from_segment':
      return <SegmentConfig config={step.config} objectType={objectType} onChange={onChange} action="remove" />;

    case 'enroll_in_workflow':
      return <WorkflowEnrollConfig config={step.config} objectType={objectType} onChange={onChange} action="enroll" />;

    case 'unenroll_from_workflow':
      return <WorkflowEnrollConfig config={step.config} objectType={objectType} onChange={onChange} action="unenroll" />;

    default:
      return (
        <div className="text-sm text-[var(--bb-color-text-tertiary)]">
          Configuration for {step.actionType} coming soon.
        </div>
      );
  }
}

// =============================================================================
// Send SMS Config
// =============================================================================
function SendSmsConfig({ config, objectType, onChange }) {
  const message = config?.message || '';
  const charCount = message.length;
  const isOverLimit = charCount > SMS_CHAR_LIMIT;
  const isNearLimit = charCount > SMS_WARN_THRESHOLD;
  const segmentCount = Math.ceil(charCount / SMS_CHAR_LIMIT) || 1;

  return (
    <div className="space-y-4">
      {/* Recipient selector */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Send To
        </label>
        <select
          value={config?.recipientType || 'record_phone'}
          onChange={(e) => onChange('recipientType', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="record_phone">Record&apos;s phone number</option>
          <option value="owner_phone">Associated owner&apos;s phone</option>
          <option value="specific">Specific phone number</option>
        </select>
      </div>

      {config?.recipientType === 'specific' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={config?.recipientPhone || ''}
            onChange={(e) => onChange('recipientPhone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
        </div>
      )}

      {/* Message */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => onChange('message', e.target.value)}
          rows={4}
          placeholder="Enter your SMS message..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]",
            isOverLimit && "border-red-500"
          )}
        />

        {/* Character count */}
        <div className="mt-1 flex justify-between items-center">
          <div className="text-xs text-[var(--bb-color-text-tertiary)]">
            Use {'{{field_name}}'} to insert values
          </div>
          <div className={cn(
            "text-xs",
            isOverLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-[var(--bb-color-text-tertiary)]"
          )}>
            {charCount}/{SMS_CHAR_LIMIT} ({segmentCount} segment{segmentCount > 1 ? 's' : ''})
          </div>
        </div>
      </div>

      {/* Token insertion helper */}
      <TokenInsertHelper objectType={objectType} onInsert={(token) => onChange('message', message + token)} />

      {/* Message Preview */}
      <MessagePreview type="sms" content={message} objectType={objectType} />
    </div>
  );
}

// =============================================================================
// Send Email Config
// =============================================================================
function SendEmailConfig({ config, objectType, onChange }) {
  return (
    <div className="space-y-4">
      {/* Recipient selector */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          To
        </label>
        <select
          value={config?.recipientType || 'record_email'}
          onChange={(e) => onChange('recipientType', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="record_email">Record&apos;s email address</option>
          <option value="owner_email">Associated owner&apos;s email</option>
          <option value="specific">Specific email address</option>
        </select>
      </div>

      {config?.recipientType === 'specific' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={config?.recipientEmail || ''}
            onChange={(e) => onChange('recipientEmail', e.target.value)}
            placeholder="email@example.com"
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
        </div>
      )}

      {/* CC */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          CC (Optional)
        </label>
        <input
          type="text"
          value={config?.cc || ''}
          onChange={(e) => onChange('cc', e.target.value)}
          placeholder="Comma-separated emails..."
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* From Name */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          From Name
        </label>
        <input
          type="text"
          value={config?.fromName || ''}
          onChange={(e) => onChange('fromName', e.target.value)}
          placeholder="Your Business Name"
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Subject
        </label>
        <input
          type="text"
          value={config?.subject || ''}
          onChange={(e) => onChange('subject', e.target.value)}
          placeholder="Email subject..."
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
        <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
          Use {'{{field_name}}'} to personalize
        </div>
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Body
        </label>
        <textarea
          value={config?.body || ''}
          onChange={(e) => onChange('body', e.target.value)}
          rows={8}
          placeholder="Email body (supports HTML)..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Token insertion helper */}
      <TokenInsertHelper
        objectType={objectType}
        onInsert={(token) => onChange('body', (config?.body || '') + token)}
      />

      {/* Message Preview */}
      <MessagePreview
        type="email"
        content={config?.body}
        subject={config?.subject}
        fromName={config?.fromName}
        objectType={objectType}
      />
    </div>
  );
}

// =============================================================================
// Send Notification Config
// =============================================================================
function SendNotificationConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
      {/* Recipient */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Send To
        </label>
        <select
          value={config?.recipientType || 'all_staff'}
          onChange={(e) => onChange('recipientType', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="all_staff">All staff</option>
          <option value="assigned_staff">Assigned staff only</option>
          <option value="admins">Admins only</option>
          <option value="specific_users">Specific users</option>
        </select>
      </div>

      {/* Specific user selector */}
      {config?.recipientType === 'specific_users' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Select Users
          </label>
          <UserSelect
            value={config?.recipientUserIds || []}
            onChange={(userIds) => onChange('recipientUserIds', userIds)}
            placeholder="Select users to notify..."
            isMulti={true}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Title
        </label>
        <input
          type="text"
          value={config?.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Notification title..."
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Message
        </label>
        <textarea
          value={config?.message || ''}
          onChange={(e) => onChange('message', e.target.value)}
          rows={3}
          placeholder="Notification message..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Priority
        </label>
        <select
          value={config?.priority || 'normal'}
          onChange={(e) => onChange('priority', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// Create Task Config
// =============================================================================
function CreateTaskConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
      {/* Task Type */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Task Type
        </label>
        <select
          value={config?.taskType || 'general'}
          onChange={(e) => onChange('taskType', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="general">General</option>
          <option value="follow_up">Follow-up</option>
          <option value="feeding">Feeding</option>
          <option value="medication">Medication</option>
          <option value="grooming">Grooming</option>
          <option value="exercise">Exercise</option>
          <option value="cleaning">Cleaning</option>
        </select>
      </div>

      {/* Task Title */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Task Title
        </label>
        <input
          type="text"
          value={config?.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Task title..."
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
        <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
          Use {'{{field_name}}'} for dynamic titles
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Description
        </label>
        <textarea
          value={config?.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
          placeholder="Task description..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Assign To */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Assign To
        </label>
        <select
          value={config?.assignTo || 'unassigned'}
          onChange={(e) => onChange('assignTo', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="unassigned">Leave unassigned</option>
          <option value="record_owner">Record owner</option>
          <option value="booking_staff">Booking assigned staff</option>
          <option value="workflow_owner">Workflow owner</option>
          <option value="round_robin">Round robin</option>
          <option value="specific_user">Specific user</option>
        </select>
      </div>

      {/* Specific user selector */}
      {config?.assignTo === 'specific_user' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Select User
          </label>
          <UserSelect
            value={config?.assignedUserId}
            onChange={(userId) => onChange('assignedUserId', userId)}
            placeholder="Select user to assign task to..."
          />
        </div>
      )}

      {/* Due Date */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Due Date
        </label>
        <div className="flex gap-2">
          <select
            value={config?.dueDateType || 'relative'}
            onChange={(e) => onChange('dueDateType', e.target.value)}
            className={cn(
              "flex-1 px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          >
            <option value="relative">Relative to now</option>
            <option value="from_field">From record field</option>
            <option value="specific">Specific date</option>
          </select>
        </div>
      </div>

      {config?.dueDateType === 'relative' && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            value={config?.dueDateOffset || 1}
            onChange={(e) => onChange('dueDateOffset', parseInt(e.target.value))}
            className={cn(
              "w-20 px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
          <select
            value={config?.dueDateUnit || 'days'}
            onChange={(e) => onChange('dueDateUnit', e.target.value)}
            className={cn(
              "flex-1 px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          >
            <option value="hours">Hours from now</option>
            <option value="days">Days from now</option>
            <option value="weeks">Weeks from now</option>
          </select>
        </div>
      )}

      {/* Priority */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Priority
        </label>
        <select
          value={config?.priority || 'medium'}
          onChange={(e) => onChange('priority', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// Update Field Config
// =============================================================================
function UpdateFieldConfig({ config, objectType, onChange }) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  const selectedProperty = properties.find(p => p.name === config?.fieldName);

  return (
    <div className="space-y-4">
      {/* Property selector */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Field to Update
        </label>
        <select
          value={config?.fieldName || ''}
          onChange={(e) => onChange('fieldName', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="">Select field...</option>
          {properties.map((prop) => (
            <option key={prop.name} value={prop.name}>
              {prop.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value input with appropriate type */}
      {config?.fieldName && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            New Value
          </label>
          <PropertyValueInput
            property={selectedProperty}
            value={config?.value || ''}
            onChange={(val) => onChange('value', val)}
            placeholder="Enter new value..."
          />
        </div>
      )}

      {/* Clear option */}
      {config?.fieldName && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="clearValue"
            checked={config?.clearValue || false}
            onChange={(e) => onChange('clearValue', e.target.checked)}
            className="rounded border-[var(--bb-color-border-subtle)]"
          />
          <label htmlFor="clearValue" className="text-xs text-[var(--bb-color-text-secondary)]">
            Clear the field value instead
          </label>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Webhook Config
// =============================================================================
function WebhookConfig({ config, objectType, onChange }) {
  const [headersValid, setHeadersValid] = useState(true);
  const [payloadValid, setPayloadValid] = useState(true);

  const validateJson = (value, setter) => {
    if (!value || value.trim() === '') {
      setter(true);
      return;
    }
    try {
      JSON.parse(value);
      setter(true);
    } catch {
      setter(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Webhook URL
        </label>
        <input
          type="url"
          value={config?.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://api.example.com/webhook"
          autoComplete="off"
          data-form-type="other"
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Method */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Method
        </label>
        <select
          value={config?.method || 'POST'}
          onChange={(e) => onChange('method', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Authentication */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Authentication
        </label>
        <select
          value={config?.authType || 'none'}
          onChange={(e) => onChange('authType', e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        >
          <option value="none">No authentication</option>
          <option value="api_key">API Key</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
        </select>
      </div>

      {/* API Key auth fields */}
      {config?.authType === 'api_key' && (
        <div className="space-y-3 pl-3 border-l-2 border-[var(--bb-color-border-subtle)]">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Header Name
            </label>
            <input
              type="text"
              value={config?.apiKeyHeader || 'X-API-Key'}
              onChange={(e) => onChange('apiKeyHeader', e.target.value)}
              placeholder="X-API-Key"
              autoComplete="off"
              data-form-type="other"
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              API Key
            </label>
            <input
              type="password"
              value={config?.apiKey || ''}
              onChange={(e) => onChange('apiKey', e.target.value)}
              placeholder="Enter API key..."
              autoComplete="new-password"
              data-form-type="other"
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>
        </div>
      )}

      {/* Bearer token auth fields */}
      {config?.authType === 'bearer' && (
        <div className="pl-3 border-l-2 border-[var(--bb-color-border-subtle)]">
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Bearer Token
          </label>
          <input
            type="password"
            value={config?.bearerToken || ''}
            onChange={(e) => onChange('bearerToken', e.target.value)}
            placeholder="Enter bearer token..."
            autoComplete="new-password"
            data-form-type="other"
            className={cn(
              "w-full px-3 py-2 rounded-md",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
        </div>
      )}

      {/* Basic auth fields */}
      {config?.authType === 'basic' && (
        <div className="space-y-3 pl-3 border-l-2 border-[var(--bb-color-border-subtle)]">
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Username
            </label>
            <input
              type="text"
              value={config?.basicUsername || ''}
              onChange={(e) => onChange('basicUsername', e.target.value)}
              placeholder="Username"
              autoComplete="off"
              data-form-type="other"
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={config?.basicPassword || ''}
              onChange={(e) => onChange('basicPassword', e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
              data-form-type="other"
              className={cn(
                "w-full px-3 py-2 rounded-md",
                "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)]"
              )}
            />
          </div>
        </div>
      )}

      {/* Headers */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Headers (JSON)
        </label>
        <textarea
          value={config?.headers || '{\n  "Content-Type": "application/json"\n}'}
          onChange={(e) => {
            onChange('headers', e.target.value);
            validateJson(e.target.value, setHeadersValid);
          }}
          rows={3}
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none font-mono text-xs",
            "bg-[var(--bb-color-bg-body)] border",
            headersValid ? "border-[var(--bb-color-border-subtle)]" : "border-red-500",
            "text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
        {!headersValid && (
          <div className="mt-1 text-xs text-red-500">Invalid JSON format</div>
        )}
      </div>

      {/* Payload Template */}
      {config?.method !== 'GET' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Payload Template (JSON)
          </label>
          <textarea
            value={config?.payload || '{\n  "record_id": "{{id}}",\n  "event": "workflow_action"\n}'}
            onChange={(e) => {
              onChange('payload', e.target.value);
              validateJson(e.target.value, setPayloadValid);
            }}
            rows={6}
            placeholder='{"key": "value", "dynamic": "{{field_name}}"}'
            className={cn(
              "w-full px-3 py-2 rounded-md resize-none font-mono text-xs",
              "bg-[var(--bb-color-bg-body)] border",
              payloadValid ? "border-[var(--bb-color-border-subtle)]" : "border-red-500",
              "text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          />
          {!payloadValid && (
            <div className="mt-1 text-xs text-red-500">Invalid JSON format</div>
          )}
          <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
            Use {'{{field_name}}'} to include record data
          </div>
        </div>
      )}

      {/* Token insertion helper */}
      <TokenInsertHelper
        objectType={objectType}
        onInsert={(token) => onChange('payload', (config?.payload || '') + token)}
      />

      {/* Timeout */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Timeout (seconds)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={config?.timeout || 10}
          onChange={(e) => onChange('timeout', parseInt(e.target.value))}
          className={cn(
            "w-24 px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Segment Config
// =============================================================================
function SegmentConfig({ config, objectType, onChange, action }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Segment
        </label>
        <SegmentSelect
          objectType={objectType}
          value={config?.segmentId}
          onChange={(segmentId) => onChange('segmentId', segmentId)}
          placeholder={action === 'add' ? 'Select segment to add record to...' : 'Select segment to remove record from...'}
        />
        <div className="mt-2 text-xs text-[var(--bb-color-text-tertiary)]">
          {action === 'add'
            ? 'The enrolled record will be added to this segment'
            : 'The enrolled record will be removed from this segment'}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Workflow Enroll Config
// =============================================================================
function WorkflowEnrollConfig({ config, objectType, onChange, action }) {
  // For enroll action
  if (action === 'enroll') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Workflow
          </label>
          <WorkflowSelect
            objectType={objectType}
            value={config?.workflowId}
            onChange={(workflowId) => onChange('workflowId', workflowId)}
            placeholder="Select workflow to enroll record in..."
          />
        </div>

        <div className={cn(
          'p-3 rounded-lg text-sm',
          'bg-[var(--bb-color-accent-soft)] border border-[var(--bb-color-accent)]'
        )}>
          <p className="text-[var(--bb-color-accent)]">
            The record will be enrolled in the selected workflow. It will continue through this workflow as well.
          </p>
        </div>
      </div>
    );
  }

  // For unenroll action
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Unenroll From
        </label>
        <select
          value={config?.unenrollType || 'specific'}
          onChange={(e) => onChange('unenrollType', e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-md',
            'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
            'text-sm text-[var(--bb-color-text-primary)]',
            'focus:outline-none focus:border-[var(--bb-color-accent)]'
          )}
        >
          <option value="specific">Specific workflow(s)</option>
          <option value="all">All other workflows</option>
        </select>
      </div>

      {config?.unenrollType !== 'all' && (
        <div>
          <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
            Workflow(s)
          </label>
          <WorkflowSelect
            objectType={objectType}
            value={config?.workflowIds || []}
            onChange={(workflowIds) => onChange('workflowIds', workflowIds)}
            isMulti={true}
            placeholder="Select workflows to unenroll from..."
          />
        </div>
      )}

      <div className="text-xs text-[var(--bb-color-text-tertiary)]">
        {config?.unenrollType === 'all'
          ? 'The record will be unenrolled from all other active workflows.'
          : 'The record will be unenrolled from the selected workflow(s).'}
      </div>
    </div>
  );
}

// =============================================================================
// Token Insertion Helper
// =============================================================================
function TokenInsertHelper({ objectType, onInsert }) {
  const [isOpen, setIsOpen] = useState(false);
  const properties = OBJECT_PROPERTIES[objectType] || [];

  if (properties.length === 0) return null;

  return (
    <div className="border-t border-[var(--bb-color-border-subtle)] pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-[var(--bb-color-primary)] hover:underline flex items-center gap-1"
      >
        <Info size={12} />
        Insert field token
      </button>

      {isOpen && (
        <div className="mt-2 p-2 rounded-md bg-[var(--bb-color-bg-subtle)] border border-[var(--bb-color-border-subtle)]">
          <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-2">
            Click to insert:
          </div>
          <div className="flex flex-wrap gap-1">
            {properties.slice(0, 10).map((prop) => (
              <button
                key={prop.name}
                type="button"
                onClick={() => {
                  onInsert(`{{${prop.name}}}`);
                  setIsOpen(false);
                }}
                className={cn(
                  "px-2 py-1 rounded text-xs",
                  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
                  "text-[var(--bb-color-text-secondary)]",
                  "hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-text-primary)]"
                )}
              >
                {prop.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
