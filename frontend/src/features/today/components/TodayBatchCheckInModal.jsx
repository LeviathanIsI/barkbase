import Modal from '@/components/ui/Modal';
import BatchCheckIn from '@/features/bookings/components/BatchCheckIn';

// TODO (Today Cleanup B:3): This component will be visually redesigned in the next phase.
const TodayBatchCheckInModal = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batch Check-in"
      className="max-w-4xl"
    >
      <BatchCheckIn />
    </Modal>
  );
};

export default TodayBatchCheckInModal;

