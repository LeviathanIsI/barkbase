import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Circle, Plus, GripVertical, Trash2, Edit, CheckCircle, Loader2, X
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OBJECT_TYPES } from '../objectConfig';
import {
  useObjectSettings,
  useUpdateObjectSettings,
  useObjectStatuses,
  useCreateObjectStatus,
  useUpdateObjectStatus,
  useDeleteObjectStatus,
  useReorderObjectStatuses
} from '@/features/settings/api/objectSettingsApi';

const ObjectLifecycleTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [draggedStatus, setDraggedStatus] = useState(null);

  // Fetch object settings for lifecycle configuration
  const { data: objectSettings } = useObjectSettings(objectType);
  const updateObjectSettings = useUpdateObjectSettings(objectType);

  // Fetch statuses from API
  const { data: statuses = [], isLoading } = useObjectStatuses(objectType);
  const createStatus = useCreateObjectStatus(objectType);
  const updateStatus = useUpdateObjectStatus(objectType);
  const deleteStatus = useDeleteObjectStatus(objectType);
  const reorderStatuses = useReorderObjectStatuses(objectType);

  // Lifecycle settings from object settings
  const lifecycleSettings = objectSettings?.settings?.lifecycle || {};
  const restrictStatusChanges = lifecycleSettings.restrictStatusChanges ?? false;
  const logStatusChanges = lifecycleSettings.logStatusChanges ?? true;

  const handleLifecycleSettingChange = async (key, value) => {
    try {
      const currentSettings = objectSettings?.settings || {};
      await updateObjectSettings.mutateAsync({
        settings: {
          ...currentSettings,
          lifecycle: {
            ...currentSettings.lifecycle,
            [key]: value,
          },
        },
      });
      toast.success('Setting updated');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      name: '',
      color: '#6b7280',
      isDefault: false,
    }
  });

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const defaultStatus = statuses.find(s => s.isDefault);

  const openModal = (status = null) => {
    if (status) {
      setEditingStatus(status);
      reset({
        name: status.name,
        color: status.color,
        isDefault: status.isDefault,
      });
    } else {
      setEditingStatus(null);
      reset({
        name: '',
        color: '#6b7280',
        isDefault: false,
      });
    }
    setShowModal(true);
  };

  const handleSaveStatus = async (data) => {
    try {
      if (editingStatus) {
        await updateStatus.mutateAsync({ id: editingStatus.id, ...data });
        toast.success('Status updated');
      } else {
        await createStatus.mutateAsync(data);
        toast.success('Status created');
      }
      setShowModal(false);
      setEditingStatus(null);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save status');
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus.mutateAsync(statusId);
      toast.success('Status deleted');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete status');
    }
  };

  const handleSetDefault = async (statusId) => {
    try {
      await updateStatus.mutateAsync({ id: statusId, isDefault: true });
      toast.success('Default status updated');
    } catch (error) {
      toast.error('Failed to update default status');
    }
  };

  const handleDragStart = (e, status) => {
    setDraggedStatus(status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!draggedStatus || draggedStatus.id === targetStatus.id) return;

    const newStatuses = [...statuses];
    const draggedIdx = newStatuses.findIndex((s) => s.id === draggedStatus.id);
    const targetIdx = newStatuses.findIndex((s) => s.id === targetStatus.id);

    newStatuses.splice(draggedIdx, 1);
    newStatuses.splice(targetIdx, 0, draggedStatus);

    setDraggedStatus(null);

    try {
      await reorderStatuses.mutateAsync(newStatuses.map(s => s.id));
      toast.success('Statuses reordered');
    } catch (error) {
      toast.error('Failed to reorder statuses');
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
              <Button variant="outline" size="sm" onClick={() => openModal()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Status
              </Button>
            </div>

            {statuses.length === 0 ? (
              <div className="text-center py-8">
                <Circle className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted mb-3">No statuses defined</p>
                <Button variant="outline" size="sm" onClick={() => openModal()}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add First Status
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, status)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg hover:bg-surface-secondary/50 transition-colors ${
                      draggedStatus?.id === status.id ? 'opacity-50' : ''
                    }`}
                  >
                    <button className="cursor-grab hover:bg-surface-secondary p-1 rounded">
                      <GripVertical className="w-4 h-4 text-muted" />
                    </button>

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-800"
                      style={{ backgroundColor: status.color }}
                    />

                    <span className="flex-1 text-sm font-medium text-text">{status.name}</span>

                    {status.isDefault && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                        Default
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {!status.isDefault && (
                        <button
                          className="p-1.5 rounded hover:bg-surface-secondary text-xs text-muted hover:text-text"
                          onClick={() => handleSetDefault(status.id)}
                          title="Set as default"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary"
                        onClick={() => openModal(status)}
                      >
                        <Edit className="w-3.5 h-3.5 text-muted" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-surface-secondary hover:text-red-500"
                        onClick={() => setDeleteConfirm(status)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted mt-3">
              Drag to reorder. The default status will be applied to new records.
            </p>
          </Card>

          {/* Status Transitions */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Status Transitions</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-border"
                  checked={restrictStatusChanges}
                  onChange={(e) => handleLifecycleSettingChange('restrictStatusChanges', e.target.checked)}
                  disabled={updateObjectSettings.isPending}
                />
                <div>
                  <span className="text-sm font-medium text-text">Restrict status changes</span>
                  <p className="text-xs text-muted mt-0.5">
                    Only allow transitions between specific statuses
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-border"
                  checked={logStatusChanges}
                  onChange={(e) => handleLifecycleSettingChange('logStatusChanges', e.target.checked)}
                  disabled={updateObjectSettings.isPending}
                />
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
            <div className="text-center py-4 bg-surface-secondary/50 rounded-lg">
              <p className="text-sm text-muted mb-1">Automations coming soon</p>
              <p className="text-xs text-muted">
                Configure actions that trigger when status changes.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column - Preview & Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Preview */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Status Preview</h3>
            {statuses.length === 0 ? (
              <p className="text-xs text-muted">No statuses to preview</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <span
                      key={status.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted mt-3">
                  This is how statuses will appear on {config.labelSingular.toLowerCase()} records.
                </p>
              </>
            )}
          </Card>

          {/* Status Distribution */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Current Distribution</h3>
            {statuses.length === 0 ? (
              <p className="text-xs text-muted">No statuses to display</p>
            ) : (
              <div className="space-y-3">
                {statuses.map((status) => (
                  <div key={status.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </span>
                      <span className="text-text font-medium">-</span>
                    </div>
                    <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: '0%', backgroundColor: status.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Settings */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Quick Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-xs text-muted">Default Status</span>
                <span className="text-xs text-text font-medium">
                  {defaultStatus?.name || 'None'}
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

      {/* Create/Edit Status Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">
                {editingStatus ? 'Edit Status' : 'Add Status'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingStatus(null); }} className="p-1 rounded hover:bg-surface-secondary">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSaveStatus)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Status Name</label>
                <Input {...register('name', { required: true })} placeholder="e.g., Active, Inactive" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    {...register('color')}
                    className="w-10 h-10 rounded border border-border cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted">{watch('color')}</span>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('isDefault')} className="rounded border-border" />
                <span className="text-text">Set as default status</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingStatus(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStatus.isPending || updateStatus.isPending}>
                  {(createStatus.isPending || updateStatus.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingStatus ? 'Save Changes' : 'Add Status'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-text mb-2">Delete Status</h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteStatus(deleteConfirm.id)}
                disabled={deleteStatus.isPending}
              >
                {deleteStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ObjectLifecycleTab;
