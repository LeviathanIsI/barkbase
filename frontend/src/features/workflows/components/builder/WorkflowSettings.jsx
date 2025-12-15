/**
 * WorkflowSettings - Settings panel for workflow configuration
 * Includes re-enrollment, suppression, goal, timing, and unenrollment settings
 */
import { useState } from 'react';
import {
  RefreshCw,
  Target,
  Clock,
  CalendarOff,
  LogOut,
  X,
  Plus,
  ChevronLeft,
} from 'lucide-react';
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

  // Fetch segments for suppression list
  const { data: segmentsData } = useSegments();
  const segments = segmentsData?.data || segmentsData || [];

  // Local state for pause date input
  const [newPauseDate, setNewPauseDate] = useState('');

  // Update a specific setting
  const updateSetting = (key, value) => {
    setWorkflowSettings({ [key]: value });
  };

  // Update nested setting
  const updateNestedSetting = (parentKey, childKey, value) => {
    const parent = settings[parentKey] || {};
    setWorkflowSettings({
      [parentKey]: { ...parent, [childKey]: value },
    });
  };

  // Toggle day in timing config
  const toggleDay = (day) => {
    const currentDays = settings.timingConfig?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    updateNestedSetting('timingConfig', 'days', newDays);
  };

  // Add pause date
  const addPauseDate = () => {
    if (!newPauseDate) return;
    const currentDates = settings.timingConfig?.pauseDates || [];
    if (!currentDates.includes(newPauseDate)) {
      updateNestedSetting('timingConfig', 'pauseDates', [...currentDates, newPauseDate]);
    }
    setNewPauseDate('');
  };

  // Remove pause date
  const removePauseDate = (date) => {
    const currentDates = settings.timingConfig?.pauseDates || [];
    updateNestedSetting('timingConfig', 'pauseDates', currentDates.filter((d) => d !== date));
  };

  // Toggle suppression segment
  const toggleSuppressionSegment = (segmentId) => {
    const currentIds = settings.suppressionSegmentIds || [];
    const newIds = currentIds.includes(segmentId)
      ? currentIds.filter((id) => id !== segmentId)
      : [...currentIds, segmentId];
    updateSetting('suppressionSegmentIds', newIds);
  };

  return (
    <div className="w-80 h-full border-r border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <button
          onClick={clearSelection}
          className="flex items-center gap-1 text-sm text-[var(--bb-color-text-secondary)] hover:text-[var(--bb-color-text-primary)]"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
          Settings
        </span>
        <div className="w-12" /> {/* Spacer for alignment */}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-auto">
        {/* Re-enrollment Section */}
        <SettingsSection
          icon={RefreshCw}
          title="Re-enrollment"
          description="Allow records to be enrolled multiple times"
        >
          <ToggleSetting
            label="Allow records to re-enroll in this workflow"
            checked={settings.allowReenrollment || false}
            onChange={(checked) => updateSetting('allowReenrollment', checked)}
          />
          {settings.allowReenrollment && (
            <div className="mt-3 pl-6">
              <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                Minimum days between re-enrollments
              </label>
              <input
                type="number"
                min="0"
                value={settings.reenrollmentDelayDays || 0}
                onChange={(e) => updateSetting('reenrollmentDelayDays', parseInt(e.target.value) || 0)}
                className={cn(
                  'w-24 h-8 px-2 rounded',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-sm text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              />
            </div>
          )}
        </SettingsSection>

        {/* Suppression Section */}
        <SettingsSection
          icon={LogOut}
          title="Suppression List"
          description="Records in these segments won't be enrolled"
        >
          {segments.length > 0 ? (
            <div className="space-y-2">
              {segments.map((segment) => (
                <label
                  key={segment.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(settings.suppressionSegmentIds || []).includes(segment.id)}
                    onChange={() => toggleSuppressionSegment(segment.id)}
                    className="w-4 h-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]"
                  />
                  <span className="text-sm text-[var(--bb-color-text-primary)]">
                    {segment.name}
                  </span>
                  <span className="text-xs text-[var(--bb-color-text-tertiary)]">
                    ({segment.memberCount || 0})
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--bb-color-text-tertiary)] italic">
              No segments available
            </div>
          )}
        </SettingsSection>

        {/* Goal Section */}
        <SettingsSection
          icon={Target}
          title="Goal (Auto-unenrollment)"
          description="Remove records when they meet these conditions"
        >
          <ToggleSetting
            label="Enable goal-based unenrollment"
            checked={settings.goalConfig?.enabled || false}
            onChange={(checked) => updateNestedSetting('goalConfig', 'enabled', checked)}
          />
          {settings.goalConfig?.enabled && (
            <div className="mt-3">
              <ConditionBuilder
                objectType={objectType}
                conditions={settings.goalConfig?.conditions || { logic: 'and', conditions: [] }}
                onChange={(conditions) => updateNestedSetting('goalConfig', 'conditions', conditions)}
                label="Unenroll when"
              />
              <p className="text-xs text-[var(--bb-color-text-tertiary)] mt-2">
                Records meeting these conditions will be automatically unenrolled
              </p>
            </div>
          )}
        </SettingsSection>

        {/* Execution Timing Section */}
        <SettingsSection
          icon={Clock}
          title="Execution Timing"
          description="Restrict when workflow actions can run"
        >
          <ToggleSetting
            label="Only execute during specific times"
            checked={settings.timingConfig?.enabled || false}
            onChange={(checked) => updateNestedSetting('timingConfig', 'enabled', checked)}
          />
          {settings.timingConfig?.enabled && (
            <div className="mt-3 space-y-4">
              {/* Days of week */}
              <div>
                <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-2">
                  Days
                </label>
                <div className="flex flex-wrap gap-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = (settings.timingConfig?.days || []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-[var(--bb-color-accent)] text-white'
                            : 'bg-[var(--bb-color-bg-body)] text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)]'
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time window */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={settings.timingConfig?.startTime || '09:00'}
                    onChange={(e) => updateNestedSetting('timingConfig', 'startTime', e.target.value)}
                    className={cn(
                      'w-full h-8 px-2 rounded',
                      'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                      'text-sm text-[var(--bb-color-text-primary)]',
                      'focus:outline-none focus:border-[var(--bb-color-accent)]'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                    End time
                  </label>
                  <input
                    type="time"
                    value={settings.timingConfig?.endTime || '17:00'}
                    onChange={(e) => updateNestedSetting('timingConfig', 'endTime', e.target.value)}
                    className={cn(
                      'w-full h-8 px-2 rounded',
                      'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                      'text-sm text-[var(--bb-color-text-primary)]',
                      'focus:outline-none focus:border-[var(--bb-color-accent)]'
                    )}
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs text-[var(--bb-color-text-tertiary)] mb-1.5">
                  Timezone
                </label>
                <select
                  value={settings.timingConfig?.timezone || 'America/New_York'}
                  onChange={(e) => updateNestedSetting('timingConfig', 'timezone', e.target.value)}
                  className={cn(
                    'w-full h-8 px-2 rounded',
                    'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                    'text-sm text-[var(--bb-color-text-primary)]',
                    'focus:outline-none focus:border-[var(--bb-color-accent)]'
                  )}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-[var(--bb-color-text-tertiary)]">
                Actions will only execute during these times
              </p>
            </div>
          )}
        </SettingsSection>

        {/* Pause Dates Section */}
        <SettingsSection
          icon={CalendarOff}
          title="Pause Dates"
          description="Pause workflow on specific dates"
        >
          {/* Add new date */}
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={newPauseDate}
              onChange={(e) => setNewPauseDate(e.target.value)}
              className={cn(
                'flex-1 h-8 px-2 rounded',
                'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                'text-sm text-[var(--bb-color-text-primary)]',
                'focus:outline-none focus:border-[var(--bb-color-accent)]'
              )}
            />
            <button
              onClick={addPauseDate}
              disabled={!newPauseDate}
              className={cn(
                'px-3 h-8 rounded flex items-center gap-1',
                'text-sm font-medium transition-colors',
                newPauseDate
                  ? 'bg-[var(--bb-color-accent)] text-white hover:bg-[var(--bb-color-accent-hover)]'
                  : 'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-tertiary)] cursor-not-allowed'
              )}
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* List of pause dates */}
          {(settings.timingConfig?.pauseDates || []).length > 0 && (
            <div className="space-y-1 mb-3">
              {(settings.timingConfig?.pauseDates || []).map((date) => (
                <div
                  key={date}
                  className="flex items-center justify-between px-2 py-1.5 rounded bg-[var(--bb-color-bg-body)]"
                >
                  <span className="text-sm text-[var(--bb-color-text-primary)]">
                    {new Date(date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => removePauseDate(date)}
                    className="text-[var(--bb-color-text-tertiary)] hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <ToggleSetting
            label="Pause annually on these dates"
            checked={settings.timingConfig?.pauseAnnually || false}
            onChange={(checked) => updateNestedSetting('timingConfig', 'pauseAnnually', checked)}
          />
        </SettingsSection>

        {/* Unenrollment Triggers Section */}
        <SettingsSection
          icon={LogOut}
          title="Unenrollment Triggers"
          description="Additional conditions to remove records"
        >
          <ToggleSetting
            label="Unenroll when record no longer meets enrollment criteria"
            checked={settings.unenrollOnCriteriaChange || false}
            onChange={(checked) => updateSetting('unenrollOnCriteriaChange', checked)}
          />

          <div className="mt-3">
            <ToggleSetting
              label="Enable custom unenrollment triggers"
              checked={settings.unenrollmentTriggers?.enabled || false}
              onChange={(checked) => updateNestedSetting('unenrollmentTriggers', 'enabled', checked)}
            />
          </div>

          {settings.unenrollmentTriggers?.enabled && (
            <div className="mt-3">
              <ConditionBuilder
                objectType={objectType}
                conditions={settings.unenrollmentTriggers?.conditions || { logic: 'and', conditions: [] }}
                onChange={(conditions) => updateNestedSetting('unenrollmentTriggers', 'conditions', conditions)}
                label="Unenroll when"
              />
            </div>
          )}
        </SettingsSection>
      </div>
    </div>
  );
}

// Settings section wrapper component
function SettingsSection({ icon, title, description, children }) {
  const IconComponent = icon;
  return (
    <div className="p-4 border-b border-[var(--bb-color-border-subtle)]">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--bb-color-bg-body)] flex items-center justify-center flex-shrink-0">
          <IconComponent size={16} className="text-[var(--bb-color-text-secondary)]" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--bb-color-text-primary)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--bb-color-text-tertiary)]">
            {description}
          </p>
        </div>
      </div>
      <div className="pl-11">{children}</div>
    </div>
  );
}

// Toggle setting component
function ToggleSetting({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-[var(--bb-color-accent)]' : 'bg-[var(--bb-color-bg-body)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </button>
      <span className="text-sm text-[var(--bb-color-text-primary)]">{label}</span>
    </label>
  );
}
