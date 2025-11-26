import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
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
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="w-full rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] px-3 py-2 text-sm focus:border-[var(--bb-color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]"
                required
              >
                <option value="">Choose a pet...</option>
                {availablePets.map((pet) => (
                  <option key={pet.recordId} value={pet.recordId}>
                    {pet.name} {pet.breed ? `(${pet.breed})` : ''}
                  </option>
                ))}
              </select>
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
