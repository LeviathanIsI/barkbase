/**
 * Booking Detail Modal - Demo Version
 * Slideout panel showing booking details with check-in/out actions.
 */

import { useState, useMemo } from 'react';
import {
  Calendar,
  PawPrint,
  User,
  Clock,
  Phone,
  DollarSign,
  LogIn,
  LogOut,
  CheckCircle,
  X,
} from 'lucide-react';
import SlideoutPanel from '@/components/ui/SlideoutPanel';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useBookingCheckInMutation, useBookingCheckOutMutation, BOOKING_STATUS } from '../api';
import toast from 'react-hot-toast';

// Format currency
const formatCurrency = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Format date
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Format time
const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${minutes} ${suffix}`;
};

// Status config
const STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING]: { label: 'Pending', variant: 'warning' },
  [BOOKING_STATUS.CONFIRMED]: { label: 'Confirmed', variant: 'info' },
  [BOOKING_STATUS.CHECKED_IN]: { label: 'Checked In', variant: 'success' },
  [BOOKING_STATUS.CHECKED_OUT]: { label: 'Checked Out', variant: 'neutral' },
  [BOOKING_STATUS.CANCELLED]: { label: 'Cancelled', variant: 'danger' },
  [BOOKING_STATUS.NO_SHOW]: { label: 'No Show', variant: 'danger' },
};

const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  const [localStatus, setLocalStatus] = useState(null);

  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();

  // Compute display status (local optimistic or from booking)
  const displayStatus = localStatus || booking?.status || BOOKING_STATUS.PENDING;

  // Calculate duration
  const duration = useMemo(() => {
    if (!booking?.checkIn || !booking?.checkOut) return 0;
    const start = new Date(booking.checkIn);
    const end = new Date(booking.checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }, [booking]);

  // Check if check-in is today or past
  const canCheckIn = useMemo(() => {
    if (!booking?.checkIn) return false;
    const checkInDate = new Date(booking.checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkInDate <= today;
  }, [booking]);

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync({ bookingId: booking.id });
      setLocalStatus(BOOKING_STATUS.CHECKED_IN);
      toast.success(`${booking.petName} has been checked in!`);
    } catch (error) {
      toast.error('Failed to check in');
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    try {
      await checkOutMutation.mutateAsync({ bookingId: booking.id });
      setLocalStatus(BOOKING_STATUS.CHECKED_OUT);
      toast.success(`${booking.petName} has been checked out!`);
    } catch (error) {
      toast.error('Failed to check out');
    }
  };

  if (!booking) return null;

  return (
    <SlideoutPanel
      open={isOpen}
      onClose={onClose}
      title={`Booking #${booking.id?.slice(-8)?.toUpperCase() || 'NEW'}`}
      subtitle={`${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {/* Status Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
            }}
          >
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_CONFIG[displayStatus]?.variant || 'neutral'} size="lg">
                {STATUS_CONFIG[displayStatus]?.label || displayStatus}
              </Badge>
              <span className="text-sm text-[color:var(--bb-color-text-muted)]">
                {duration} {duration === 1 ? 'night' : 'nights'}
              </span>
            </div>
            <span className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              {formatCurrency(booking.totalCents || 0)}
            </span>
          </div>

          {/* Check-In/Out Action */}
          {displayStatus === BOOKING_STATUS.CONFIRMED && canCheckIn && (
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
              >
                <LogIn className="w-5 h-5 mr-2" />
                {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
              </Button>
            </div>
          )}

          {displayStatus === BOOKING_STATUS.CHECKED_IN && (
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600"
                size="lg"
                onClick={handleCheckOut}
                disabled={checkOutMutation.isPending}
              >
                <LogOut className="w-5 h-5 mr-2" />
                {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
              </Button>
            </div>
          )}

          {displayStatus === BOOKING_STATUS.CHECKED_OUT && (
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[color:var(--bb-color-bg-elevated)]">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-[color:var(--bb-color-text-muted)]">
                  Completed
                </span>
              </div>
            </div>
          )}

          {/* Pet Section */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
              Pet
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--bb-color-accent-soft)]">
                <PawPrint className="h-6 w-6 text-[color:var(--bb-color-accent)]" />
              </div>
              <div>
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">
                  {booking.petName}
                </p>
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {booking.petBreed || booking.petSpecies || 'Unknown breed'}
                </p>
              </div>
            </div>
          </div>

          {/* Owner Section */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
              Owner
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--bb-color-purple-soft)]">
                <User className="h-6 w-6 text-[color:var(--bb-color-purple)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[color:var(--bb-color-text-primary)]">
                  {booking.ownerName}
                </p>
                {booking.ownerPhone && (
                  <a
                    href={`tel:${booking.ownerPhone}`}
                    className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {booking.ownerPhone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
              Schedule
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[color:var(--bb-color-text-muted)]" />
                  <span className="text-xs text-[color:var(--bb-color-text-muted)]">Check-In</span>
                </div>
                <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                  {formatDate(booking.checkIn)}
                </p>
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {formatTime(booking.checkInTime)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[color:var(--bb-color-text-muted)]" />
                  <span className="text-xs text-[color:var(--bb-color-text-muted)]">Check-Out</span>
                </div>
                <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                  {formatDate(booking.checkOut)}
                </p>
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                  {formatTime(booking.checkOutTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Service Section */}
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
              Service
            </h3>
            <p className="font-medium text-[color:var(--bb-color-text-primary)]">
              {booking.serviceName}
            </p>
            {booking.addons && booking.addons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {booking.addons.map((addon, i) => (
                  <Badge key={i} variant="neutral" size="sm">
                    {addon}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          {booking.notes && (
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
                Special Instructions
              </h3>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
              >
                <p className="text-sm text-[color:var(--bb-color-text-primary)]">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Billing Section */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
              Billing
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">Total</span>
                <span className="font-semibold text-[color:var(--bb-color-text-primary)]">
                  {formatCurrency(booking.totalCents || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[color:var(--bb-color-text-muted)]">Paid</span>
                <span className="text-emerald-500">{formatCurrency(booking.amountPaidCents || 0)}</span>
              </div>
              {(booking.totalCents || 0) - (booking.amountPaidCents || 0) > 0 && (
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  <span className="text-sm font-medium text-[color:var(--bb-color-text-muted)]">
                    Balance Due
                  </span>
                  <span className="font-semibold text-red-500">
                    {formatCurrency((booking.totalCents || 0) - (booking.amountPaidCents || 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </SlideoutPanel>
  );
};

export default BookingDetailModal;
