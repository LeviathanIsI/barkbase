import { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import CriteriaGroup from './trigger/CriteriaGroup';
import ScheduleTrigger from './trigger/ScheduleTrigger';

const TriggerConfigurator = ({ trigger, onClose, onUpdate }) => {
  const [manuallyTriggered, setManuallyTriggered] = useState(trigger?.manuallyTriggered ?? true);
  const [criteriaGroups, setCriteriaGroups] = useState(trigger?.criteriaGroups ?? []);
  const [scheduleTrigger, setScheduleTrigger] = useState(trigger?.scheduleTrigger ?? null);
  const [enrollmentFilters, setEnrollmentFilters] = useState(trigger?.enrollmentFilters ?? []);

  const handleAddCriteriaGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${criteriaGroups.length + 1}`,
      criteria: [],
    };
    setCriteriaGroups([...criteriaGroups, newGroup]);
  };

  const handleRemoveCriteriaGroup = (groupId) => {
    setCriteriaGroups(criteriaGroups.filter(g => g.id !== groupId));
  };

  const handleUpdateCriteriaGroup = (groupId, updatedGroup) => {
    setCriteriaGroups(criteriaGroups.map(g =>
      g.id === groupId ? { ...g, ...updatedGroup } : g
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
    const newFilter = {
      id: `filter-${Date.now()}`,
      name: `Group ${enrollmentFilters.length + 1}`,
      criteria: [],
    };
    setEnrollmentFilters([...enrollmentFilters, newFilter]);
  };

  const handleRemoveEnrollmentFilter = (filterId) => {
    setEnrollmentFilters(enrollmentFilters.filter(f => f.id !== filterId));
  };

  const handleUpdateEnrollmentFilter = (filterId, updatedFilter) => {
    setEnrollmentFilters(enrollmentFilters.map(f =>
      f.id === filterId ? { ...f, ...updatedFilter } : f
    ));
  };

  const handleSave = () => {
    const triggerConfig = {
      manuallyTriggered,
      criteriaGroups,
      scheduleTrigger,
      enrollmentFilters,
    };
    onUpdate(trigger.id, triggerConfig);
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
        <button className="flex-1 px-4 py-3 text-sm font-medium border-b-2 border-primary text-primary bg-primary/5">
          Start triggers
        </button>
        <button className="flex-1 px-4 py-3 text-sm font-medium text-muted hover:bg-border/30">
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
            <div key={group.id}>
              <CriteriaGroup
                group={group}
                onUpdate={(updated) => handleUpdateCriteriaGroup(group.id, updated)}
                onRemove={() => handleRemoveCriteriaGroup(group.id)}
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
                <div key={filter.id}>
                  <CriteriaGroup
                    group={filter}
                    onUpdate={(updated) => handleUpdateEnrollmentFilter(filter.id, updated)}
                    onRemove={() => handleRemoveEnrollmentFilter(filter.id)}
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
