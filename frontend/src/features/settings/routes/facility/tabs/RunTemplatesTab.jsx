import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import toast from 'react-hot-toast';
import {
  useRunTemplatesQuery,
  useCreateRunTemplateMutation,
  useUpdateRunTemplateMutation,
  useDeleteRunTemplateMutation,
} from '@/features/daycare/api-templates';

const RunTemplatesTab = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const { data: templates = [], isLoading, refetch } = useRunTemplatesQuery();
  const createMutation = useCreateRunTemplateMutation();
  const updateMutation = useUpdateRunTemplateMutation();
  const deleteMutation = useDeleteRunTemplateMutation();

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsDrawerOpen(true);
  };

  const handleDelete = (template) => {
    setTemplateToDelete(template);
    setDeleteDrawerOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(templateToDelete.recordId);
      toast.success('Run template deleted successfully');
      setDeleteDrawerOpen(false);
      setTemplateToDelete(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error(error?.message || 'Failed to delete template');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-text-secondary">Loading run templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Run Templates</h2>
          <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
            Configure run templates that will be used for daily pet assignments
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="h-4 w-4" />}>
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-surface-secondary rounded-lg border-2 border-dashed border-gray-300 dark:border-surface-border">
          <Clock className="h-12 w-12 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">No run templates yet</h3>
          <p className="text-gray-600 dark:text-text-secondary mb-4">Get started by creating your first run template</p>
          <Button onClick={handleCreate} size="sm">
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.recordId}
              className="border border-gray-200 dark:border-surface-border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{template.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1.5 text-gray-400 dark:text-text-tertiary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-surface-secondary rounded transition-colors"
                    title="Edit template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 text-gray-400 dark:text-text-tertiary hover:text-red-600 hover:bg-red-50 dark:bg-surface-primary rounded transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-text-secondary">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                  <span className="font-medium">{template.timePeriodMinutes || 30} min</span>
                  <span className="text-gray-500 dark:text-text-secondary">per slot</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-text-secondary">
                  <span className="font-medium">Capacity:</span>
                  <span>{template.maxCapacity || 10} pets</span>
                </div>
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      template.capacityType === 'concurrent'
                        ? 'bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200'
                        : 'bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {template.capacityType === 'concurrent' ? 'Concurrent' : 'Total'} Capacity
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RunTemplateDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={async (data) => {
          try {
            if (editingTemplate) {
              await updateMutation.mutateAsync({ id: editingTemplate.recordId, ...data });
              toast.success('Template updated successfully');
            } else {
              await createMutation.mutateAsync(data);
              toast.success('Template created successfully');
            }
            setIsDrawerOpen(false);
            setEditingTemplate(null);
            refetch();
          } catch (error) {
            console.error('Failed to save template:', error);
            toast.error(error?.message || 'Failed to save template');
          }
        }}
      />

      {/* Delete Confirmation Slideout */}
      <SlideOutDrawer
        isOpen={deleteDrawerOpen}
        onClose={() => {
          setDeleteDrawerOpen(false);
          setTemplateToDelete(null);
        }}
        title="Delete Run Template"
        subtitle="This action cannot be undone"
        size="sm"
        footerContent={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDrawerOpen(false);
                setTemplateToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Template'}
            </Button>
          </div>
        }
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className="font-medium text-red-900 dark:text-red-100">Warning</span>
          </div>
          <p className="text-gray-700 dark:text-text-primary">
            Are you sure you want to delete "{templateToDelete?.name}"? This won't affect existing runs, but new runs won't be able to use this template.
          </p>
        </div>
      </SlideOutDrawer>
    </div>
  );
};

const RunTemplateDrawer = ({ isOpen, onClose, template, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    timePeriodMinutes: 30,
    capacityType: 'total',
    maxCapacity: 10,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setFormData({
          name: template.name || '',
          timePeriodMinutes: template.timePeriodMinutes || 30,
          capacityType: template.capacityType || 'total',
          maxCapacity: template.maxCapacity || 10,
        });
      } else {
        setFormData({
          name: '',
          timePeriodMinutes: 30,
          capacityType: 'total',
          maxCapacity: 10,
        });
        setStep(1);
      }
    }
  }, [isOpen, template]);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.name.trim().length >= 3;
    if (step === 2) return formData.maxCapacity > 0;
    return true;
  };

  const renderStepContent = () => {
    // Edit mode: Show all fields at once
    if (template) {
      return (
        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
              Template Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-surface-secondary dark:text-text-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
              Time Slot Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setFormData({ ...formData, timePeriodMinutes: minutes })}
                  className={`py-3 px-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                    formData.timePeriodMinutes === minutes
                      ? 'border-blue-600 bg-blue-50 dark:bg-surface-primary text-blue-900 dark:text-blue-100'
                      : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-700 dark:text-text-primary hover:border-blue-400'
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
              Maximum Capacity
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.maxCapacity}
              onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-surface-secondary dark:text-text-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
              Capacity Type
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-surface-border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary">
                <input
                  type="radio"
                  name="capacityType"
                  value="total"
                  checked={formData.capacityType === 'total'}
                  onChange={(e) => setFormData({ ...formData, capacityType: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-text-primary">Total Daily Capacity</div>
                  <div className="text-xs text-gray-600 dark:text-text-secondary">Max pets for entire day</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-surface-border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary">
                <input
                  type="radio"
                  name="capacityType"
                  value="concurrent"
                  checked={formData.capacityType === 'concurrent'}
                  onChange={(e) => setFormData({ ...formData, capacityType: e.target.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-text-primary">Concurrent Time Slot Capacity</div>
                  <div className="text-xs text-gray-600 dark:text-text-secondary">Max pets per time slot</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      );
    }

    // Create mode: Show wizard steps
    switch (step) {
      case 1:
        return (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">Name your run</h3>
              <p className="text-gray-600 dark:text-text-secondary">Give it a name that describes when it happens</p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-text-primary mb-2">
                Run Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-surface-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-surface-secondary dark:text-text-primary"
                placeholder="e.g., Morning Play, Afternoon Exercise"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-text-primary mb-2">
                Time Slot Duration
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setFormData({ ...formData, timePeriodMinutes: minutes })}
                    className={`py-4 px-3 rounded-lg border-2 font-semibold transition-all ${
                      formData.timePeriodMinutes === minutes
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                        : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-700 dark:text-text-primary hover:border-blue-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">{minutes}</div>
                    <div className="text-xs">minutes</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">Set your capacity</h3>
              <p className="text-gray-600 dark:text-text-secondary">How many pets can you handle?</p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, maxCapacity: Math.max(1, formData.maxCapacity - 1) })}
                className="w-12 h-12 rounded-full bg-gray-200 dark:bg-surface-border hover:bg-gray-300 text-gray-700 dark:text-text-primary text-2xl font-semibold transition-all"
              >
                −
              </button>
              <div className="text-center">
                <div className="text-5xl font-semibold text-blue-600 dark:text-blue-400">{formData.maxCapacity}</div>
                <div className="text-sm text-gray-500 dark:text-text-secondary mt-2">pets maximum</div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, maxCapacity: Math.min(100, formData.maxCapacity + 1) })}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-semibold transition-all"
              >
                +
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">How should we count capacity?</h3>
              <p className="text-gray-600 dark:text-text-secondary">This affects how many pets can be scheduled</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, capacityType: 'total' })}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.capacityType === 'total'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary hover:border-blue-400'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-text-primary mb-1">Total Daily Capacity</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">
                  Max {formData.maxCapacity} pets for the entire day
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, capacityType: 'concurrent' })}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.capacityType === 'concurrent'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary hover:border-green-400'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-text-primary mb-1">Concurrent Time Slot Capacity</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">
                  Max {formData.maxCapacity} pets at any single time slot
                </div>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SlideOutDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Edit Run Template' : 'Create Run Template'}
      subtitle={template ? `Editing ${template.name}` : `Step ${step} of 3`}
      size="md"
      footerContent={
        <div className="flex justify-between items-center">
          <div>
            {step > 1 && !template && (
              <Button variant="outline" onClick={handleBack} disabled={isSaving}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            {step < 3 && !template ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress indicator for create mode */}
      {!template && (
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm transition-all ${
                  step >= s
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-400 dark:text-text-tertiary'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-surface-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {renderStepContent()}
    </SlideOutDrawer>
  );
};

export default RunTemplatesTab;
