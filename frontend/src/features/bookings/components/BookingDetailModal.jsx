/**
 * Booking Detail Modal - Phase 7 Enterprise Layout
 * Simplified modal-based detail view with token-based styling.
 */

import { X, Calendar, PawPrint, User } from 'lucide-react';
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-[var(--bb-space-4,1rem)]"
      style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
    >
      <div
        className="rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-[var(--bb-space-6,1.5rem)] border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div>
            <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
              <h2
                className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Booking Details
              </h2>
              {booking.status && (
                <Badge variant={getStatusVariant(booking.status)}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)] mt-[var(--bb-space-1,0.25rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-[var(--bb-space-2,0.5rem)] rounded-full transition-colors"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-[var(--bb-space-6,1.5rem)] space-y-[var(--bb-space-4,1rem)]">
          {/* Pet Info */}
          {booking.pet && (
            <div
              className="flex items-center gap-[var(--bb-space-3,0.75rem)] p-[var(--bb-space-4,1rem)] rounded-lg"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--bb-color-accent-soft)',
                  color: 'var(--bb-color-accent)',
                }}
              >
                <PawPrint className="h-5 w-5" />
              </div>
              <div>
                <p
                  className="font-[var(--bb-font-weight-medium,500)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {booking.pet.name || 'Unknown Pet'}
                </p>
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  {booking.pet.breed || 'Unknown breed'}
                </p>
              </div>
            </div>
          )}

          {/* Owner Info */}
          {booking.owner && (
            <div
              className="flex items-center gap-[var(--bb-space-3,0.75rem)] p-[var(--bb-space-4,1rem)] rounded-lg"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--bb-color-purple-soft)',
                  color: 'var(--bb-color-purple)',
                }}
              >
                <User className="h-5 w-5" />
              </div>
              <div>
                <p
                  className="font-[var(--bb-font-weight-medium,500)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {booking.owner.firstName || booking.owner.name || 'Unknown'}
                  {booking.owner.lastName && ` ${booking.owner.lastName}`}
                </p>
                {booking.owner.email && (
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)]"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    {booking.owner.email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Booking Summary */}
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--bb-color-text-muted)' }}>Duration</span>
              <span style={{ color: 'var(--bb-color-text-primary)' }}>
                {duration} {duration === 1 ? 'night' : 'nights'}
              </span>
            </div>
            {booking.totalCents > 0 && (
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--bb-color-text-muted)' }}>Total</span>
                <span
                  className="font-[var(--bb-font-weight-semibold,600)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {formatCurrency(booking.totalCents)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div
              className="p-[var(--bb-space-3,0.75rem)] rounded-lg"
              style={{ backgroundColor: 'var(--bb-color-status-negative-soft)' }}
            >
              <p
                className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-1,0.25rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Notes
              </p>
              <p
                className="text-[var(--bb-font-size-sm,0.875rem)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                {booking.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-[var(--bb-space-3,0.75rem)] p-[var(--bb-space-6,1.5rem)] border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
