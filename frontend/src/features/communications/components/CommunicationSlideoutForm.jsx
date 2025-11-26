/**
 * CommunicationSlideoutForm - Send communication form for slideout
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { useCreateCommunicationMutation } from '../api';
import { useOwner } from '@/features/owners/api';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const COMMUNICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'phone', label: 'Phone Call', icon: Phone },
];

const CommunicationSlideoutForm = ({
  ownerId,
  petId,
  bookingId,
  onSuccess,
  onCancel,
}) => {
  // Fetch owner data
  const { data: owner } = useOwner(ownerId, { enabled: !!ownerId });
  
  // Mutation
  const createMutation = useCreateCommunicationMutation();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      channel: 'email',
      subject: '',
      message: '',
      recipientEmail: '',
      recipientPhone: '',
    },
  });

  const selectedChannel = watch('channel');

  // Pre-fill recipient from owner data
  useEffect(() => {
    if (owner) {
      setValue('recipientEmail', owner.email || '');
      setValue('recipientPhone', owner.phone || '');
    }
  }, [owner, setValue]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ownerId,
        petId,
        bookingId,
        channel: data.channel,
        direction: 'outbound',
        subject: data.subject,
        content: data.message,
        recipient: data.channel === 'email' ? data.recipientEmail : data.recipientPhone,
        status: 'sent',
        timestamp: new Date().toISOString(),
      };
      
      const result = await createMutation.mutateAsync(payload);
      onSuccess?.(result || payload);
    } catch (error) {
      console.error('Failed to send communication:', error);
      toast.error(error?.message || 'Failed to send message');
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
      {/* Recipient Info */}
      {owner && (
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
            Sending to
          </p>
          <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            {owner.firstName} {owner.lastName}
          </p>
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            {owner.email} • {owner.phone}
          </p>
        </div>
      )}

      <FormSection title="Channel">
        <div className="flex gap-2">
          {COMMUNICATION_CHANNELS.map(channel => {
            const Icon = channel.icon;
            const isSelected = selectedChannel === channel.value;
            return (
              <button
                key={channel.value}
                type="button"
                onClick={() => setValue('channel', channel.value)}
                className={cn(
                  "flex-1 p-3 rounded-lg border text-center transition-colors",
                  isSelected && "ring-2 ring-[color:var(--bb-color-accent)]"
                )}
                style={{ 
                  borderColor: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
                  backgroundColor: isSelected ? 'var(--bb-color-accent-soft)' : 'transparent',
                }}
              >
                <Icon 
                  className="w-5 h-5 mx-auto mb-1" 
                  style={{ color: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-text-muted)' }} 
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-text-primary)' }}
                >
                  {channel.label}
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Message">
        {selectedChannel === 'email' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Subject <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="text"
              {...register('subject', { required: selectedChannel === 'email' ? 'Subject is required' : false })}
              className={inputClass}
              style={inputStyles}
              placeholder="Booking confirmation, reminder..."
            />
            {errors.subject && (
              <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.subject.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Message <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <textarea
            {...register('message', { required: 'Message is required' })}
            rows={selectedChannel === 'email' ? 8 : 4}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder={selectedChannel === 'sms' ? 'Keep SMS messages short and to the point...' : 'Type your message here...'}
          />
          {errors.message && (
            <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.message.message}</p>
          )}
          {selectedChannel === 'sms' && (
            <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
              {watch('message')?.length || 0}/160 characters
            </p>
          )}
        </div>

        {selectedChannel === 'phone' && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'var(--bb-color-info-soft)' }}
          >
            <p className="text-sm" style={{ color: 'var(--bb-color-info)' }}>
              This will log a phone call record. Click "Log Call" after completing the call to save notes.
            </p>
          </div>
        )}
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : selectedChannel === 'phone' ? 'Log Call' : 'Send Message'}
        </Button>
      </FormActions>
    </form>
  );
};

export default CommunicationSlideoutForm;

