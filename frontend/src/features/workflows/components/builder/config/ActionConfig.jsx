/**
 * ActionConfig - Configuration panel for action steps
 */
import { cn } from '@/lib/cn';
import { ACTION_CATEGORIES } from '../../../constants';

// Get action metadata
const getActionMeta = (actionType) => {
  for (const category of Object.values(ACTION_CATEGORIES)) {
    const action = category.actions.find((a) => a.type === actionType);
    if (action) return action;
  }
  return null;
};

export default function ActionConfig({ step, onChange }) {
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
      {renderActionConfig(step, handleConfigChange)}
    </div>
  );
}

// Render action-specific config fields
function renderActionConfig(step, onChange) {
  switch (step.actionType) {
    case 'send_sms':
      return <SendSmsConfig config={step.config} onChange={onChange} />;

    case 'send_email':
      return <SendEmailConfig config={step.config} onChange={onChange} />;

    case 'send_notification':
      return <SendNotificationConfig config={step.config} onChange={onChange} />;

    case 'create_task':
      return <CreateTaskConfig config={step.config} onChange={onChange} />;

    case 'update_field':
      return <UpdateFieldConfig config={step.config} onChange={onChange} />;

    case 'webhook':
      return <WebhookConfig config={step.config} onChange={onChange} />;

    default:
      return (
        <div className="text-sm text-[var(--bb-color-text-tertiary)]">
          Configuration for {step.actionType} coming soon.
        </div>
      );
  }
}

// Send SMS config
function SendSmsConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Message
        </label>
        <textarea
          value={config?.message || ''}
          onChange={(e) => onChange('message', e.target.value)}
          rows={4}
          placeholder="Enter your SMS message..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
        <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
          Use {'{{field_name}}'} to insert record values
        </div>
      </div>
    </div>
  );
}

// Send Email config
function SendEmailConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
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
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Body
        </label>
        <textarea
          value={config?.body || ''}
          onChange={(e) => onChange('body', e.target.value)}
          rows={6}
          placeholder="Email body..."
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>
    </div>
  );
}

// Send Notification config
function SendNotificationConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}

// Create Task config
function CreateTaskConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
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
      </div>

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

// Update Field config
function UpdateFieldConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Field Name
        </label>
        <input
          type="text"
          value={config?.fieldName || ''}
          onChange={(e) => onChange('fieldName', e.target.value)}
          placeholder="Field to update..."
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
          New Value
        </label>
        <input
          type="text"
          value={config?.value || ''}
          onChange={(e) => onChange('value', e.target.value)}
          placeholder="New value..."
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
  );
}

// Webhook config
function WebhookConfig({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          URL
        </label>
        <input
          type="url"
          value={config?.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://..."
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

      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Headers (JSON)
        </label>
        <textarea
          value={config?.headers || '{}'}
          onChange={(e) => onChange('headers', e.target.value)}
          rows={3}
          placeholder='{"Content-Type": "application/json"}'
          className={cn(
            "w-full px-3 py-2 rounded-md resize-none font-mono text-xs",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-[var(--bb-color-text-primary)]",
            "placeholder:text-[var(--bb-color-text-tertiary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>
    </div>
  );
}
