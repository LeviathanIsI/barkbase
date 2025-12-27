/**
 * Segment Form - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import { FormActions, FormSection } from '@/components/ui/FormField';
import { useCreateSegment, useUpdateSegment } from '@/features/communications/api';

const automaticSegmentTypes = [
  { value: 'vip', label: 'VIP Customers', description: 'High lifetime value customers' },
  { value: 'at_risk', label: 'At Risk', description: 'Haven\'t booked in 90+ days' },
  { value: 'new', label: 'New Customers', description: 'Joined in last 30 days' },
  { value: 'frequent', label: 'Frequent Visitors', description: 'Multiple bookings recently' },
];

export default function SegmentForm({ segment, onClose }) {
  const [isAutomatic, setIsAutomatic] = useState(segment?.isAutomatic || false);
  const [segmentType, setSegmentType] = useState('vip');
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: segment || {},
  });
  
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        isAutomatic,
        conditions: isAutomatic ? {
          type: segmentType,
          ...(segmentType === 'vip' && { minValue: parseInt(data.minValue) * 100 }), // Convert to cents
          ...(segmentType === 'frequent' && { minBookings: parseInt(data.minBookings) }),
        } : undefined,
      };

      if (segment) {
        await updateSegment.mutateAsync({
          segmentId: segment.recordId,
          ...payload,
        });
      } else {
        await createSegment.mutateAsync(payload);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save segment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-[var(--bb-space-4,1rem)]">
      <div className="flex items-center justify-between mb-[var(--bb-space-4,1rem)]">
        <h3
          className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {segment ? 'Edit Segment' : 'Create Segment'}
        </h3>
      </div>
      
      <Input
        label="Segment Name"
        {...register('name', { required: 'Name is required' })}
        error={errors.name?.message}
        placeholder="e.g., VIP Customers, New Members"
      />
      
      <Textarea
        label="Description"
        {...register('description')}
        rows={2}
        placeholder="Optional description for this segment"
      />
      
      {!segment && (
        <div className="space-y-[var(--bb-space-4,1rem)]">
          <Checkbox
            label="Automatic Segment"
            checked={isAutomatic}
            onChange={(e) => setIsAutomatic(e.target.checked)}
            description="Automatically add/remove members based on conditions"
          />
          
          {isAutomatic && (
            <div
              className="p-[var(--bb-space-4,1rem)] rounded-lg space-y-[var(--bb-space-4,1rem)]"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <Select
                label="Segment Type"
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value)}
                options={automaticSegmentTypes.map((type) => ({
                  value: type.value,
                  label: `${type.label} - ${type.description}`,
                }))}
                menuPortalTarget={document.body}
              />
              
              {segmentType === 'vip' && (
                <Input
                  label="Minimum Lifetime Value ($)"
                  type="number"
                  {...register('minValue', { required: 'Minimum value is required' })}
                  error={errors.minValue?.message}
                  defaultValue="1000"
                />
              )}
              
              {segmentType === 'frequent' && (
                <Input
                  label="Minimum Bookings (last 90 days)"
                  type="number"
                  {...register('minBookings', { required: 'Minimum bookings is required' })}
                  error={errors.minBookings?.message}
                  defaultValue="3"
                />
              )}
              
              <div
                className="flex items-start gap-[var(--bb-space-2,0.5rem)] p-[var(--bb-space-3,0.75rem)] rounded-md"
                style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
              >
                <Info
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--bb-color-accent)' }}
                />
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-accent)' }}
                >
                  Automatic segments update daily. Members are added or removed based on the conditions you set.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {segment && (
        <div>
          <label className="flex items-center gap-[var(--bb-space-2,0.5rem)] cursor-pointer">
            <input
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 rounded"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
                accentColor: 'var(--bb-color-accent)',
              }}
            />
            <span
              className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Active
            </span>
          </label>
        </div>
      )}
      
      <FormActions>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={createSegment.isPending || updateSegment.isPending}
        >
          {segment ? 'Update Segment' : 'Create Segment'}
        </Button>
      </FormActions>
    </form>
  );
}
