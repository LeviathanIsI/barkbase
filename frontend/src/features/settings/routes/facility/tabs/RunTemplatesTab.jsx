import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  useRunTemplatesQuery,
  useCreateRunTemplateMutation,
  useUpdateRunTemplateMutation,
  useDeleteRunTemplateMutation,
} from '@/features/daycare/api-templates';

const RunTemplatesTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const { data: templates = [], isLoading, refetch } = useRunTemplatesQuery();
  const createMutation = useCreateRunTemplateMutation();
  const updateMutation = useUpdateRunTemplateMutation();
  const deleteMutation = useDeleteRunTemplateMutation();

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(templateToDelete.recordId);
      toast.success('Run template deleted successfully');
      setDeleteDialogOpen(false);
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
                    className="p-1.5 text-gray-400 dark:text-text-tertiary hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-surface-primary rounded transition-colors"
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
                  <span className="font-medium">{template.timePeriodMinutes} min</span>
                  <span className="text-gray-500 dark:text-text-secondary">per slot</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-text-secondary">
                  <span className="font-medium">Capacity:</span>
                  <span>{template.maxCapacity} pets</span>
                </div>
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      template.capacityType === 'concurrent'
                        ? 'bg-green-100 dark:bg-surface-secondary text-green-800'
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

      <RunTemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
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
            setIsModalOpen(false);
            setEditingTemplate(null);
            refetch();
          } catch (error) {
            console.error('Failed to save template:', error);
            toast.error(error?.message || 'Failed to save template');
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Run Template"
        message={`Are you sure you want to delete "${templateToDelete?.name}"? This won't affect existing runs, but new runs won't be able to use this template.`}
        confirmText="Delete Template"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

const RunTemplateModal = ({ isOpen, onClose, template, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    timePeriodMinutes: template?.timePeriodMinutes || 30,
    capacityType: template?.capacityType || 'total',
    maxCapacity: template?.maxCapacity || 10,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset to step 1 when modal opens (for create mode)
  useEffect(() => {
    if (isOpen && !template) {
      setStep(1);
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

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={template ? 'Edit Run Template' : 'Create Run Template'}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Progress Steps (only for create mode) */}
        {!template && (
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all ${
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
        )}

        {/* Edit Mode: Show all fields at once */}
        {template && (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Template Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                Capacity Type
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-surface-border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
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
                <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-surface-border rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
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
        )}

        {/* Step 1: Name & Time Period */}
        {!template && step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">Let's name your run! 🏃</h3>
              <p className="text-gray-600 dark:text-text-secondary">Give it a name that describes when it happens</p>
            </div>

            <div>
              <label htmlFor="name" className="block text-lg font-medium text-gray-900 dark:text-text-primary mb-3">
                Run Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-surface-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="e.g., Morning Play, Afternoon Exercise, Evening Fun"
                autoFocus
              />
              <p className="text-sm text-gray-500 dark:text-text-secondary mt-2">Choose a descriptive name your team will understand</p>
            </div>

            <div>
              <label htmlFor="timePeriod" className="block text-lg font-medium text-gray-900 dark:text-text-primary mb-3">
                Time Slot Duration ⏱️
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setFormData({ ...formData, timePeriodMinutes: minutes })}
                    className={`py-4 px-3 rounded-lg border-2 font-semibold transition-all ${
                      formData.timePeriodMinutes === minutes
                        ? 'border-blue-600 bg-blue-50 dark:bg-surface-primary text-blue-900 dark:text-blue-100 shadow-md scale-105'
                        : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-700 dark:text-text-primary hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="text-2xl mb-1">{minutes}</div>
                    <div className="text-xs">minutes</div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-text-secondary mt-2">How long will each pet stay in this run?</p>
            </div>
          </div>
        )}

        {/* Step 2: Capacity */}
        {!template && step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">Set your capacity 📊</h3>
              <p className="text-gray-600 dark:text-text-secondary">How many pets can you handle?</p>
            </div>

            <div>
              <label htmlFor="maxCapacity" className="block text-lg font-medium text-gray-900 dark:text-text-primary mb-3">
                Maximum Number of Pets
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, maxCapacity: Math.max(1, formData.maxCapacity - 1) })}
                  className="w-12 h-12 rounded-full bg-gray-200 dark:bg-surface-border hover:bg-gray-300 text-gray-700 dark:text-text-primary text-2xl font-bold transition-all"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-6xl font-bold text-blue-600 dark:text-blue-400">{formData.maxCapacity}</div>
                  <div className="text-sm text-gray-500 dark:text-text-secondary mt-2">pets maximum</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, maxCapacity: Math.min(100, formData.maxCapacity + 1) })}
                  className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-surface-primary border-2 border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Pro Tip</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Consider your staff availability and physical space when setting capacity. You can always adjust this later!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Capacity Type */}
        {!template && step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">How should we count capacity? 🤔</h3>
              <p className="text-gray-600 dark:text-text-secondary">This affects how many pets can be scheduled</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, capacityType: 'total' })}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  formData.capacityType === 'total'
                    ? 'border-blue-600 bg-blue-50 dark:bg-surface-primary shadow-lg scale-[1.02]'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                    formData.capacityType === 'total' ? 'border-blue-600' : 'border-gray-400 dark:border-surface-border'
                  }`}>
                    {formData.capacityType === 'total' && (
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-text-primary mb-2">📅 Total Daily Capacity</div>
                    <div className="text-gray-700 dark:text-text-primary mb-3">
                      Max <span className="font-bold text-blue-600 dark:text-blue-400">{formData.maxCapacity} pets</span> for the entire day,
                      regardless of what time they're scheduled
                    </div>
                    <div className="bg-white dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 text-sm">
                      <div className="font-semibold text-gray-900 dark:text-text-primary mb-1">Example:</div>
                      <div className="text-gray-600 dark:text-text-secondary">
                        If set to 10 pets, you can schedule a maximum of 10 different pets throughout the day,
                        even if they're in different time slots
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, capacityType: 'concurrent' })}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  formData.capacityType === 'concurrent'
                    ? 'border-green-600 bg-green-50 dark:bg-surface-primary shadow-lg scale-[1.02]'
                    : 'border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary hover:border-green-400 hover:bg-green-50 dark:bg-green-950/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                    formData.capacityType === 'concurrent' ? 'border-green-600' : 'border-gray-400 dark:border-surface-border'
                  }`}>
                    {formData.capacityType === 'concurrent' && (
                      <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-bold text-gray-900 dark:text-text-primary mb-2">⏰ Concurrent Time Slot Capacity</div>
                    <div className="text-gray-700 dark:text-text-primary mb-3">
                      Max <span className="font-bold text-green-600">{formData.maxCapacity} pets</span> at any single time slot.
                      More pets total if scheduled at different times!
                    </div>
                    <div className="bg-white dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-sm">
                      <div className="font-semibold text-gray-900 dark:text-text-primary mb-1">Example:</div>
                      <div className="text-gray-600 dark:text-text-secondary">
                        If set to 10 pets, you can have 10 pets at 9:00 AM, another 10 at 10:00 AM, etc.
                        <span className="font-semibold"> Perfect for high-volume daycare!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div>
            {step > 1 && !template && (
              <Button variant="ghost" onClick={handleBack} disabled={isSaving}>
                ← Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            {step < 3 && !template ? (
              <Button 
                variant="primary" 
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next Step →
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleSubmit}
                disabled={isSaving}
                loading={isSaving}
              >
                {template ? 'Update Template' : '✨ Create Template'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RunTemplatesTab;

