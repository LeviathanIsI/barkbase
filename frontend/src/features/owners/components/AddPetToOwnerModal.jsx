import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { usePetsQuery } from '@/features/pets/api';

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
              <StyledSelect
                options={[
                  { value: '', label: 'Choose a pet...' },
                  ...availablePets.map((pet) => ({
                    value: pet.recordId,
                    label: `${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`
                  }))
                ]}
                value={selectedPetId}
                onChange={(opt) => setSelectedPetId(opt?.value || '')}
                isClearable={false}
                isSearchable={true}
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
