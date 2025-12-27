import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, MessageSquare, Phone, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { useCreateCommunication } from '../api';

const communicationTypes = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: MessageSquare },
  { value: 'CALL', label: 'Phone Call', icon: Phone },
  { value: 'NOTE', label: 'Note', icon: FileText },
];

export default function CommunicationForm({ ownerId, onSuccess, onCancel }) {
  const [selectedType, setSelectedType] = useState('EMAIL');
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const createCommunication = useCreateCommunication();

  const onSubmit = async (data) => {
    try {
      await createCommunication.mutateAsync({
        ...data,
        ownerId,
        type: selectedType,
        direction: selectedType === 'NOTE' ? 'INTERNAL' : 'OUTBOUND',
      });
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create communication:', error);
    }
  };

  const TypeIcon = communicationTypes.find(t => t.value === selectedType)?.icon || FileText;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Communication Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {communicationTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedType(type.value)}
                className={`
                  p-3 rounded-lg border transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-border hover:border-gray-300 dark:border-surface-border'
                  }
                `}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">{type.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedType === 'EMAIL' && (
        <Input
          label="Subject"
          {...register('subject', { required: 'Subject is required' })}
          error={errors.subject}
        />
      )}

      <Textarea
        label={selectedType === 'CALL' ? 'Call Notes' : 'Content'}
        rows={6}
        {...register('content', { required: 'Content is required' })}
        error={errors.content}
        placeholder={
          selectedType === 'EMAIL' ? 'Type your email message...' :
          selectedType === 'SMS' ? 'Type your SMS message...' :
          selectedType === 'CALL' ? 'Summarize the phone conversation...' :
          'Add your note...'
        }
      />

      {selectedType === 'CALL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Call Direction"
            {...register('metadata.callDirection')}
            options={[
              { value: 'outbound', label: 'Outbound' },
              { value: 'inbound', label: 'Inbound' },
            ]}
            menuPortalTarget={document.body}
          />

          <Input
            label="Duration (minutes)"
            type="number"
            {...register('metadata.duration')}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={createCommunication.isPending}
          leftIcon={<TypeIcon className="w-4 h-4" />}
        >
          {selectedType === 'EMAIL' ? 'Send Email' :
           selectedType === 'SMS' ? 'Send SMS' :
           selectedType === 'CALL' ? 'Log Call' :
           'Add Note'}
        </Button>
      </div>
    </form>
  );
}

