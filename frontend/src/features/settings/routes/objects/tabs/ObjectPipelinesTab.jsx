import { useState } from 'react';
import {
  GitBranch, Plus, GripVertical, Settings, Trash2, ChevronRight,
  ChevronDown, CheckCircle, XCircle, Clock, AlertCircle, Edit, Save
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectPipelinesTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [stages, setStages] = useState(config?.pipelineStages || []);
  const [editingStage, setEditingStage] = useState(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [expandedStages, setExpandedStages] = useState([]);
  const [draggedStage, setDraggedStage] = useState(null);

  if (!config || !config.hasPipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">This object does not use pipelines</p>
      </div>
    );
  }

  const toggleStageExpand = (stageId) => {
    setExpandedStages((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  const getStageTypeIcon = (type) => {
    switch (type) {
      case 'won': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'lost': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
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

  const handleDragOver = (e, targetStage) => {
    e.preventDefault();
    if (!draggedStage || draggedStage.id === targetStage.id) return;
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (!draggedStage || draggedStage.id === targetStage.id) return;

    const newStages = [...stages];
    const draggedIdx = newStages.findIndex((s) => s.id === draggedStage.id);
    const targetIdx = newStages.findIndex((s) => s.id === targetStage.id);

    newStages.splice(draggedIdx, 1);
    newStages.splice(targetIdx, 0, draggedStage);

    setStages(newStages);
    setDraggedStage(null);
  };

  const handleAddStage = () => {
    const newStage = {
      id: `stage_${Date.now()}`,
      label: 'New Stage',
      color: '#6b7280',
      type: 'open',
    };
    setStages([...stages, newStage]);
    setEditingStage(newStage.id);
    setShowAddStage(false);
  };

  const handleSaveStage = (stageId, updates) => {
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, ...updates } : s))
    );
    setEditingStage(null);
  };

  const handleDeleteStage = (stageId) => {
    if (!confirm('Are you sure you want to delete this stage?')) return;
    setStages((prev) => prev.filter((s) => s.id !== stageId));
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
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-text">Default Pipeline</span>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Settings
              </Button>
            </div>
          </Card>

          {/* Stage List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Pipeline Stages</h3>
              <Button variant="outline" size="sm" onClick={handleAddStage}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Stage
              </Button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, idx) => {
                const isExpanded = expandedStages.includes(stage.id);
                const isEditing = editingStage === stage.id;

                return (
                  <div
                    key={stage.id}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, stage)}
                    onDragOver={(e) => handleDragOver(e, stage)}
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

                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={stage.label}
                          className="flex-1 px-2 py-1 text-sm border border-border rounded bg-surface-secondary"
                          onBlur={(e) => handleSaveStage(stage.id, { label: e.target.value })}
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium text-text">{stage.label}</span>
                      )}

                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getStageTypeBadge(stage.type)}`}>
                        {stage.type.charAt(0).toUpperCase() + stage.type.slice(1)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-surface-secondary"
                          onClick={() => setEditingStage(stage.id)}
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
                                onChange={(e) => handleSaveStage(stage.id, { color: e.target.value })}
                                className="w-8 h-8 rounded border border-border cursor-pointer"
                              />
                              <span className="text-xs font-mono text-muted">{stage.color}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted">Stage Type</label>
                            <Select
                              value={stage.type}
                              onChange={(e) => handleSaveStage(stage.id, { type: e.target.value })}
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

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" className="rounded border-border" />
                              <span className="text-text">Required properties</span>
                            </label>
                          </div>
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
          </Card>

          {/* Pipeline Rules */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Pipeline Rules</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" />
                <div>
                  <span className="text-sm font-medium text-text">Restrict skipping stages</span>
                  <p className="text-xs text-muted mt-0.5">
                    Records must move through stages in order
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" />
                <div>
                  <span className="text-sm font-medium text-text">Restrict backward movement</span>
                  <p className="text-xs text-muted mt-0.5">
                    Records cannot move to previous stages once advanced
                  </p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column - Preview & Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Visual Pipeline Preview */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Pipeline Preview</h3>
            <div className="space-y-1">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-2">
                  <div
                    className="w-full h-8 rounded flex items-center px-3 text-xs font-medium text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {stage.label}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Stage Statistics */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-4">Stage Distribution</h3>
            <div className="space-y-3">
              {stages.map((stage) => {
                const count = Math.floor(Math.random() * 50);
                const total = stages.reduce((_, s) => Math.floor(Math.random() * 50), 0) || 1;
                const percentage = Math.min(100, Math.max(5, (count / total) * 100));

                return (
                  <div key={stage.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.label}
                      </span>
                      <span className="text-text font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
    </div>
  );
};

export default ObjectPipelinesTab;
