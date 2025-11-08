import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">
          {segment ? 'Edit Segment' : 'Create Segment'}
        </h3>
      </div>
      
      <Input
        label="Segment Name"
        {...register('name', { required: 'Name is required' })}
        error={errors.name}
        placeholder="e.g., VIP Customers, New Members"
      />
      
      <Textarea
        label="Description"
        {...register('description')}
        rows={2}
        placeholder="Optional description for this segment"
      />
      
      {!segment && (
        <div>
          <Checkbox
            label="Automatic Segment"
            checked={isAutomatic}
            onChange={(e) => setIsAutomatic(e.target.checked)}
            helpText="Automatically add/remove members based on conditions"
          />
          
          {isAutomatic && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg space-y-4">
              <Select
                label="Segment Type"
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value)}
              >
                {automaticSegmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </Select>
              
              {segmentType === 'vip' && (
                <Input
                  label="Minimum Lifetime Value ($)"
                  type="number"
                  {...register('minValue', { required: 'Minimum value is required' })}
                  error={errors.minValue}
                  defaultValue="1000"
                />
              )}
              
              {segmentType === 'frequent' && (
                <Input
                  label="Minimum Bookings (last 90 days)"
                  type="number"
                  {...register('minBookings', { required: 'Minimum bookings is required' })}
                  error={errors.minBookings}
                  defaultValue="3"
                />
              )}
              
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-surface-primary rounded-md">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Automatic segments update daily. Members are added or removed based on the conditions you set.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {segment && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 text-primary rounded"
            />
            <span className="text-sm font-medium text-text">Active</span>
          </label>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={createSegment.isPending || updateSegment.isPending}
        >
          {segment ? 'Update Segment' : 'Create Segment'}
        </Button>
      </div>
    </form>
  );
}

