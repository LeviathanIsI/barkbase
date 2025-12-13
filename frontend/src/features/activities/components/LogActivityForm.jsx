/**
 * LogActivityForm - Form for logging activities (notes, calls, emails, SMS)
 * Used in the slideout panel
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, Phone, Mail, MessageSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import { FormActions, FormSection } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import { useCreateActivity } from '../api';
import toast from 'react-hot-toast';

// Activity type configurations
const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note', icon: FileText, emoji: '📝' },
  { value: 'call', label: 'Call', icon: Phone, emoji: '📞' },
  { value: 'email', label: 'Email', icon: Mail, emoji: '✉️' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, emoji: '💬' },
];

const CALL_DIRECTIONS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

const CALL_OUTCOMES = [
  { value: 'answered', label: 'Answered' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
];

// Shared input styles
const inputStyles = {
  backgroundColor: 'var(--bb-color-bg-surface)',
  borderColor: 'var(--bb-color-border-subtle)',
  color: 'var(--bb-color-text-primary)',
};

const inputClass = cn(
  'w-full rounded-md border px-3 py-2 text-sm',
  'focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]',
  'transition-colors'
);

/**
 * LogActivityForm component
 * @param {string} entityType - 'owner', 'pet', 'booking', 'invoice'
 * @param {string} entityId - UUID of the entity
 * @param {string} defaultEmail - Pre-filled email for email activities
 * @param {string} defaultPhone - Pre-filled phone for call/SMS activities
 * @param {function} onSuccess - Called after successful submission
 * @param {function} onCancel - Called when cancel is clicked
 */
export default function LogActivityForm({
  entityType,
  entityId,
  defaultEmail,
  defaultPhone,
  onSuccess,
  onCancel,
}) {
  const [activityType, setActivityType] = useState('note');
  const createMutation = useCreateActivity();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      subject: '',
      content: '',
      callDirection: 'outbound',
      callOutcome: 'answered',
      callDurationMinutes: '',
      callDurationSeconds: '',
      recipient: '',
    },
  });

  // Pre-fill recipient based on activity type
  useEffect(() => {
    if (activityType === 'email' && defaultEmail) {
      setValue('recipient', defaultEmail);
    } else if ((activityType === 'call' || activityType === 'sms') && defaultPhone) {
      setValue('recipient', defaultPhone);
    } else {
      setValue('recipient', '');
    }
  }, [activityType, defaultEmail, defaultPhone, setValue]);

  const onSubmit = async (data) => {
    // Convert duration to seconds
    let callDurationSeconds = null;
    if (activityType === 'call') {
      const minutes = parseInt(data.callDurationMinutes) || 0;
      const seconds = parseInt(data.callDurationSeconds) || 0;
      callDurationSeconds = minutes * 60 + seconds;
    }

    const payload = {
      entityType,
      entityId,
      activityType,
      subject: data.subject || null,
      content: data.content,
      recipient: ['email', 'sms', 'call'].includes(activityType) ? data.recipient : null,
      callDirection: activityType === 'call' ? data.callDirection : null,
      callOutcome: activityType === 'call' ? data.callOutcome : null,
      callDurationSeconds: activityType === 'call' ? callDurationSeconds : null,
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success('Activity logged successfully');
      onSuccess?.(result);
    } catch (error) {
      console.error('Failed to log activity:', error);
      toast.error(error?.message || 'Failed to log activity');
    }
  };

  const isLoading = createMutation.isPending;
  const content = watch('content');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Activity Type Selector */}
      <div>
        <label
          className="block text-sm font-medium mb-3"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Activity Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITY_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = activityType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setActivityType(type.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border text-sm transition-all',
                  isActive
                    ? 'border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)] ring-1 ring-[var(--bb-color-accent)]'
                    : 'border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-elevated)] hover:border-[var(--bb-color-border-default)]'
                )}
              >
                <Icon
                  className="w-5 h-5"
                  style={{
                    color: isActive
                      ? 'var(--bb-color-accent)'
                      : 'var(--bb-color-text-muted)',
                  }}
                />
                <span
                  style={{
                    color: isActive
                      ? 'var(--bb-color-accent)'
                      : 'var(--bb-color-text-primary)',
                  }}
                >
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Note Form */}
      {activityType === 'note' && (
        <FormSection title="Note Details">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Subject (optional)
              </label>
              <input
                type="text"
                {...register('subject')}
                className={inputClass}
                style={inputStyles}
                placeholder="Brief summary of the note"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Note <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <textarea
                {...register('content', { required: 'Note content is required' })}
                rows={6}
                className={cn(inputClass, 'resize-y')}
                style={{
                  ...inputStyles,
                  borderColor: errors.content
                    ? 'var(--bb-color-status-negative)'
                    : inputStyles.borderColor,
                }}
                placeholder="Enter your note here..."
              />
              {errors.content && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.content.message}
                </p>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* Call Form */}
      {activityType === 'call' && (
        <FormSection title="Call Details">
          <div className="space-y-4">
            {/* Direction and Outcome */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  Direction
                </label>
                <div className="space-y-1">
                  {CALL_DIRECTIONS.map((dir) => (
                    <label
                      key={dir.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        {...register('callDirection')}
                        value={dir.value}
                        className="accent-[var(--bb-color-accent)]"
                      />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        {dir.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  Outcome
                </label>
                <div className="space-y-1">
                  {CALL_OUTCOMES.map((outcome) => (
                    <label
                      key={outcome.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        {...register('callOutcome')}
                        value={outcome.value}
                        className="accent-[var(--bb-color-accent)]"
                      />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        {outcome.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Call Notes */}
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Call Notes <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <textarea
                {...register('content', { required: 'Call notes are required' })}
                rows={4}
                className={cn(inputClass, 'resize-y')}
                style={{
                  ...inputStyles,
                  borderColor: errors.content
                    ? 'var(--bb-color-status-negative)'
                    : inputStyles.borderColor,
                }}
                placeholder="Summarize the call..."
              />
              {errors.content && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.content.message}
                </p>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* Email Form */}
      {activityType === 'email' && (
        <FormSection title="Email Details">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                To
              </label>
              <input
                type="email"
                {...register('recipient')}
                className={inputClass}
                style={inputStyles}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Subject
              </label>
              <input
                type="text"
                {...register('subject')}
                className={inputClass}
                style={inputStyles}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Notes about this email{' '}
                <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <textarea
                {...register('content', { required: 'Notes are required' })}
                rows={4}
                className={cn(inputClass, 'resize-y')}
                style={{
                  ...inputStyles,
                  borderColor: errors.content
                    ? 'var(--bb-color-status-negative)'
                    : inputStyles.borderColor,
                }}
                placeholder="Brief summary of what the email was about..."
              />
              {errors.content && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.content.message}
                </p>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* SMS Form */}
      {activityType === 'sms' && (
        <FormSection title="SMS Details">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                To
              </label>
              <input
                type="tel"
                {...register('recipient')}
                className={inputClass}
                style={inputStyles}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Message <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <textarea
                {...register('content', { required: 'Message is required' })}
                rows={4}
                className={cn(inputClass, 'resize-y')}
                style={{
                  ...inputStyles,
                  borderColor: errors.content
                    ? 'var(--bb-color-status-negative)'
                    : inputStyles.borderColor,
                }}
                placeholder="SMS message content..."
              />
              {errors.content && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.content.message}
                </p>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* Form Actions */}
      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !content?.trim()}>
          {isLoading ? 'Logging...' : `Log ${ACTIVITY_TYPES.find((t) => t.value === activityType)?.label}`}
        </Button>
      </FormActions>
    </form>
  );
}
