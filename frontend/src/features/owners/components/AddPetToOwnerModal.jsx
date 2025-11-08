import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { usePetsQuery } from '@/features/pets/api';

const AddPetToOwnerModal = ({ open, onClose, onAdd, currentPetIds = [] }) => {
  const [selectedPetId, setSelectedPetId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const petsQuery = usePetsQuery();
  const allPets = petsQuery.data?.data ?? [];

  // Filter out pets that are already associated
  const availablePets = allPets.filter(pet => !currentPetIds.includes(pet.recordId));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPetId) return;

    onAdd({ petId: selectedPetId, isPrimary });
    setSelectedPetId('');
    setIsPrimary(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-surface-primary p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">Add Pet to Owner</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Select Pet
              </label>
              {petsQuery.isLoading ? (
                <p className="text-sm text-muted">Loading pets...</p>
              ) : availablePets.length === 0 ? (
                <p className="text-sm text-muted">
                  {allPets.length === 0
                    ? 'No pets available. Create a pet first.'
                    : 'All pets are already associated with this owner.'}
                </p>
              ) : (
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="w-full rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isPrimary" className="text-sm text-text">
                Set as primary owner
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedPetId || availablePets.length === 0}
            >
              Add Pet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPetToOwnerModal;
