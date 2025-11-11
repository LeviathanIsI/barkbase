import { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import CriteriaGroup from './trigger/CriteriaGroup';
import ScheduleTrigger from './trigger/ScheduleTrigger';

const TriggerConfigurator = ({ trigger, onClose, onUpdate }) => {
  const [tab, setTab] = useState('start'); // 'start' or 'settings'
  const [manuallyTriggered, setManuallyTriggered] = useState(trigger?.manuallyTriggered ?? true);
  const [criteriaGroups, setCriteriaGroups] = useState(trigger?.criteriaGroups ?? []);
  const [scheduleTrigger, setScheduleTrigger] = useState(trigger?.scheduleTrigger ?? null);
  const [enrollmentFilters, setEnrollmentFilters] = useState(trigger?.enrollmentFilters ?? []);

  // Settings state
  const [reEnrollment, setReEnrollment] = useState(trigger?.settings?.reEnrollment ?? 'disallow');
  const [cooldownMinutes, setCooldownMinutes] = useState(trigger?.settings?.cooldownMinutes ?? 60);
  const [timezone, setTimezone] = useState(trigger?.settings?.timezone ?? 'America/New_York');
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(trigger?.settings?.maxConcurrentRuns ?? 10);
  const [maxAttempts, setMaxAttempts] = useState(trigger?.settings?.defaultRetry?.maxAttempts ?? 3);
  const [backoffStrategy, setBackoffStrategy] = useState(trigger?.settings?.defaultRetry?.backoff ?? 'exponential');
  const [initialMs, setInitialMs] = useState(trigger?.settings?.defaultRetry?.initialMs ?? 1000);
  const [maxMs, setMaxMs] = useState(trigger?.settings?.defaultRetry?.maxMs ?? 60000);
  const [enforceActionIdempotency, setEnforceActionIdempotency] = useState(trigger?.settings?.enforceActionIdempotency ?? true);

  const handleAddCriteriaGroup = () => {
    const newGroup = { recordId: `group-${Date.now()}`,
      name: `Group ${criteriaGroups.length + 1}`,
      criteria: [],
    };
    setCriteriaGroups([...criteriaGroups, newGroup]);
  };

  const handleRemoveCriteriaGroup = (groupId) => {
    setCriteriaGroups(criteriaGroups.filter(g => g.recordId !== groupId));
  };

  const handleUpdateCriteriaGroup = (groupId, updatedGroup) => {
    setCriteriaGroups(criteriaGroups.map(g =>
      g.recordId === groupId ? { ...g, ...updatedGroup } : g
    ));
  };

  const handleAddSchedule = () => {
    setScheduleTrigger({
      frequency: 'once',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
    });
  };

  const handleRemoveSchedule = () => {
    setScheduleTrigger(null);
  };

  const handleUpdateSchedule = (updated) => {
    setScheduleTrigger(updated);
  };

  const handleAddEnrollmentFilter = () => {
    const newFilter = { recordId: `filter-${Date.now()}`,
      name: `Group ${enrollmentFilters.length + 1}`,
      criteria: [],
    };
    setEnrollmentFilters([...enrollmentFilters, newFilter]);
  };

  const handleRemoveEnrollmentFilter = (filterId) => {
    setEnrollmentFilters(enrollmentFilters.filter(f => f.recordId !== filterId));
  };

  const handleUpdateEnrollmentFilter = (filterId, updatedFilter) => {
    setEnrollmentFilters(enrollmentFilters.map(f =>
      f.recordId === filterId ? { ...f, ...updatedFilter } : f
    ));
  };

  const handleSave = () => {
    const triggerConfig = {
      manuallyTriggered,
      criteriaGroups,
      scheduleTrigger,
      enrollmentFilters,
      settings: {
        reEnrollment,
        cooldownMinutes: reEnrollment === 'cooldown' ? cooldownMinutes : undefined,
        timezone,
        maxConcurrentRuns,
        defaultRetry: {
          maxAttempts,
          backoff: backoffStrategy,
          initialMs,
          maxMs,
        },
        enforceActionIdempotency,
      },
    };
    onUpdate(trigger.recordId, triggerConfig);
    onClose();
  };

  return (
    <div className="w-96 border-r border-border bg-surface flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Triggers</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-border/50 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex">
        <button
          onClick={() => setTab('start')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'start'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted hover:bg-border/30'
          }`}
        >
          Start triggers
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'settings'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted hover:bg-border/30'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {tab === 'start' && (
          <>
        {/* Start when this happens */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-3">Start when this happens</h3>

          {/* Manually triggered */}
          <div className="bg-background rounded-lg border border-border p-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manuallyTriggered}
                onChange={(e) => setManuallyTriggered(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-text">Manually triggered</span>
            </label>
          </div>

          {/* OR divider if there are any other triggers */}
          {(criteriaGroups.length > 0 || scheduleTrigger) && (
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-surface text-xs font-semibold text-muted">OR</span>
              </div>
            </div>
          )}

          {/* Criteria Groups */}
          {criteriaGroups.map((group, index) => (
            <div key={group.recordId}>
              <CriteriaGroup
                group={group}
                onUpdate={(updated) => handleUpdateCriteriaGroup(group.recordId, updated)}
                onRemove={() => handleRemoveCriteriaGroup(group.recordId)}
              />
              {/* OR divider between groups or before schedule */}
              {(index < criteriaGroups.length - 1 || scheduleTrigger) && (
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-surface text-xs font-semibold text-muted">OR</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Schedule Trigger */}
          {scheduleTrigger && (
            <>
              <ScheduleTrigger
                schedule={scheduleTrigger}
                onUpdate={handleUpdateSchedule}
                onRemove={handleRemoveSchedule}
              />
              {criteriaGroups.length > 0 && (
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-surface text-xs font-semibold text-muted">OR</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Add trigger buttons */}
          <div className="space-y-2 mt-3">
            <button
              onClick={handleAddCriteriaGroup}
              className="w-full px-3 py-2 text-sm text-muted hover:text-primary hover:bg-primary/5 rounded border border-dashed border-border hover:border-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add criteria
            </button>

            {!scheduleTrigger && (
              <button
                onClick={handleAddSchedule}
                className="w-full px-3 py-2 text-sm text-muted hover:text-primary hover:bg-primary/5 rounded border border-dashed border-border hover:border-primary transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Add schedule
              </button>
            )}
          </div>
        </div>

        {/* Enrollment Filters (Optional) */}
        <div className="border-t border-border pt-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-text">
              Only enroll records that meet these conditions
            </h3>
            <p className="text-xs text-muted mt-1">(optional)</p>
          </div>

          {enrollmentFilters.length === 0 ? (
            <div className="bg-background rounded-lg border border-border p-4 text-center">
              <p className="text-sm text-muted mb-3">This workflow doesn't have any criteria</p>
              <button
                onClick={handleAddEnrollmentFilter}
                className="text-sm text-primary hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add criteria
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollmentFilters.map((filter, index) => (
                <div key={filter.recordId}>
                  <CriteriaGroup
                    group={filter}
                    onUpdate={(updated) => handleUpdateEnrollmentFilter(filter.recordId, updated)}
                    onRemove={() => handleRemoveEnrollmentFilter(filter.recordId)}
                    isEnrollmentFilter
                  />
                  {index < enrollmentFilters.length - 1 && (
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-2 bg-surface text-xs font-semibold text-muted">OR</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddEnrollmentFilter}
                className="w-full px-3 py-2 text-sm text-muted hover:text-primary hover:bg-primary/5 rounded border border-dashed border-border hover:border-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add criteria
              </button>
            </div>
          )}
        </div>
          </>
        )}

        {tab === 'settings' && (
          <>
            {/* Re-enrollment Settings */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Re-enrollment</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reEnrollment"
                    value="disallow"
                    checked={reEnrollment === 'disallow'}
                    onChange={(e) => setReEnrollment(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">Disallow re-enrollment</span>
                    <p className="text-xs text-muted">Record can only enter this flow once</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reEnrollment"
                    value="allow"
                    checked={reEnrollment === 'allow'}
                    onChange={(e) => setReEnrollment(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">Allow re-enrollment</span>
                    <p className="text-xs text-muted">Record can enter multiple times</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reEnrollment"
                    value="cooldown"
                    checked={reEnrollment === 'cooldown'}
                    onChange={(e) => setReEnrollment(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-primary mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-text">Allow with cooldown</span>
                    <p className="text-xs text-muted mb-2">Set a minimum time between enrollments</p>
                    {reEnrollment === 'cooldown' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={cooldownMinutes}
                          onChange={(e) => setCooldownMinutes(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-border rounded focus:ring-primary focus:border-primary"
                          min="1"
                        />
                        <span className="text-sm text-muted">minutes</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Timezone */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-text mb-3">Timezone</h3>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary"
              >
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                <option value="America/Denver">America/Denver (MST/MDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="UTC">UTC</option>
              </select>
              <p className="text-xs text-muted mt-2">Schedule triggers and delays will use this timezone</p>
            </div>

            {/* Concurrency */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-text mb-3">Concurrency</h3>
              <div className="space-y-2">
                <label className="text-sm text-muted">Maximum concurrent runs per tenant</label>
                <input
                  type="number"
                  value={maxConcurrentRuns}
                  onChange={(e) => setMaxConcurrentRuns(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-muted">Limits how many instances can run simultaneously</p>
              </div>
            </div>

            {/* Default Retry Policy */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-text mb-3">Default Retry Policy</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted">Max attempts</label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary mt-1"
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted">Backoff strategy</label>
                  <select
                    value={backoffStrategy}
                    onChange={(e) => setBackoffStrategy(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary mt-1"
                  >
                    <option value="fixed">Fixed delay</option>
                    <option value="exponential">Exponential backoff</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted">Initial delay (ms)</label>
                    <input
                      type="number"
                      value={initialMs}
                      onChange={(e) => setInitialMs(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary mt-1"
                      min="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted">Max delay (ms)</label>
                    <input
                      type="number"
                      value={maxMs}
                      onChange={(e) => setMaxMs(parseInt(e.target.value) || 1000)}
                      className="w-full px-3 py-2 text-sm border border-border rounded focus:ring-primary focus:border-primary mt-1"
                      min="1000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Idempotency */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-text mb-3">Idempotency</h3>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enforceActionIdempotency}
                  onChange={(e) => setEnforceActionIdempotency(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-text">Enforce action-level idempotency</span>
                  <p className="text-xs text-muted">Prevents duplicate actions using outbox pattern</p>
                </div>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default TriggerConfigurator;
