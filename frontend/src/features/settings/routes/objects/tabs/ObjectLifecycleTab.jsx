import { useState } from 'react';
import {
  Circle, Plus, GripVertical, Settings, Trash2, Edit, Save, CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectLifecycleTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [statuses, setStatuses] = useState(config?.statuses || []);
  const [editingStatus, setEditingStatus] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState(statuses[0]?.id || '');

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  // If this object has a pipeline, redirect to pipelines tab message
  if (config.hasPipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">This object uses pipelines for lifecycle management.</p>
        <p className="text-sm text-muted mt-2">
          Configure stages in the Pipelines tab instead.
        </p>
      </div>
    );
  }

  const handleAddStatus = () => {
    const newStatus = {
      id: `status_${Date.now()}`,
      label: 'New Status',
      color: '#6b7280',
    };
    setStatuses([...statuses, newStatus]);
    setEditingStatus(newStatus.id);
  };

  const handleSaveStatus = (statusId, updates) => {
    setStatuses((prev) =>
      prev.map((s) => (s.id === statusId ? { ...s, ...updates } : s))
    );
    setEditingStatus(null);
  };

  const handleDeleteStatus = (statusId) => {
    if (statuses.length <= 1) {
      alert('You must have at least one status');
      return;
    }
    if (!confirm('Are you sure you want to delete this status?')) return;
    setStatuses((prev) => prev.filter((s) => s.id !== statusId));
    if (defaultStatus === statusId) {
      setDefaultStatus(statuses.find((s) => s.id !== statusId)?.id || '');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Configure lifecycle stages for {config.labelPlural.toLowerCase()}. These statuses help you track the state of each record.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Status Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status Configuration */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-text">Status Options</h3>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddStatus}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Status
              </Button>
            </div>

            <div className="space-y-2">
              {statuses.map((status) => {
                const isEditing = editingStatus === status.id;
                const isDefault = defaultStatus === status.id;

                return (
                  <div
                    key={status.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg hover:bg-surface-secondary/50 transition-colors"
                  >
                    <button className="cursor-grab hover:bg-surface-secondary p-1 rounded">
                      <GripVertical className="w-4 h-4 text-muted" />
                    </button>

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-800"
                      style={{ backgroundColor: status.color }}
                    />

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={status.label}
                          className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface-secondary"
                          onBlur={(e) => handleSaveStatus(status.id, { label: e.target.value })}
                          autoFocus
                        />
                        <input
                          type="color"
                          value={status.color}
                          onChange={(e) => handleSaveStatus(status.id, { color: e.target.value })}
                          className="w-8 h-8 rounded border border-border cursor-pointer"
                        />
                      </div>
                    ) : (
                      <span className="flex-1 text-sm font-medium text-text">{status.label}</span>
                    )}

                    {isDefault && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                        Default
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {!isDefault && (
                        <button
                          className="p-1.5 rounded hover:bg-surface-secondary text-xs text-muted hover:text-text"
                          onClick={() => setDefaultStatus(status.id)}
                          title="Set as default"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary"
                        onClick={() => setEditingStatus(status.id)}
                      >
                        <Edit className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary hover:text-red-500"
                        onClick={() => handleDeleteStatus(status.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted mt-3">
              Drag to reorder. The default status will be applied to new records.
            </p>
          </Card>

          {/* Status Transitions */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Status Transitions</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" />
                <div>
                  <span className="text-sm font-medium text-text">Restrict status changes</span>
                  <p className="text-xs text-muted mt-0.5">
                    Only allow transitions between specific statuses
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" defaultChecked />
                <div>
                  <span className="text-sm font-medium text-text">Log status changes</span>
                  <p className="text-xs text-muted mt-0.5">
                    Record all status changes in the activity timeline
                  </p>
                </div>
              </label>
            </div>
          </Card>

          {/* Automation */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Status Automations</h3>
            <div className="space-y-3">
              {statuses.map((status) => (
                <div key={status.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm text-text">When set to {status.label}</span>
                  </div>
                  <button className="text-xs text-primary hover:underline">
                    + Add action
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column - Preview & Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Preview */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Status Preview</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <span
                  key={status.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: status.color }}
                >
                  {status.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              This is how statuses will appear on {config.labelSingular.toLowerCase()} records.
            </p>
          </Card>

          {/* Status Distribution */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Current Distribution</h3>
            <div className="space-y-3">
              {statuses.map((status) => {
                const count = Math.floor(Math.random() * 100);
                const total = 200;
                const percentage = (count / total) * 100;

                return (
                  <div key={status.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </span>
                      <span className="text-text font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: status.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Settings */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Quick Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-xs text-muted">Default Status</span>
                <span className="text-xs text-text font-medium">
                  {statuses.find((s) => s.id === defaultStatus)?.label || 'None'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-xs text-muted">Total Statuses</span>
                <span className="text-xs text-text font-medium">{statuses.length}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-muted">Status Required</span>
                <span className="text-xs text-text font-medium">Yes</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ObjectLifecycleTab;
