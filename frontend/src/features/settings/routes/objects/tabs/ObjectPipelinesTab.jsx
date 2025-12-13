import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  GitBranch, Plus, GripVertical, Settings, Trash2, ChevronRight,
  ChevronDown, CheckCircle, XCircle, Clock, Edit, Loader2, X, Star
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';
import {
  useObjectPipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useCreatePipelineStage,
  useUpdatePipelineStage,
  useDeletePipelineStage,
  useReorderPipelineStages
} from '@/features/settings/api/objectSettingsApi';

const ObjectPipelinesTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [expandedStages, setExpandedStages] = useState([]);
  const [draggedStage, setDraggedStage] = useState(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch pipelines from API
  const { data: pipelines = [], isLoading } = useObjectPipelines(objectType);
  const createPipeline = useCreatePipeline(objectType);
  const updatePipeline = useUpdatePipeline(objectType);
  const deletePipeline = useDeletePipeline(objectType);

  // Set selected pipeline when data loads
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  // Stage mutations
  const createStage = useCreatePipelineStage(objectType, selectedPipelineId);
  const updateStage = useUpdatePipelineStage(objectType, selectedPipelineId);
  const deleteStage = useDeletePipelineStage(objectType, selectedPipelineId);
  const reorderStages = useReorderPipelineStages(objectType, selectedPipelineId);

  const { register: registerPipeline, handleSubmit: handlePipelineSubmit, reset: resetPipeline } = useForm();
  const { register: registerStage, handleSubmit: handleStageSubmit, reset: resetStage, watch: watchStage, setValue: setStageValue } = useForm();

  if (!config || !config.hasPipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">This object does not use pipelines</p>
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

  const toggleStageExpand = (stageId) => {
    setExpandedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  const getStageTypeBadge = (type) => {
    const styles = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return styles[type] || styles.open;
  };

  const handleDragStart = (e, stage) => {
    setDraggedStage(stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedStage || draggedStage.id === targetStage.id) return;

    const newStages = [...stages];
    const draggedIdx = newStages.findIndex((s) => s.id === draggedStage.id);
    const targetIdx = newStages.findIndex((s) => s.id === targetStage.id);

    newStages.splice(draggedIdx, 1);
    newStages.splice(targetIdx, 0, draggedStage);

    setDraggedStage(null);

    try {
      await reorderStages.mutateAsync(newStages.map(s => s.id));
      toast.success('Stages reordered');
    } catch (error) {
      toast.error('Failed to reorder stages');
    }
  };

  // Pipeline handlers
  const handleCreatePipeline = async (data) => {
    try {
      const result = await createPipeline.mutateAsync(data);
      toast.success('Pipeline created');
      setShowPipelineModal(false);
      resetPipeline();
      setSelectedPipelineId(result.id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create pipeline');
    }
  };

  const handleSetDefaultPipeline = async (pipelineId) => {
    try {
      await updatePipeline.mutateAsync({ id: pipelineId, isDefault: true });
      toast.success('Default pipeline updated');
    } catch (error) {
      toast.error('Failed to update default pipeline');
    }
  };

  const handleDeletePipeline = async (pipelineId) => {
    try {
      await deletePipeline.mutateAsync(pipelineId);
      toast.success('Pipeline deleted');
      setDeleteConfirm(null);
      if (selectedPipelineId === pipelineId) {
        setSelectedPipelineId(pipelines.find(p => p.id !== pipelineId)?.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete pipeline');
    }
  };

  // Stage handlers
  const openStageModal = (stage = null) => {
    if (stage) {
      setEditingStage(stage);
      resetStage({
        name: stage.name,
        stageType: stage.stageType,
        color: stage.color,
        probability: stage.probability,
      });
    } else {
      setEditingStage(null);
      resetStage({
        name: '',
        stageType: 'open',
        color: '#6b7280',
        probability: null,
      });
    }
    setShowStageModal(true);
  };

  const handleSaveStage = async (data) => {
    try {
      if (editingStage) {
        await updateStage.mutateAsync({ id: editingStage.id, ...data });
        toast.success('Stage updated');
      } else {
        await createStage.mutateAsync(data);
        toast.success('Stage created');
      }
      setShowStageModal(false);
      setEditingStage(null);
      resetStage();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save stage');
    }
  };

  const handleDeleteStage = async (stageId) => {
    try {
      await deleteStage.mutateAsync(stageId);
      toast.success('Stage deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete stage');
    }
  };

  const handleQuickUpdateStage = async (stageId, updates) => {
    try {
      await updateStage.mutateAsync({ id: stageId, ...updates });
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Configure the pipeline stages for {config.labelPlural.toLowerCase()}. Drag stages to reorder them.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Pipeline Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Pipeline Selector */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-primary" />
                <Select
                  value={selectedPipelineId || ''}
                  onChange={(e) => setSelectedPipelineId(e.target.value)}
                  options={pipelines.map(p => ({
                    value: p.id,
                    label: `${p.name}${p.isDefault ? ' (Default)' : ''}`,
                  }))}
                  className="w-48"
                />
                {selectedPipeline && !selectedPipeline.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefaultPipeline(selectedPipelineId)}
                  >
                    <Star className="w-3.5 h-3.5 mr-1" />
                    Set as Default
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetPipeline({ name: '', isDefault: false });
                    setShowPipelineModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Pipeline
                </Button>
                {pipelines.length > 1 && selectedPipeline && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm({ type: 'pipeline', id: selectedPipelineId })}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Stage List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Pipeline Stages</h3>
              <Button variant="outline" size="sm" onClick={() => openStageModal()}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Stage
              </Button>
            </div>

            {stages.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted mb-3">No stages defined</p>
                <Button variant="outline" size="sm" onClick={() => openStageModal()}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add First Stage
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {stages.map((stage) => {
                  const isExpanded = expandedStages.includes(stage.id);

                  return (
                    <div
                      key={stage.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, stage)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage)}
                      className={`border border-border rounded-lg transition-all ${
                        draggedStage?.id === stage.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Stage Header */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button className="cursor-grab hover:bg-surface-secondary p-1 rounded">
                          <GripVertical className="w-4 h-4 text-muted" />
                        </button>

                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />

                        <span className="flex-1 text-sm font-medium text-text">{stage.name}</span>

                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getStageTypeBadge(stage.stageType)}`}>
                          {stage.stageType?.charAt(0).toUpperCase() + stage.stageType?.slice(1)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 rounded hover:bg-surface-secondary"
                            onClick={() => openStageModal(stage)}
                          >
                            <Edit className="w-3.5 h-3.5 text-muted" />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-surface-secondary"
                            onClick={() => toggleStageExpand(stage.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Stage Options */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-border bg-surface-secondary/50">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted">Stage Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={stage.color}
                                  onChange={(e) => handleQuickUpdateStage(stage.id, { color: e.target.value })}
                                  className="w-8 h-8 rounded border border-border cursor-pointer"
                                />
                                <span className="text-xs font-mono text-muted">{stage.color}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted">Stage Type</label>
                              <Select
                                value={stage.stageType}
                                onChange={(e) => handleQuickUpdateStage(stage.id, { stageType: e.target.value })}
                                options={[
                                  { value: 'open', label: 'Open' },
                                  { value: 'closed', label: 'Closed' },
                                  { value: 'won', label: 'Won' },
                                  { value: 'lost', label: 'Lost' },
                                ]}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end items-center mt-3 pt-3 border-t border-border">
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Preview & Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Visual Pipeline Preview */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Pipeline Preview</h3>
            {stages.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No stages to preview</p>
            ) : (
              <div className="space-y-1">
                {stages.map((stage) => (
                  <div key={stage.id} className="flex items-center gap-2">
                    <div
                      className="w-full h-8 rounded flex items-center px-3 text-xs font-medium text-white"
                      style={{ backgroundColor: stage.color }}
                    >
                      {stage.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stage Statistics */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Stage Distribution</h3>
            {stages.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No stages to display</p>
            ) : (
              <div className="space-y-3">
                {stages.map((stage) => (
                  <div key={stage.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </span>
                      <span className="text-text font-medium">-</span>
                    </div>
                    <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: '0%', backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Automation Triggers */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Stage Automations</h3>
            <p className="text-xs text-muted mb-3">
              Configure actions that trigger when records enter or leave stages.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Automation
            </Button>
          </Card>
        </div>
      </div>

      {/* Create Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">Create Pipeline</h3>
              <button onClick={() => setShowPipelineModal(false)} className="p-1 rounded hover:bg-surface-secondary">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <form onSubmit={handlePipelineSubmit(handleCreatePipeline)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Pipeline Name</label>
                <Input {...registerPipeline('name', { required: true })} placeholder="e.g., Sales Pipeline" />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...registerPipeline('isDefault')} className="rounded border-border" />
                <span className="text-text">Set as default pipeline</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowPipelineModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPipeline.isPending}>
                  {createPipeline.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Pipeline
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Create/Edit Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text">
                {editingStage ? 'Edit Stage' : 'Add Stage'}
              </h3>
              <button onClick={() => { setShowStageModal(false); setEditingStage(null); }} className="p-1 rounded hover:bg-surface-secondary">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <form onSubmit={handleStageSubmit(handleSaveStage)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Stage Name</label>
                <Input {...registerStage('name', { required: true })} placeholder="e.g., In Progress" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Stage Type</label>
                  <Select
                    {...registerStage('stageType')}
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'closed', label: 'Closed' },
                      { value: 'won', label: 'Won' },
                      { value: 'lost', label: 'Lost' },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      {...registerStage('color')}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <span className="text-xs font-mono text-muted">{watchStage('color')}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowStageModal(false); setEditingStage(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStage.isPending || updateStage.isPending}>
                  {(createStage.isPending || updateStage.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingStage ? 'Save Changes' : 'Add Stage'}
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
            <h3 className="text-lg font-semibold text-text mb-2">
              Delete {deleteConfirm.type === 'pipeline' ? 'Pipeline' : 'Stage'}
            </h3>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeletePipeline(deleteConfirm.id)}
                disabled={deletePipeline.isPending}
              >
                {deletePipeline.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ObjectPipelinesTab;
