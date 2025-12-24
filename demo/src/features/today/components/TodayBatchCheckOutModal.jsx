/**
 * TodayBatchCheckOutModal Component
 * Allows selecting multiple pets to check out at once.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import PetAvatar from '@/components/ui/PetAvatar';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import TodaySection from './TodaySection';

const TodayBatchCheckOutModal = ({ open, onClose, departures = [], snapshotQueryKey }) => {
  const [selectedDepartures, setSelectedDepartures] = useState([]);
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleBatchCheckOut = async () => {
    setProcessing(true);
    try {
      // Simulate API delay
      await new Promise((r) => setTimeout(r, 800));

      toast.success(`Successfully checked out ${selectedDepartures.length} pets!`);
      setSelectedDepartures([]);
      onClose?.();
      if (snapshotQueryKey) {
        await queryClient.invalidateQueries({ queryKey: snapshotQueryKey });
      }
    } catch (error) {
      toast.error('Failed to process check-outs');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelection = (bookingId, isSelected) => {
    setSelectedDepartures((prev) =>
      isSelected ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]
    );
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setSelectedDepartures([]);
        onClose?.();
      }}
      title="Batch Check-out"
      className="max-w-2xl"
    >
      <TodaySection subtitle="Select pets to check out:" className="space-y-4">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {departures.map((booking) => {
            const isSelected = selectedDepartures.includes(booking.id);
            return (
              <div
                key={booking.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-[color:var(--bb-color-border)] bg-[color:var(--bb-color-bg-elevated)]'
                )}
                onClick={() => toggleSelection(booking.id, isSelected)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <PetAvatar
                  pet={booking.pet || { name: booking.petName }}
                  size="sm"
                  showStatus={false}
                />
                <div className="flex-1">
                  <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                    {booking.petName || booking.pet?.name}
                  </p>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                    {booking.ownerName || booking.owner?.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedDepartures([]);
              onClose?.();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBatchCheckOut}
            disabled={selectedDepartures.length === 0 || processing}
          >
            {processing ? 'Processing...' : `Check Out ${selectedDepartures.length} Pets`}
          </Button>
        </div>
      </TodaySection>
    </Modal>
  );
};

export default TodayBatchCheckOutModal;
