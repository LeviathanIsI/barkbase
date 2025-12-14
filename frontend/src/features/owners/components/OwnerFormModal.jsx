/**
 * Owner Form Modal - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import SlideoutPanel from '@/components/SlideoutPanel';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    padding: '8px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
};

const OwnerFormModal = ({
  open,
  onClose,
  onSubmit,
  owner = null,
  isLoading = false,
}) => {
  const isEdit = !!owner;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
      },
    },
  });

  // Reset form when owner changes or modal opens
  useEffect(() => {
    if (owner) {
      reset({
        firstName: owner.firstName || '',
        lastName: owner.lastName || '',
        email: owner.email || '',
        phone: owner.phone || '',
        address: owner.address || {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
        },
      });
    } else if (open) {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
        },
      });
    }
  }, [owner, open, reset]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  // Common input styles
  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const inputClass = cn(
    'w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
    'text-[var(--bb-font-size-sm,0.875rem)]',
    'focus:outline-none focus:ring-1',
    'transition-colors'
  );

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Owner' : 'Create New Owner'}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Name Fields */}
        <FormSection title="Personal Information">
          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                First Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="text"
                {...register('firstName', { required: 'First name is required' })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.firstName ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
                placeholder="John"
              />
              {errors.firstName && (
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)]"
                  style={{ color: 'var(--bb-color-status-negative)' }}
                >
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Last Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="text"
                {...register('lastName', { required: 'Last name is required' })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.lastName ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)]"
                  style={{ color: 'var(--bb-color-status-negative)' }}
                >
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </FormGrid>
        </FormSection>

        {/* Contact Fields */}
        <FormSection title="Contact Information">
          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.email ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)]"
                  style={{ color: 'var(--bb-color-status-negative)' }}
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Phone
              </label>
              <input
                type="tel"
                {...register('phone')}
                className={inputClass}
                style={inputStyles}
                placeholder="(555) 123-4567"
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Address Section */}
        <FormSection title="Address">
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Street Address
            </label>
            <input
              type="text"
              {...register('address.street')}
              className={inputClass}
              style={inputStyles}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--bb-space-4,1rem)]">
            <div className="lg:col-span-2 space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                City
              </label>
              <input
                type="text"
                {...register('address.city')}
                className={inputClass}
                style={inputStyles}
                placeholder="New York"
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                State
              </label>
              <input
                type="text"
                {...register('address.state')}
                className={inputClass}
                style={inputStyles}
                placeholder="NY"
                maxLength={2}
              />
            </div>
          </div>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                ZIP Code
              </label>
              <input
                type="text"
                {...register('address.zip')}
                className={inputClass}
                style={inputStyles}
                placeholder="10001"
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Country
              </label>
              <Select
                options={[
                  { value: 'US', label: 'United States' },
                  { value: 'CA', label: 'Canada' },
                  { value: 'MX', label: 'Mexico' },
                  { value: 'GB', label: 'United Kingdom' },
                ]}
                value={[{ value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }, { value: 'MX', label: 'Mexico' }, { value: 'GB', label: 'United Kingdom' }].find(o => o.value === watch('address.country')) || null}
                onChange={(opt) => setValue('address.country', opt?.value || 'US', { shouldDirty: true })}
                placeholder="Select country"
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Actions */}
        <FormActions>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || (!isDirty && isEdit)}
          >
            {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Owner' : 'Create Owner')}
          </Button>
        </FormActions>
      </form>
    </SlideoutPanel>
  );
};

export default OwnerFormModal;
