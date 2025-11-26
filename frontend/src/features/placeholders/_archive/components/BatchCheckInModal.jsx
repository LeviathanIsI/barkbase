import { useState } from 'react';
import { X, Users, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const BatchCheckInModal = ({ pets, isOpen, onClose }) => {
  const [selectedPets, setSelectedPets] = useState(new Set());
  const [sendNotifications, setSendNotifications] = useState(true);
  const [takePhotos, setTakePhotos] = useState(true);
  const [batchNote, setBatchNote] = useState('');

  if (!isOpen) return null;

  const togglePetSelection = (petId) => {
    const newSelected = new Set(selectedPets);
    if (newSelected.has(petId)) {
      newSelected.delete(petId);
    } else {
      newSelected.add(petId);
    }
    setSelectedPets(newSelected);
  };

  const selectAll = () => {
    setSelectedPets(new Set(pets.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPets(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Batch Check-In</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 dark:text-text-secondary mb-6">Process multiple arrivals at once</p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-text-primary">Scheduled arrivals today ({pets.length}):</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {pets.map(pet => (
                <div key={pet.id} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPets.has(pet.id)}
                      onChange={() => togglePetSelection(pet.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-text-primary">
                        {pet.name} - {pet.breed}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">
                        {pet.owner.name} • {pet.scheduledTime}
                      </div>
                      {pet.late && (
                        <div className="text-sm text-red-600">
                          ⚠️ LATE ({pet.lateBy} overdue)
                        </div>
                      )}
                    </div>
                    {pet.status === 'checked_in' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-surface-border pt-6">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">Batch Actions ({selectedPets.size} selected):</h4>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendNotifications}
                  onChange={(e) => setSendNotifications(e.target.checked)}
                  className="mr-2"
                />
                Send "arrived safely" SMS to owners
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={takePhotos}
                  onChange={(e) => setTakePhotos(e.target.checked)}
                  className="mr-2"
                />
                Take group arrival photo
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Add batch note (optional):
                </label>
                <textarea
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  placeholder="All pets arrived happy and ready to play!"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={selectedPets.size === 0}>
            Process {selectedPets.size} Selected Check-Ins
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchCheckInModal;
