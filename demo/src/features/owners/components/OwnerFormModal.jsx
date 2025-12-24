/**
 * OwnerFormModal Component - Demo Version
 * SlideoutPanel form for creating/editing owners with mock data.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, X } from 'lucide-react';
import SlideoutPanel from '@/components/ui/SlideoutPanel';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const OwnerFormModal = ({ open, onClose, onSubmit, owner = null, isLoading = false }) => {
  const isEditMode = !!owner;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      notes: '',
    },
  });

  // Reset form when owner changes
  useEffect(() => {
    if (open) {
      if (owner) {
        reset({
          firstName: owner.firstName || '',
          lastName: owner.lastName || '',
          email: owner.email || '',
          phone: owner.phone || '',
          address: owner.address || '',
          city: owner.city || '',
          state: owner.state || '',
          zip: owner.zip || '',
          notes: owner.notes || '',
        });
      } else {
        reset({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          notes: '',
        });
      }
    }
  }, [open, owner, reset]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  return (
    <SlideoutPanel
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit Owner' : 'Add New Owner'}
      subtitle={isEditMode ? `Update ${owner?.firstName}'s information` : 'Enter the owner details below'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="First Name"
                error={errors.firstName?.message}
                {...register('firstName', { required: 'First name is required' })}
                placeholder="John"
              />
              <FormField
                label="Last Name"
                error={errors.lastName?.message}
                {...register('lastName', { required: 'Last name is required' })}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="space-y-4">
              <FormField
                label="Email"
                type="email"
                error={errors.email?.message}
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="john@example.com"
              />
              <FormField
                label="Phone"
                type="tel"
                error={errors.phone?.message}
                {...register('phone')}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </h3>
            <div className="space-y-4">
              <FormField
                label="Street Address"
                error={errors.address?.message}
                {...register('address')}
                placeholder="123 Main St"
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  label="City"
                  error={errors.city?.message}
                  {...register('city')}
                  placeholder="New York"
                />
                <FormField
                  label="State"
                  error={errors.state?.message}
                  {...register('state')}
                  placeholder="NY"
                />
                <FormField
                  label="ZIP"
                  error={errors.zip?.message}
                  {...register('zip')}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Any additional notes about this owner..."
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{
                backgroundColor: 'var(--bb-color-bg-body)',
                borderColor: 'var(--bb-color-border-subtle)',
                color: 'var(--bb-color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || (!isDirty && isEditMode)}>
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Owner'}
          </Button>
        </div>
      </form>
    </SlideoutPanel>
  );
};

// Form Field Component
const FormField = ({ label, error, type = 'text', ...props }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
          error && 'border-red-500 focus:ring-red-500'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-body)',
          borderColor: error ? undefined : 'var(--bb-color-border-subtle)',
          color: 'var(--bb-color-text-primary)',
        }}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default OwnerFormModal;
