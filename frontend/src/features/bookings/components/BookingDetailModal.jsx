/**
 * Booking Detail Modal - Enterprise Layout with Token-Based Styling
 * Simplified modal-based detail view.
 */

import { X, Calendar, PawPrint, User } from 'lucide-react';
import Modal, { ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  const duration = booking.checkIn && booking.checkOut
    ? Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusVariant = (status) => {
    const variants = {
      CONFIRMED: 'info',
      CHECKED_IN: 'success',
      CHECKED_OUT: 'neutral',
      CANCELLED: 'danger',
      PENDING: 'warning',
    };
    return variants[status] || 'neutral';
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="default"
    >
      {/* Custom Header with Status Badge */}
      <div className="flex items-start justify-between gap-[var(--bb-space-4)] px-[var(--bb-space-6)] py-[var(--bb-space-5)] border-b border-[var(--bb-color-border-subtle)]">
        <div>
          <div className="flex items-center gap-[var(--bb-space-3)]">
            <h2 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              Booking Details
            </h2>
            {booking.status && (
              <Badge variant={getStatusVariant(booking.status)}>
                {booking.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-[var(--bb-space-2)] rounded-full text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <ModalBody className="space-y-[var(--bb-space-4)]">
        {/* Pet Info */}
        {booking.pet && (
          <div className="flex items-center gap-[var(--bb-space-3)] p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                {booking.pet.name || 'Unknown Pet'}
              </p>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                {booking.pet.breed || 'Unknown breed'}
              </p>
            </div>
          </div>
        )}

        {/* Owner Info */}
        {booking.owner && (
          <div className="flex items-center gap-[var(--bb-space-3)] p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-color-purple-soft)] text-[var(--bb-color-purple)]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                {booking.owner.firstName || booking.owner.name || 'Unknown'}
                {booking.owner.lastName && ` ${booking.owner.lastName}`}
              </p>
              {booking.owner.email && (
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {booking.owner.email}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Booking Summary */}
        <div className="space-y-[var(--bb-space-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[var(--bb-color-text-muted)]">Duration</span>
            <span className="text-[var(--bb-color-text-primary)]">
              {duration} {duration === 1 ? 'night' : 'nights'}
            </span>
          </div>
          {booking.totalCents > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--bb-color-text-muted)]">Total</span>
              <span className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                {formatCurrency(booking.totalCents)}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="p-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-warning-soft)]">
            <p className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)] mb-[var(--bb-space-1)]">
              Notes
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
              {booking.notes}
            </p>
          </div>
        )}
      </ModalBody>

      {/* Footer */}
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default BookingDetailModal;
