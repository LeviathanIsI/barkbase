import { X } from 'lucide-react';
import Modal, { ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const NewBookingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="New Booking"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>
            Create Booking
          </Button>
        </>
      }
    >
      <div className="text-center py-[var(--bb-space-12)]">
        <div className="text-6xl mb-[var(--bb-space-4)]">➕</div>
        <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
          4-Step Booking Process
        </h3>
        <p className="text-[var(--bb-color-text-muted)]">
          Complete booking workflow with smart defaults coming soon...
        </p>
      </div>
    </Modal>
  );
};

export default NewBookingModal;
