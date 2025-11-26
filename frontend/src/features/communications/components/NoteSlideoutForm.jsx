/**
 * NoteSlideoutForm - Add internal note form for slideout
 */

import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormActions, FormSection } from '@/components/ui/FormField';
import { useCreateNote } from '../api';
import { StickyNote, AlertTriangle, Info, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const NOTE_TYPES = [
  { value: 'general', label: 'General', icon: StickyNote, color: 'var(--bb-color-text-muted)' },
  { value: 'important', label: 'Important', icon: AlertTriangle, color: 'var(--bb-color-status-caution)' },
  { value: 'info', label: 'Info', icon: Info, color: 'var(--bb-color-info)' },
  { value: 'highlight', label: 'Highlight', icon: Star, color: 'var(--bb-color-status-positive)' },
];

const NoteSlideoutForm = ({
  ownerId,
  petId,
  bookingId,
  onSuccess,
  onCancel,
}) => {
  // Mutation
  const createMutation = useCreateNote();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      type: 'general',
      content: '',
      isPinned: false,
    },
  });

  const selectedType = watch('type');

  const onSubmit = async (data) => {
    try {
      const payload = {
        ownerId,
        petId,
        bookingId,
        type: data.type,
        content: data.content,
        isPinned: data.isPinned,
        createdAt: new Date().toISOString(),
      };
      
      const result = await createMutation.mutateAsync(payload);
      onSuccess?.(result || payload);
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error(error?.message || 'Failed to add note');
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
      <FormSection title="Note Type">
        <div className="grid grid-cols-2 gap-2">
          {NOTE_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue('type', type.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors flex items-center gap-2",
                  isSelected && "ring-2 ring-[color:var(--bb-color-accent)]"
                )}
                style={{ 
                  borderColor: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
                  backgroundColor: isSelected ? 'var(--bb-color-accent-soft)' : 'transparent',
                }}
              >
                <Icon className="w-4 h-4" style={{ color: type.color }} />
                <span 
                  className="text-sm font-medium"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Note Content">
        <div className="space-y-2">
          <textarea
            {...register('content', { required: 'Note content is required' })}
            rows={6}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Type your note here..."
          />
          {errors.content && (
            <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.content.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('isPinned')}
            className="h-4 w-4 rounded"
            style={{ accentColor: 'var(--bb-color-accent)' }}
          />
          <span className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
            Pin this note (always show at top)
          </span>
        </label>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Note'}
        </Button>
      </FormActions>
    </form>
  );
};

export default NoteSlideoutForm;

