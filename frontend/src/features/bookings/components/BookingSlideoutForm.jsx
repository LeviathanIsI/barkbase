/**
 * BookingSlideoutForm - Booking creation/edit form for slideout
 * Simplified version of the booking wizard for quick actions
 */

import Button from '@/components/ui/Button';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { useKennels } from '@/features/kennels/api';
import { useOwnerQuery, useOwnerSearchQuery } from '@/features/owners/api';
import { usePetOwnersQuery, usePetQuery, usePetsQuery } from '@/features/pets/api';
import { useServicesQuery } from '@/features/services/api';
import { cn } from '@/lib/cn';
import { addDays, format } from 'date-fns';
import { Check, Home, PawPrint, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { useCreateBookingMutation, useUpdateBookingMutation } from '../api';

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

const BookingSlideoutForm = ({
  mode = 'create',
  bookingId,
  initialPetId,
  initialOwnerId,
  onSuccess,
  onCancel,
}) => {
  const isEdit = mode === 'edit';
  
  // Form state
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedPets, setSelectedPets] = useState([]);
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [prefilledFromPet, setPrefilledFromPet] = useState(false);
  
  // Queries
  const { data: ownersData } = useOwnerSearchQuery(ownerSearch, { enabled: ownerSearch.length >= 2 });
  const { data: petsData } = usePetsQuery();
  const { data: servicesData } = useServicesQuery();
  const { data: kennelsData } = useKennels();
  const { data: initialPet } = usePetQuery(initialPetId, { enabled: !!initialPetId });
  const { data: initialOwner } = useOwnerQuery(initialOwnerId, { enabled: !!initialOwnerId });
  const { data: petOwners = [] } = usePetOwnersQuery(initialPetId, { enabled: !!initialPetId });
  
  // Mutations
  const createMutation = useCreateBookingMutation();
  const updateMutation = useUpdateBookingMutation(bookingId);
  
  const owners = ownersData?.owners || ownersData || [];
  const pets = petsData?.pets || [];
  const services = servicesData?.services || servicesData || [];
  const kennels = kennelsData || [];
  
  // Filter pets by selected owner
  // Handle both camelCase and snake_case owner IDs from API
  const ownerPets = useMemo(() => {
    if (!selectedOwner) return [];
    const ownerRecordId = selectedOwner.recordId || selectedOwner.id;
    return pets.filter(p =>
      p.ownerId === ownerRecordId ||
      p.owner_id === ownerRecordId ||
      p.owners?.some(o => (o.recordId || o.id) === ownerRecordId)
    );
  }, [selectedOwner, pets]);

  // Filter available kennels - only show active kennels with capacity
  const availableKennels = useMemo(() => {
    return kennels.filter(k => {
      // Must be active
      if (!k.isActive) return false;
      // Must have available capacity
      const available = (k.capacity || 1) - (k.occupied || 0);
      return available > 0;
    });
  }, [kennels]);
  
  // Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      checkIn: format(new Date(), 'yyyy-MM-dd'),
      checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      serviceId: '',
      notes: '',
      specialRequirements: '',
    },
  });
  
  // Initialize from initialOwner when provided (without pet context)
  useEffect(() => {
    if (initialOwner && !selectedOwner && !initialPetId) {
      setSelectedOwner(initialOwner);
    }
  }, [initialOwner, initialPetId]);

  // Initialize from initialPet when provided (includes setting owner from pet)
  // Uses petOwners from dedicated query for accurate owner data
  useEffect(() => {
    if (initialPet && !selectedOwner && !prefilledFromPet) {

      // Use owners from the dedicated petOwners query (most reliable)
      // Fall back to initialPet.owners or other sources if query hasn't loaded yet
      const ownersToUse = petOwners.length > 0
        ? petOwners
        : (initialPet.owners?.length > 0 ? initialPet.owners : []);

      if (ownersToUse.length === 1) {
        // Single owner: auto-select both owner and pet
        const owner = ownersToUse[0];
        // Normalize field names for consistency
        setSelectedOwner({
          ...owner,
          firstName: owner.firstName || owner.first_name || '',
          lastName: owner.lastName || owner.last_name || '',
          email: owner.email || '',
          phone: owner.phone || '',
          id: owner.recordId || owner.record_id || owner.id,
          recordId: owner.recordId || owner.record_id || owner.id,
        });
        setSelectedPets([initialPet]);
        setPrefilledFromPet(true);
      } else if (ownersToUse.length > 1) {
        // Multiple owners: show picker, pre-select pet
        setSelectedPets([initialPet]);
        setPrefilledFromPet(true);
      } else if (petOwners.length === 0 && initialPet) {
        // petOwners query might still be loading - pre-select pet, wait for owners
        setSelectedPets([initialPet]);
        setPrefilledFromPet(true);
      }
    }
  }, [initialPet, petOwners, prefilledFromPet]);
  
  const onSubmit = async (data) => {
    if (!selectedOwner) {
      toast.error('Please select an owner');
      return;
    }
    if (selectedPets.length === 0) {
      toast.error('Please select a pet');
      return;
    }
    if (!data.serviceId) {
      toast.error('Please select a service');
      return;
    }
    
    try {
      // Create a booking for each pet
      const bookings = await Promise.all(
        selectedPets.map(pet => {
          const payload = {
            ownerId: selectedOwner.id || selectedOwner.recordId,
            petId: pet.id || pet.recordId,
            serviceId: data.serviceId,
            startDate: data.checkIn,
            endDate: data.checkOut,
            notes: data.notes,
            specialRequirements: data.specialRequirements,
            status: 'PENDING',
            kennelId: selectedKennel?.id || selectedKennel?.recordId || null,
          };

          if (isEdit) {
            return updateMutation.mutateAsync(payload);
          }
          return createMutation.mutateAsync(payload);
        })
      );
      
      onSuccess?.(bookings[0]);
    } catch (error) {
      console.error('Failed to save booking:', error);
      toast.error(error?.message || 'Failed to save booking');
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
      {/* Step 1: Owner Selection */}
      <FormSection title="1. Select Owner">
        {selectedOwner ? (
          <div
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{ borderColor: 'var(--bb-color-accent)', backgroundColor: 'var(--bb-color-accent-soft)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--bb-color-purple-soft)', color: 'var(--bb-color-purple)' }}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {selectedOwner.firstName} {selectedOwner.lastName}
                </p>
                <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {selectedOwner.email || selectedOwner.phone}
                </p>
              </div>
            </div>
            {/* Only show Change button if not locked from pet pre-fill with single owner */}
            {(!prefilledFromPet || petOwners.length > 1) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => {
                setSelectedOwner(null);
                if (!prefilledFromPet) {
                  setSelectedPets([]);
                }
              }}>
                Change
              </Button>
            )}
          </div>
        ) : prefilledFromPet && petOwners.length > 1 ? (
          /* Show react-select dropdown of pet's owners when pre-filled from pet with multiple owners */
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Select which owner is booking for {initialPet?.name}
            </label>
            <Select
              options={petOwners.map(owner => ({
                value: owner.recordId || owner.record_id || owner.id,
                label: `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim() +
                       (owner.is_primary ? ' (Primary)' : ''),
                owner: {
                  ...owner,
                  firstName: owner.firstName || owner.first_name || '',
                  lastName: owner.lastName || owner.last_name || '',
                  email: owner.email || '',
                  phone: owner.phone || '',
                  id: owner.recordId || owner.record_id || owner.id,
                  recordId: owner.recordId || owner.record_id || owner.id,
                },
              }))}
              value={null}
              onChange={(opt) => opt && setSelectedOwner(opt.owner)}
              placeholder="Select an owner..."
              isSearchable={false}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>
        ) : prefilledFromPet && petOwners.length === 1 && !selectedOwner ? (
          /* Single owner from pet - show loading/auto-selecting state */
          <div className="p-3 text-center" style={{ color: 'var(--bb-color-text-muted)' }}>
            Loading owner...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search owners by name, email, or phone..."
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                className={cn(inputClass, 'pl-10')}
                style={inputStyles}
              />
            </div>
            {ownerSearch.length >= 2 && owners.length > 0 && (
              <div className="border rounded-lg divide-y" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                {owners.slice(0, 5).map(owner => (
                  <button
                    key={owner.id || owner.recordId}
                    type="button"
                    onClick={() => setSelectedOwner(owner)}
                    className="w-full p-3 text-left hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors flex items-center gap-3"
                  >
                    <Users className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {owner.firstName} {owner.lastName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {owner.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </FormSection>

      {/* Step 2: Pet Selection */}
      <FormSection title="2. Select Pet">
        {/* When pre-filled from pet page, show the pre-selected pet */}
        {prefilledFromPet && initialPet ? (
          <div className="space-y-3">
            {/* Show the pre-selected pet prominently */}
            <div
              className="p-3 rounded-lg border ring-2 ring-[color:var(--bb-color-accent)] flex items-center gap-3"
              style={{
                borderColor: 'var(--bb-color-accent)',
                backgroundColor: 'var(--bb-color-accent-soft)',
              }}
            >
              <PawPrint className="w-5 h-5" style={{ color: 'var(--bb-color-accent)' }} />
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {initialPet.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {initialPet.breed || initialPet.species}
                </p>
              </div>
              <Check className="w-4 h-4" style={{ color: 'var(--bb-color-accent)' }} />
            </div>
          </div>
        ) : selectedOwner ? (
          ownerPets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {ownerPets.map(pet => {
                const petId = pet.recordId || pet.id;
                const isSelected = selectedPets.some(p => (p.recordId || p.id) === petId);
                return (
                  <button
                    key={petId}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedPets([]);
                      } else {
                        setSelectedPets([pet]);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                      isSelected && "ring-2 ring-[color:var(--bb-color-accent)]"
                    )}
                    style={{
                      borderColor: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
                      backgroundColor: isSelected ? 'var(--bb-color-accent-soft)' : 'transparent',
                    }}
                  >
                    <PawPrint className="w-5 h-5" style={{ color: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-text-muted)' }} />
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {pet.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {pet.breed || pet.species}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 ml-auto" style={{ color: 'var(--bb-color-accent)' }} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              No pets found for this owner
            </p>
          )
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--bb-color-text-muted)' }}>
            Select an owner first
          </p>
        )}
      </FormSection>

      {/* Step 3: Service & Dates */}
      <FormSection title="3. Service & Dates">
        <div className="space-y-4">
          <Controller
            name="serviceId"
            control={control}
            rules={{ required: 'Service is required' }}
            render={({ field }) => (
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Service <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
                </label>
                <Select
                  options={services.map(service => ({
                    value: service.id || service.recordId,
                    label: `${service.name}${service.priceInCents ? ` - $${(service.priceInCents / 100).toFixed(2)}/day` : ''}`
                  }))}
                  value={services.map(service => ({
                    value: service.id || service.recordId,
                    label: `${service.name}${service.priceInCents ? ` - $${(service.priceInCents / 100).toFixed(2)}/day` : ''}`
                  })).find(o => o.value === field.value) || null}
                  onChange={(opt) => field.onChange(opt?.value || '')}
                  placeholder="Select a service"
                  isClearable
                  isSearchable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
                {errors.serviceId?.message && (
                  <p className="text-sm" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.serviceId.message}</p>
                )}
              </div>
            )}
          />

          <FormGrid cols={2}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Check-in <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="date"
                {...register('checkIn', { required: 'Check-in date is required' })}
                className={inputClass}
                style={inputStyles}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Check-out <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="date"
                {...register('checkOut', { required: 'Check-out date is required' })}
                className={inputClass}
                style={inputStyles}
              />
            </div>
          </FormGrid>
        </div>
      </FormSection>

      {/* Step 4: Reserve Kennel (Optional) */}
      <FormSection title="4. Reserve Kennel (Optional)">
        {availableKennels.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
              Optionally reserve a kennel for this booking
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableKennels.map(kennel => {
                const kennelId = kennel.recordId || kennel.id;
                const selectedId = selectedKennel?.recordId || selectedKennel?.id;
                const isSelected = selectedKennel !== null && kennelId && String(selectedId) === String(kennelId);
                const available = (kennel.capacity || 1) - (kennel.occupied || 0);
                return (
                  <button
                    key={kennelId}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedKennel(null);
                      } else {
                        setSelectedKennel(kennel);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors flex items-center gap-3",
                      isSelected && "ring-2 ring-[color:var(--bb-color-accent)]"
                    )}
                    style={{
                      borderColor: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
                      backgroundColor: isSelected ? 'var(--bb-color-accent-soft)' : 'transparent',
                    }}
                  >
                    <Home className="w-5 h-5" style={{ color: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {kennel.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {kennel.type || 'Kennel'} • {available} available
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bb-color-accent)' }} />}
                  </button>
                );
              })}
            </div>
            {selectedKennel && (
              <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--bb-color-accent)' }}>
                  Selected: {selectedKennel.name}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedKennel(null)}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--bb-color-text-muted)' }}>
            No available kennels
          </p>
        )}
      </FormSection>

      {/* Step 5: Notes */}
      <FormSection title="5. Notes (Optional)">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Special Requirements
          </label>
          <textarea
            {...register('specialRequirements')}
            rows={3}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Medications, feeding instructions, special handling..."
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : isEdit ? 'Update Booking' : 'Create Booking'}
        </Button>
      </FormActions>
    </form>
  );
};

export default BookingSlideoutForm;

