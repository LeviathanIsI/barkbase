/**
 * Booking Detail Modal - Enterprise Layout with Token-Based Styling
 * Modal-based detail view with strong header, clear content zones,
 * and token-based styling consistent with the enterprise design system.
 */

import { X, Calendar, Phone, User, PawPrint, CheckCircle, Clock, DollarSign } from 'lucide-react';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  // Transform booking data for display
  const displayBooking = {
    id: booking.recordId || booking.id || 'Unknown',
    pet: booking.pet || {},
    owner: booking.owner || {},
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status || 'PENDING',
    kennel: booking.segments?.[0]?.kennel || { name: 'Unassigned' },
    notes: booking.notes || booking.specialInstructions || null,
    totalCents: booking.totalCents || 0,
    amountPaidCents: booking.amountPaidCents || 0,
  };

  const duration = displayBooking.checkIn && displayBooking.checkOut
    ? Math.ceil((new Date(displayBooking.checkOut) - new Date(displayBooking.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  const balance = displayBooking.totalCents - displayBooking.amountPaidCents;

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

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      {/* Custom Header with Status Badge */}
      <div className="flex items-center justify-between gap-[var(--bb-space-4)] px-[var(--bb-space-6)] py-[var(--bb-space-5)] border-b border-[var(--bb-color-border-subtle)]">
        <div>
          <div className="flex items-center gap-[var(--bb-space-3)]">
            <h2 className="text-[var(--bb-font-size-xl)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              Booking #{displayBooking.id.slice(0, 8)}
            </h2>
            <Badge variant={getStatusVariant(displayBooking.status)}>
              {displayBooking.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
            {formatDate(displayBooking.checkIn)} → {formatDate(displayBooking.checkOut)} • {duration} {duration === 1 ? 'night' : 'nights'}
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
      <ModalBody className="space-y-[var(--bb-space-6)]">
        {/* Two-column layout */}
        <div className="grid gap-[var(--bb-space-6)] lg:grid-cols-2">
          {/* Pet Info Card */}
          <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-4)]">
            <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-3)]">
              <PawPrint className="h-4 w-4 text-[var(--bb-color-accent)]" />
              <h3 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)]">
                Pet
              </h3>
            </div>
            <div className="flex items-center gap-[var(--bb-space-3)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]">
                <PawPrint className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[var(--bb-font-size-md)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                  {displayBooking.pet.name || 'Unknown Pet'}
                </p>
                <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                  {displayBooking.pet.breed || 'Unknown breed'}
                  {displayBooking.pet.age && ` • ${displayBooking.pet.age}`}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-[var(--bb-space-4)]">
              View Pet Profile
            </Button>
          </div>

          {/* Owner Info Card */}
          <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-4)]">
            <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-3)]">
              <User className="h-4 w-4 text-[var(--bb-color-purple)]" />
              <h3 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)]">
                Owner
              </h3>
            </div>
            <div className="flex items-center gap-[var(--bb-space-3)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-purple-soft)] text-[var(--bb-color-purple)]">
                <User className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--bb-font-size-md)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                  {displayBooking.owner.firstName || displayBooking.owner.name || 'Unknown'}
                  {displayBooking.owner.lastName && ` ${displayBooking.owner.lastName}`}
                </p>
                {displayBooking.owner.phone && (
                  <div className="flex items-center gap-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    <Phone className="w-3 h-3" />
                    {displayBooking.owner.phone}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-[var(--bb-space-2)] mt-[var(--bb-space-4)]">
              <Button variant="outline" size="sm" className="flex-1">
                View Profile
              </Button>
              {displayBooking.owner.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${displayBooking.owner.phone}`)}
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] p-[var(--bb-space-4)]">
          <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-4)]">
            <Calendar className="h-4 w-4 text-[var(--bb-color-info)]" />
            <h3 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)]">
              Booking Details
            </h3>
          </div>

          <div className="grid gap-[var(--bb-space-4)] sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem
              icon={Calendar}
              label="Check-In"
              value={formatDate(displayBooking.checkIn)}
              subValue={formatTime(displayBooking.checkIn)}
            />
            <DetailItem
              icon={Calendar}
              label="Check-Out"
              value={formatDate(displayBooking.checkOut)}
              subValue={formatTime(displayBooking.checkOut)}
            />
            <DetailItem
              icon={Clock}
              label="Duration"
              value={`${duration} ${duration === 1 ? 'night' : 'nights'}`}
            />
            <DetailItem
              icon={CheckCircle}
              label="Kennel"
              value={displayBooking.kennel.name || 'Unassigned'}
            />
          </div>
        </div>

        {/* Notes Card */}
        {displayBooking.notes && (
          <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-status-warning-soft)] p-[var(--bb-space-4)]">
            <h3 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)] mb-[var(--bb-space-2)]">
              Special Instructions
            </h3>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
              {displayBooking.notes}
            </p>
          </div>
        )}

        {/* Billing Card */}
        <div className="rounded-[var(--bb-radius-lg)] border border-[var(--bb-color-border-subtle)] p-[var(--bb-space-4)]">
          <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-4)]">
            <DollarSign className="h-4 w-4 text-[var(--bb-color-status-positive)]" />
            <h3 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] uppercase tracking-wide text-[var(--bb-color-text-muted)]">
              Billing
            </h3>
          </div>

          <div className="space-y-[var(--bb-space-2)]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Total</span>
              <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                {formatCurrency(displayBooking.totalCents)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Paid</span>
              <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-status-positive)]">
                {formatCurrency(displayBooking.amountPaidCents)}
              </span>
            </div>
            {balance > 0 && (
              <div className="flex items-center justify-between pt-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)]">
                <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                  Balance Due
                </span>
                <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-status-negative)]">
                  {formatCurrency(balance)}
                </span>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      {/* Footer */}
      <ModalFooter className="justify-between">
        <div className="flex gap-[var(--bb-space-2)]">
          {displayBooking.status === 'CONFIRMED' && (
            <Button variant="primary" size="md">
              <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
              Check In
            </Button>
          )}
          {displayBooking.status === 'CHECKED_IN' && (
            <Button variant="primary" size="md">
              <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
              Check Out
            </Button>
          )}
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

function DetailItem({ icon: Icon, label, value, subValue }) {
  return (
    <div>
      <div className="flex items-center gap-[var(--bb-space-1)] mb-[var(--bb-space-1)]">
        {Icon && <Icon className="h-3 w-3 text-[var(--bb-color-text-muted)]" />}
        <p className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-medium)] uppercase tracking-wide text-[var(--bb-color-text-muted)]">
          {label}
        </p>
      </div>
      <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
        {value}
      </p>
      {subValue && (
        <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
          {subValue}
        </p>
      )}
    </div>
  );
}

export default BookingDetailModal;
