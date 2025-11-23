import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import SlideoutPanel from '@/components/SlideoutPanel';

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

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Owner' : 'Create New Owner'}
      widthClass="max-w-2xl"
    >
      {/* TODO (Directory UX Cleanup C1:3): Visual polish for slideout forms. */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              First Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('firstName', { required: 'First name is required' })}
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.firstName && 'border-red-500 dark:border-red-400'
              )}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Last Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('lastName', { required: 'Last name is required' })}
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.lastName && 'border-red-500 dark:border-red-400'
              )}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
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
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.email && 'border-red-500 dark:border-red-400'
              )}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Phone
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text">Address</h3>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Street Address
            </label>
            <input
              type="text"
              {...register('address.street')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-text mb-1">
                City
              </label>
              <input
                type="text"
                {...register('address.city')}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                State
              </label>
              <input
                type="text"
                {...register('address.state')}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="NY"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                {...register('address.zip')}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="10001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Country
              </label>
              <select
                {...register('address.country')}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
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
        </div>
      </form>
    </SlideoutPanel>
  );
};

export default OwnerFormModal;
