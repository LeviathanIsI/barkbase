import Modal from '@/components/ui/Modal';
import BatchCheckIn from '@/features/bookings/components/BatchCheckIn';
import TodaySection from './TodaySection';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayBatchCheckInModal = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batch Check-in"
      className="max-w-4xl"
    >
      <TodaySection className="space-y-4">
        <BatchCheckIn />
      </TodaySection>
    </Modal>
  );
};

export default TodayBatchCheckInModal;

