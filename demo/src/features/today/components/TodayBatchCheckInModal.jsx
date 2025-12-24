/**
 * TodayBatchCheckInModal Component
 * Placeholder for batch check-in functionality.
 */

import Modal from '@/components/ui/Modal';
import TodaySection from './TodaySection';

const TodayBatchCheckInModal = ({ open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose} title="Batch Check-in" className="max-w-4xl">
      <TodaySection className="space-y-4">
        <div className="py-8 text-center">
          <p className="text-[color:var(--bb-color-text-muted)]">
            Batch check-in functionality coming soon in the demo.
          </p>
          <p className="text-sm text-[color:var(--bb-color-text-subtle)] mt-2">
            For now, use the individual Check In buttons on each arrival.
          </p>
        </div>
      </TodaySection>
    </Modal>
  );
};

export default TodayBatchCheckInModal;
