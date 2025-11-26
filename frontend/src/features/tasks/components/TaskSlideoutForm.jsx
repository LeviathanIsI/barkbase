/**
 * TaskSlideoutForm - Task creation/edit form for slideout
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { useCreateTaskMutation, useUpdateTaskMutation, useTaskQuery } from '../api';
import toast from 'react-hot-toast';

const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_CATEGORIES = ['cleaning', 'feeding', 'medication', 'exercise', 'grooming', 'general'];

const TaskSlideoutForm = ({
  mode = 'create',
  taskId,
  petId,
  bookingId,
  onSuccess,
  onCancel,
}) => {
  const isEdit = mode === 'edit';
  
  // Fetch existing task for edit mode
  const { data: existingTask } = useTaskQuery(taskId, { enabled: isEdit && !!taskId });
  
  // Mutations
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation(taskId);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      dueTime: '',
      petId: petId || '',
      bookingId: bookingId || '',
    },
  });

  // Reset form when task data loads
  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title || '',
        description: existingTask.description || '',
        category: existingTask.category || 'general',
        priority: existingTask.priority || 'medium',
        dueDate: existingTask.dueDate ? format(new Date(existingTask.dueDate), 'yyyy-MM-dd') : '',
        dueTime: existingTask.dueTime || '',
        petId: existingTask.petId || petId || '',
        bookingId: existingTask.bookingId || bookingId || '',
      });
    }
  }, [existingTask, reset, petId, bookingId]);

  const onSubmit = async (data) => {
    try {
      let result;
      const payload = {
        ...data,
        status: 'pending',
      };
      
      if (isEdit) {
        result = await updateMutation.mutateAsync(payload);
      } else {
        result = await createMutation.mutateAsync(payload);
      }
      
      onSuccess?.(result || payload);
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error(error?.message || 'Failed to save task');
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const inputClass = cn(
    'w-full rounded-md border px-3 py-2 text-sm',
    'focus:outline-none focus:ring-1',
    'transition-colors'
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Task Details">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Title <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="text"
            {...register('title', { required: 'Title is required' })}
            className={inputClass}
            style={{ ...inputStyles, borderColor: errors.title ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)' }}
            placeholder="Feed Charlie, clean kennel 5..."
          />
          {errors.title && (
            <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Additional details about this task..."
          />
        </div>

        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Category
            </label>
            <select {...register('category')} className={inputClass} style={inputStyles}>
              {TASK_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Priority
            </label>
            <select {...register('priority')} className={inputClass} style={inputStyles}>
              {TASK_PRIORITIES.map(pri => (
                <option key={pri} value={pri}>{pri.charAt(0).toUpperCase() + pri.slice(1)}</option>
              ))}
            </select>
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule">
        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Due Date
            </label>
            <input
              type="date"
              {...register('dueDate')}
              className={inputClass}
              style={inputStyles}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Due Time
            </label>
            <input
              type="time"
              {...register('dueTime')}
              className={inputClass}
              style={inputStyles}
            />
          </div>
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || (!isDirty && isEdit)}>
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
        </Button>
      </FormActions>
    </form>
  );
};

export default TaskSlideoutForm;

