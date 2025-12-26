/**
 * WorkflowSettings - enterprise settings panel for workflow configuration
 * Enterprise-grade workflow settings design pattern
 */
import { useState, useEffect } from 'react';
import { X, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import { useSegments } from '@/features/segments/api';
import {
  COMMON_TIMEZONES,
  DAYS_OF_WEEK,
  DEFAULT_WORKFLOW_SETTINGS,
} from '../../constants';
import ConditionBuilder from './config/ConditionBuilder';

export default function WorkflowSettings() {
  const {
    workflow,
    setWorkflowSettings,
    clearSelection,
  } = useWorkflowBuilderStore();

  const settings = workflow.settings || DEFAULT_WORKFLOW_SETTINGS;
  const objectType = workflow.objectType || 'pet';

  // Local state for editing
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local settings when store settings change
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  // Fetch segments for suppression list
  const { data: segments = [], isLoading: segmentsLoading } = useSegments();

  // Update a local setting
  const updateLocalSetting = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Update nested local setting
  const updateNestedLocalSetting = (parentKey, childKey, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [parentKey]: { ...prev[parentKey], [childKey]: value },
    }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = () => {
    setWorkflowSettings(localSettings);
    setHasChanges(false);
    clearSelection();
  };

  // Cancel and close
  const handleCancel = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    clearSelection();
  };

  return (
    <div className="w-96 h-full border-l border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">Settings</h2>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
        >
          <X size={20} className="text-[var(--bb-color-text-tertiary)]" />
        </button>
      </div>

      {/* Settings content - scrollable */}
      <div className="flex-1 overflow-auto">
        {/* Schedule when actions can run */}
        <SettingsSection title="Schedule when actions can run">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Run actions on specific dates & times only"
              description="Doesn't impact delays or branches."
              checked={localSettings.timingConfig?.enabled || false}
              onChange={(checked) => updateNestedLocalSetting('timingConfig', 'enabled', checked)}
              learnMore
            />
          </SettingsCard>

          <SettingsCard>
            <ToggleSettingWithDescription
              title="Pause actions on specific dates"
              description="Doesn't impact delays or branches."
              checked={localSettings.timingConfig?.pauseEnabled || false}
              onChange={(checked) => updateNestedLocalSetting('timingConfig', 'pauseEnabled', checked)}
              learnMore
            />
          </SettingsCard>

          <SettingsCard>
            <ToggleSettingWithDescription
              title="Schedule this workflow to turn off automatically"
              description="Any runs in progress will end early"
              checked={localSettings.autoTurnOff?.enabled || false}
              onChange={(checked) => updateNestedLocalSetting('autoTurnOff', 'enabled', checked)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Analyze performance */}
        <SettingsSection title="Analyze performance">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Get notified about workflow issues"
              checked={localSettings.notifications?.workflowIssues || false}
              onChange={(checked) => updateNestedLocalSetting('notifications', 'workflowIssues', checked)}
              infoTooltip
            />
          </SettingsCard>

          <SettingsCard>
            <ToggleSettingWithDescription
              title="Get notified if the enrollment rate changes"
              checked={localSettings.notifications?.enrollmentRateChanges || false}
              onChange={(checked) => updateNestedLocalSetting('notifications', 'enrollmentRateChanges', checked)}
              infoTooltip
            />
          </SettingsCard>

          <SettingsCard>
            <ToggleSettingWithDescription
              title="Compare conversion metrics for each path"
              description="See metrics, including how many records reached each step, and how many had errors at each step."
              checked={localSettings.metrics?.compareConversion || false}
              onChange={(checked) => updateNestedLocalSetting('metrics', 'compareConversion', checked)}
            />
            <p className="text-xs text-[var(--bb-color-text-tertiary)] mt-2">
              Up to 20 workflows (3 used) <Info size={12} className="inline ml-1" />
            </p>
            <p className="text-xs text-[var(--bb-color-text-tertiary)]">
              Metrics use isn't recommended for this workflow <Info size={12} className="inline ml-1" />
            </p>
          </SettingsCard>
        </SettingsSection>

        {/* Connections */}
        <SettingsSection title="Connections">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Unenroll records from other workflows when they enroll in this workflow"
              checked={localSettings.unenrollFromOtherWorkflows || false}
              onChange={(checked) => updateLocalSetting('unenrollFromOtherWorkflows', checked)}
            />
          </SettingsCard>
        </SettingsSection>

        {/* Re-enrollment */}
        <SettingsSection title="Re-enrollment">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Allow records to re-enroll in this workflow"
              description="Records that have completed or been unenrolled can be enrolled again."
              checked={localSettings.allowReenrollment || false}
              onChange={(checked) => updateLocalSetting('allowReenrollment', checked)}
            />
            {localSettings.allowReenrollment && (
              <div className="mt-3 ml-12">
                <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                  Minimum days between re-enrollments
                </label>
                <input
                  type="number"
                  min="0"
                  value={localSettings.reenrollmentDelayDays || 0}
                  onChange={(e) => updateLocalSetting('reenrollmentDelayDays', parseInt(e.target.value) || 0)}
                  className={cn(
                    'w-24 h-8 px-2 rounded',
                    'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                    'text-sm text-[var(--bb-color-text-primary)]',
                    'focus:outline-none focus:border-[var(--bb-color-accent)]'
                  )}
                />
              </div>
            )}
          </SettingsCard>
        </SettingsSection>

        {/* Suppression List */}
        <SettingsSection title="Suppression list">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Exclude records in specific segments"
              description="Records in selected segments will not be enrolled in this workflow."
              checked={localSettings.suppressionEnabled || false}
              onChange={(checked) => {
                updateLocalSetting('suppressionEnabled', checked);
                if (!checked) {
                  updateLocalSetting('suppressionSegmentIds', []);
                }
              }}
            />
            {localSettings.suppressionEnabled && (
              <div className="mt-3 ml-12">
                <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-2">
                  Select segments to suppress
                </label>
                <SegmentMultiSelect
                  segments={segments}
                  selectedIds={localSettings.suppressionSegmentIds || []}
                  onChange={(ids) => updateLocalSetting('suppressionSegmentIds', ids)}
                  isLoading={segmentsLoading}
                  placeholder="Select segments..."
                />
              </div>
            )}
          </SettingsCard>
        </SettingsSection>

        {/* Goal */}
        <SettingsSection title="Goal">
          <SettingsCard>
            <ToggleSettingWithDescription
              title="Enable goal-based unenrollment"
              description="Automatically unenroll records when they meet certain conditions."
              checked={localSettings.goalConfig?.enabled || false}
              onChange={(checked) => updateNestedLocalSetting('goalConfig', 'enabled', checked)}
            />
            {localSettings.goalConfig?.enabled && (
              <div className="mt-3">
                <ConditionBuilder
                  objectType={objectType}
                  conditions={localSettings.goalConfig?.conditions || { logic: 'and', conditions: [] }}
                  onChange={(conditions) => updateNestedLocalSetting('goalConfig', 'conditions', conditions)}
                  label="Unenroll when"
                />
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      </div>

      {/* Footer with Save/Cancel buttons */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            'px-4 py-2 rounded text-sm font-medium transition-colors',
            hasChanges
              ? 'bg-[var(--bb-color-accent)] text-white hover:bg-[var(--bb-color-accent-hover)]'
              : 'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-tertiary)] cursor-not-allowed'
          )}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded text-sm font-medium text-[var(--bb-color-status-negative)] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Settings section with title
function SettingsSection({ title, children }) {
  return (
    <div className="px-5 py-4">
      <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)] mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// Card wrapper for settings
function SettingsCard({ children }) {
  return (
    <div className="p-4 border border-[var(--bb-color-border-subtle)] rounded-lg bg-[var(--bb-color-bg-elevated)]">
      {children}
    </div>
  );
}

// Toggle setting with optional description, learn more link, or info tooltip
function ToggleSettingWithDescription({
  title,
  description,
  checked,
  onChange,
  learnMore,
  infoTooltip,
}) {
  return (
    <div className="flex items-start gap-3">
      <ToggleSwitch checked={checked} onChange={onChange} />
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">{title}</span>
          {infoTooltip && (
            <Info size={14} className="text-[var(--bb-color-text-tertiary)]" />
          )}
        </div>
        {description && (
          <p className="text-xs text-[var(--bb-color-text-secondary)] mt-0.5">{description}</p>
        )}
        {learnMore && (
          <a
            href="#"
            className="inline-flex items-center gap-1 text-xs text-[var(--bb-color-accent)] hover:underline mt-0.5"
          >
            Learn more. <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

// Toggle switch component
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors',
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      {/* Knob */}
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
          checked ? 'left-6' : 'left-1'
        )}
      />
    </button>
  );
}

// Multi-select dropdown for segments
function SegmentMultiSelect({ segments, selectedIds, onChange, isLoading, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSegments = segments.filter((s) => selectedIds.includes(s.id));

  const toggleSegment = (segmentId) => {
    if (selectedIds.includes(segmentId)) {
      onChange(selectedIds.filter((id) => id !== segmentId));
    } else {
      onChange([...selectedIds, segmentId]);
    }
  };

  const removeSegment = (segmentId, e) => {
    e.stopPropagation();
    onChange(selectedIds.filter((id) => id !== segmentId));
  };

  return (
    <div className="relative">
      {/* Selected segments display / trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[36px] px-3 py-2 rounded text-left',
          'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
          'text-sm text-[var(--bb-color-text-primary)]',
          'focus:outline-none focus:border-[var(--bb-color-accent)]',
          'flex flex-wrap gap-1 items-center'
        )}
      >
        {selectedSegments.length > 0 ? (
          selectedSegments.map((segment) => (
            <span
              key={segment.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bb-color-accent-muted)] text-[var(--bb-color-accent)] text-xs"
            >
              {segment.name}
              <button
                type="button"
                onClick={(e) => removeSegment(segment.id, e)}
                className="hover:text-[var(--bb-color-accent-hover)]"
              >
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <span className="text-[var(--bb-color-text-tertiary)]">
            {isLoading ? 'Loading segments...' : placeholder}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] shadow-lg">
          {segments.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--bb-color-text-tertiary)]">
              No segments available
            </div>
          ) : (
            segments.map((segment) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => toggleSegment(segment.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                  'hover:bg-[var(--bb-color-bg-elevated)] transition-colors',
                  selectedIds.includes(segment.id)
                    ? 'text-[var(--bb-color-accent)]'
                    : 'text-[var(--bb-color-text-primary)]'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center',
                    selectedIds.includes(segment.id)
                      ? 'bg-[var(--bb-color-accent)] border-[var(--bb-color-accent)]'
                      : 'border-[var(--bb-color-border-subtle)]'
                  )}
                >
                  {selectedIds.includes(segment.id) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span>{segment.name}</span>
                <span className="ml-auto text-xs text-[var(--bb-color-text-tertiary)]">
                  {segment.memberCount || 0} members
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
