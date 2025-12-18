/**
 * WorkflowSettings - HubSpot-style settings panel for workflow configuration
 * Matches HubSpot's workflow settings design pattern
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

  // Fetch segments for suppression list (for future use)
  useSegments();

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
    <div className="w-96 h-full border-l border-[var(--bb-color-border-subtle)] bg-white flex flex-col">
      {/* Teal Header - HubSpot style */}
      <div className="flex-shrink-0 px-5 py-4 bg-[#00A4BD] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-white/20 transition-colors"
        >
          <X size={20} className="text-white" />
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
            <p className="text-xs text-gray-500 mt-2">
              Up to 20 workflows (3 used) <Info size={12} className="inline ml-1" />
            </p>
            <p className="text-xs text-gray-500">
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
                <label className="block text-xs text-gray-500 mb-1">
                  Minimum days between re-enrollments
                </label>
                <input
                  type="number"
                  min="0"
                  value={localSettings.reenrollmentDelayDays || 0}
                  onChange={(e) => updateLocalSetting('reenrollmentDelayDays', parseInt(e.target.value) || 0)}
                  className={cn(
                    'w-24 h-8 px-2 rounded',
                    'bg-white border border-gray-300',
                    'text-sm text-gray-900',
                    'focus:outline-none focus:border-blue-400'
                  )}
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
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            'px-4 py-2 rounded text-sm font-medium transition-colors',
            hasChanges
              ? 'bg-[#00A4BD] text-white hover:bg-[#008DA3]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded text-sm font-medium text-[#F2545B] hover:bg-red-50 transition-colors"
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
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// Card wrapper for settings
function SettingsCard({ children }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
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
      <HubSpotToggle checked={checked} onChange={onChange} />
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {infoTooltip && (
            <Info size={14} className="text-gray-400" />
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
        {learnMore && (
          <a
            href="#"
            className="inline-flex items-center gap-1 text-xs text-[#00A4BD] hover:underline mt-0.5"
          >
            Learn more. <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

// HubSpot-style toggle switch
function HubSpotToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex-shrink-0 w-12 h-6 rounded-full transition-colors',
        checked ? 'bg-[#00A4BD]' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
          checked ? 'left-7' : 'left-1'
        )}
      />
      <span
        className={cn(
          'absolute top-1 text-[9px] font-bold uppercase',
          checked ? 'left-1.5 text-white' : 'right-1 text-gray-500'
        )}
      >
        {checked ? '' : 'OFF'}
      </span>
    </button>
  );
}
