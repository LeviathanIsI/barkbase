/**
 * Booking Detail Inspector - View-only booking details panel
 * Uses the unified Inspector component family for consistent display
 */

import { Calendar, PawPrint, User, CheckCircle, Clock, DollarSign, Phone, Edit2 } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

const BookingDetailModal = ({ booking, isOpen, onClose, onEdit }) => {
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

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
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

  // Compute booking display data
  const displayBooking = {
    id: booking.id || booking.recordId || 'Unknown',
    pet: booking.pet || {},
    owner: booking.owner || {},
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status || 'PENDING',
    kennel: booking.segments?.[0]?.kennel || booking.kennel || { name: 'Unassigned' },
    notes: booking.notes || booking.specialInstructions || null,
    totalCents: booking.totalCents || 0,
    amountPaidCents: booking.amountPaidCents || 0,
  };

  const balance = displayBooking.totalCents - displayBooking.amountPaidCents;

  // Metrics for header
  const metrics = [
    { label: 'Duration', value: `${duration} ${duration === 1 ? 'night' : 'nights'}` },
    { label: 'Total', value: formatCurrency(displayBooking.totalCents) },
    { label: 'Balance', value: formatCurrency(balance) },
  ];

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title={`Booking #${displayBooking.id.toString().slice(0, 8)}`}
      subtitle={`${formatDate(displayBooking.checkIn)} → ${formatDate(displayBooking.checkOut)}`}
      variant="booking"
      size="lg"
    >
      {/* Header with Status and Metrics */}
      <InspectorHeader
        status={displayBooking.status.replace('_', ' ')}
        statusIntent={getStatusVariant(displayBooking.status)}
        metrics={metrics}
      />

      {/* Pet Info */}
      <InspectorSection title="Pet" icon={PawPrint}>
        <div className="flex items-center gap-[var(--bb-space-3)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]">
            <PawPrint className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-[var(--bb-font-size-md)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
              {displayBooking.pet.name || 'Unknown Pet'}
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              {displayBooking.pet.breed || 'Unknown breed'}
              {displayBooking.pet.age && ` • ${displayBooking.pet.age}`}
            </p>
          </div>
          <Button variant="secondary" size="sm">
            View Profile
          </Button>
        </div>
      </InspectorSection>

      {/* Owner Info */}
      <InspectorSection title="Owner" icon={User}>
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
          <div className="flex gap-[var(--bb-space-2)]">
            <Button variant="secondary" size="sm">
              View Profile
            </Button>
            {displayBooking.owner.phone && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => window.open(`tel:${displayBooking.owner.phone}`)}
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </InspectorSection>

      {/* Booking Details */}
      <InspectorSection title="Schedule" icon={Calendar}>
        <div className="grid grid-cols-2 gap-[var(--bb-space-4)]">
          <div>
            <InspectorField label="Check-In" layout="stacked" icon={Calendar}>
              <div>
                <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                  {formatDate(displayBooking.checkIn)}
                </p>
                <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {formatTime(displayBooking.checkIn)}
                </p>
              </div>
            </InspectorField>
          </div>
          <div>
            <InspectorField label="Check-Out" layout="stacked" icon={Calendar}>
              <div>
                <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                  {formatDate(displayBooking.checkOut)}
                </p>
                <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {formatTime(displayBooking.checkOut)}
                </p>
              </div>
            </InspectorField>
          </div>
        </div>
        <div className="mt-[var(--bb-space-3)] pt-[var(--bb-space-3)] border-t border-[var(--bb-color-border-subtle)]">
          <InspectorField label="Assigned Kennel" value={displayBooking.kennel.name || 'Unassigned'} icon={CheckCircle} />
        </div>
      </InspectorSection>

      {/* Notes */}
      {displayBooking.notes && (
        <InspectorSection title="Special Instructions">
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-warning-soft)] border border-[var(--bb-color-status-warning)] p-[var(--bb-space-4)]">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
              {displayBooking.notes}
            </p>
          </div>
        </InspectorSection>
      )}

      {/* Billing */}
      <InspectorSection title="Billing" icon={DollarSign}>
        <div className="space-y-[var(--bb-space-2)]">
          <InspectorField label="Total" layout="grid">
            <span className="font-[var(--bb-font-weight-semibold)]">
              {formatCurrency(displayBooking.totalCents)}
            </span>
          </InspectorField>
          <InspectorField label="Paid" layout="grid">
            <span className="text-[var(--bb-color-status-positive)]">
              {formatCurrency(displayBooking.amountPaidCents)}
            </span>
          </InspectorField>
          {balance > 0 && (
            <div className="pt-[var(--bb-space-2)] border-t border-[var(--bb-color-border-subtle)]">
              <InspectorField label="Balance Due" layout="grid">
                <span className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-status-negative)]">
                  {formatCurrency(balance)}
                </span>
              </InspectorField>
            </div>
          )}
        </div>
      </InspectorSection>

      {/* Footer Actions */}
      <InspectorFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {displayBooking.status === 'CONFIRMED' && (
          <Button variant="primary">
            <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Check In
          </Button>
        )}
        {displayBooking.status === 'CHECKED_IN' && (
          <Button variant="primary">
            <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Check Out
          </Button>
        )}
        {onEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Edit Booking
          </Button>
        )}
      </InspectorFooter>
    </InspectorRoot>
  );
};

export default BookingDetailModal;
