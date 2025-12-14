/**
 * SettingsTab - Settings tab for workflow details
 */
import { TRIGGER_TYPE_CONFIG, OBJECT_TYPE_CONFIG } from '../../constants';

export default function SettingsTab({ workflow }) {
  const settings = workflow?.settings || {};
  const entryCondition = workflow?.entry_condition || {};

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General Info */}
      <SettingsSection title="General">
        <SettingsRow label="Name" value={workflow.name} />
        <SettingsRow label="Description" value={workflow.description || '-'} />
        <SettingsRow
          label="Object Type"
          value={OBJECT_TYPE_CONFIG[workflow.object_type]?.label || workflow.object_type}
        />
        <SettingsRow label="Status" value={workflow.status} />
        <SettingsRow
          label="Created"
          value={new Date(workflow.created_at).toLocaleString()}
        />
        {workflow.updated_at && (
          <SettingsRow
            label="Last Modified"
            value={new Date(workflow.updated_at).toLocaleString()}
          />
        )}
      </SettingsSection>

      {/* Trigger Settings */}
      <SettingsSection title="Trigger">
        <SettingsRow
          label="Trigger Type"
          value={TRIGGER_TYPE_CONFIG[entryCondition.triggerType]?.label || entryCondition.triggerType || 'Not configured'}
        />
        {entryCondition.eventType && (
          <SettingsRow label="Event" value={entryCondition.eventType} />
        )}
      </SettingsSection>

      {/* Enrollment Settings */}
      <SettingsSection title="Enrollment">
        <SettingsRow
          label="Allow Re-enrollment"
          value={settings.allowReenrollment ? 'Yes' : 'No'}
        />
        {settings.allowReenrollment && (
          <SettingsRow
            label="Re-enrollment Delay"
            value={`${settings.reenrollmentDelayDays || 30} days`}
          />
        )}
      </SettingsSection>

      {/* Timing Settings */}
      <SettingsSection title="Timing">
        <SettingsRow
          label="Timezone"
          value={settings.timezone || 'America/New_York'}
        />
        {settings.executionWindow ? (
          <>
            <SettingsRow
              label="Execution Window"
              value={`${settings.executionWindow.startTime} - ${settings.executionWindow.endTime}`}
            />
            <SettingsRow
              label="Execution Days"
              value={settings.executionWindow.days?.join(', ') || 'All days'}
            />
          </>
        ) : (
          <SettingsRow label="Execution Window" value="24/7" />
        )}
      </SettingsSection>

      {/* Suppression Settings */}
      <SettingsSection title="Suppression">
        {settings.suppressionSegments?.length > 0 ? (
          <SettingsRow
            label="Suppressed Segments"
            value={settings.suppressionSegments.join(', ')}
          />
        ) : (
          <div className="text-sm text-[var(--bb-color-text-tertiary)]">
            No suppression segments configured
          </div>
        )}
      </SettingsSection>

      {/* Raw Settings (for debugging) */}
      {import.meta.env.DEV && (
        <SettingsSection title="Raw Settings (Debug)">
          <pre className="text-xs font-mono text-[var(--bb-color-text-tertiary)] p-3 bg-[var(--bb-color-bg-body)] rounded overflow-auto max-h-64">
            {JSON.stringify({ settings, entryCondition }, null, 2)}
          </pre>
        </SettingsSection>
      )}
    </div>
  );
}

// Settings section component
function SettingsSection({ title, children }) {
  return (
    <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
          {title}
        </h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

// Settings row component
function SettingsRow({ label, value }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-sm text-[var(--bb-color-text-secondary)]">
        {label}
      </span>
      <span className="text-sm text-[var(--bb-color-text-primary)] text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
