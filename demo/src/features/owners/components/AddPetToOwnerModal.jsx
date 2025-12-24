import { useState } from 'react';
import Select from 'react-select';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { usePetsQuery } from '@/features/pets/api';

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

const AddPetToOwnerModal = ({ open, onClose, onAdd, currentPetIds = [] }) => {
  const [selectedPetId, setSelectedPetId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const petsQuery = usePetsQuery();
  const allPets = petsQuery.data?.pets ?? [];

  // Filter out pets that are already associated
  const availablePets = allPets.filter(pet => !currentPetIds.includes(pet.recordId));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPetId) return;

    onAdd({ petId: selectedPetId, isPrimary });
    setSelectedPetId('');
    setIsPrimary(false);
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose} type="button">
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-pet-form"
        disabled={!selectedPetId || availablePets.length === 0}
      >
        Add Pet
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Pet to Owner"
      size="sm"
      footer={footer}
    >
      <form id="add-pet-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--bb-color-text-primary)] mb-1">
              Select Pet
            </label>
            {petsQuery.isLoading ? (
              <p className="text-sm text-[var(--bb-color-text-muted)]">Loading pets...</p>
            ) : availablePets.length === 0 ? (
              <p className="text-sm text-[var(--bb-color-text-muted)]">
                {allPets.length === 0
                  ? 'No pets available. Create a pet first.'
                  : 'All pets are already associated with this owner.'}
              </p>
            ) : (
              <Select
                options={availablePets.map((pet) => ({
                  value: pet.recordId,
                  label: `${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`
                }))}
                value={availablePets.map((pet) => ({
                  value: pet.recordId,
                  label: `${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`
                })).find(o => o.value === selectedPetId) || null}
                onChange={(opt) => setSelectedPetId(opt?.value || '')}
                placeholder="Choose a pet..."
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]"
            />
            <label htmlFor="isPrimary" className="text-sm text-[var(--bb-color-text-primary)]">
              Set as primary owner
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddPetToOwnerModal;
