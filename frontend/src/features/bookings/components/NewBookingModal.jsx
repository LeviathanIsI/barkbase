/**
 * New Booking Modal - Phase 15 Slideout Pattern
 * Uses SlideoutPanel for create flows.
 */

import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';

const NewBookingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <SlideoutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New Booking"
      description="Create a new booking with the 4-step process."
      widthClass="max-w-xl"
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
    </SlideoutPanel>
  );
};

export default NewBookingModal;
