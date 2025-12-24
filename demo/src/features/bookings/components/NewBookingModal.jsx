/**
 * New Booking Modal - Slideout for creating bookings
 * Uses SlidePanel with BookingSlideoutForm for create flows.
 */

import SlidePanel from '@/components/ui/SlidePanel';
import BookingSlideoutForm from './BookingSlideoutForm';

const NewBookingModal = ({ isOpen, onClose, initialPetId, initialOwnerId, onSuccess }) => {
  const handleSuccess = (booking) => {
    onSuccess?.(booking);
    onClose();
  };

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title="New Booking"
    >
      <div className="p-4">
        <BookingSlideoutForm
          mode="create"
          initialPetId={initialPetId}
          initialOwnerId={initialOwnerId}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </SlidePanel>
  );
};

export default NewBookingModal;
