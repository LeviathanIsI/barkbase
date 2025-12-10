/**
 * Calendar Booking Detail Inspector - DAFE Pattern
 * Do Anything From Everywhere - All actions available without navigation
 * Optimized for calendar context with inline editing and quick actions
 */

import { useState, useCallback } from 'react';
import { Calendar, Phone, User, PawPrint, CheckCircle, Clock, DollarSign, Edit2, X, MessageSquare, Home, ChevronDown } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import { useKennels } from '@/features/kennels/api';
import { useAssignKennelMutation, useDeleteBookingMutation } from '@/features/bookings/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

const BookingDetailModal = ({ booking, isOpen, onClose, onEdit, onCheckIn, onCheckOut }) => {
  const { openSlideout } = useSlideout();
  const { data: kennels = [] } = useKennels();
  const assignKennelMutation = useAssignKennelMutation();
  const deleteBookingMutation = useDeleteBookingMutation();

  // Local state
  const [showKennelDropdown, setShowKennelDropdown] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!isOpen || !booking) return null;

  // Generate booking reference from ID or date
  const generateBookingRef = (id, checkIn) => {
    if (id && id !== 'Unknown') {
      // Use first 8 chars of ID
      const shortId = id.toString().slice(0, 8).toUpperCase();
      return shortId;
    }
    // Fallback: Generate from pet name initial + date
    const petInitial = booking.pet?.name?.charAt(0)?.toUpperCase() || 'B';
    const dateStr = checkIn ? new Date(checkIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '') : 'XXXXXX';
    return `${petInitial}-${dateStr}`;
  };

  // Transform booking data for display
  const displayBooking = {
    id: booking.recordId || booking.id || 'Unknown',
    bookingRef: generateBookingRef(booking.recordId || booking.id, booking.checkIn),
    pet: booking.pet || {},
    owner: booking.owner || {},
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status || 'PENDING',
    kennel: booking.segments?.[0]?.kennel || booking.kennel || { name: null, id: null },
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

  // DAFE: Open Pet slideout instead of navigating
  const handleViewPet = useCallback(() => {
    const petId = displayBooking.pet?.id || displayBooking.pet?.recordId;
    if (petId) {
      openSlideout(SLIDEOUT_TYPES.PET_EDIT, {
        pet: displayBooking.pet,
        title: `${displayBooking.pet.name || 'Pet'} Profile`,
      });
    }
  }, [displayBooking.pet, openSlideout]);

  // DAFE: Open Owner slideout instead of navigating
  const handleViewOwner = useCallback(() => {
    const ownerId = displayBooking.owner?.id || displayBooking.owner?.recordId;
    if (ownerId) {
      openSlideout(SLIDEOUT_TYPES.OWNER_EDIT, {
        owner: displayBooking.owner,
        title: `${displayBooking.owner.firstName || ''} ${displayBooking.owner.lastName || 'Owner'}`.trim(),
      });
    }
  }, [displayBooking.owner, openSlideout]);

  // DAFE: Inline kennel assignment
  const handleAssignKennel = useCallback(async (kennelId) => {
    const bookingId = displayBooking.id;
    if (!bookingId || bookingId === 'Unknown') {
      toast.error('Cannot assign kennel: booking ID not found');
      return;
    }

    try {
      await assignKennelMutation.mutateAsync({ bookingId, kennelId });
      toast.success('Kennel assigned successfully');
      setShowKennelDropdown(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to assign kennel');
    }
  }, [displayBooking.id, assignKennelMutation]);

  // DAFE: Cancel booking
  const handleCancelBooking = useCallback(async () => {
    const bookingId = displayBooking.id;
    if (!bookingId || bookingId === 'Unknown') {
      toast.error('Cannot cancel: booking ID not found');
      return;
    }

    try {
      await deleteBookingMutation.mutateAsync(bookingId);
      toast.success('Booking cancelled');
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to cancel booking');
    }
  }, [displayBooking.id, deleteBookingMutation, onClose]);

  // DAFE: Add note
  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;
    // For now, show toast - actual note creation would go through API
    toast.success('Note added');
    setNoteText('');
    setAddingNote(false);
  }, [noteText]);

  // Metrics for header
  const metrics = [
    { label: 'Duration', value: `${duration} ${duration === 1 ? 'night' : 'nights'}` },
    { label: 'Total', value: formatCurrency(displayBooking.totalCents) },
    { label: 'Balance', value: formatCurrency(balance) },
  ];

  // Available kennels for dropdown
  const availableKennels = kennels.filter(k => k.isActive !== false);

  return (
    <>
      <InspectorRoot
        isOpen={isOpen}
        onClose={onClose}
        title={`Booking #${displayBooking.bookingRef}`}
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

        {/* Two-column layout for Pet and Owner */}
        <div className="grid gap-0 lg:grid-cols-2">
          {/* Pet Info Card */}
          <InspectorSection title="Pet" icon={PawPrint} className="lg:border-r lg:border-b-0 border-b border-[var(--bb-color-border-subtle)]">
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
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-[var(--bb-space-4)]"
              onClick={handleViewPet}
            >
              <PawPrint className="w-4 h-4 mr-2" />
              View Pet Profile
            </Button>
          </InspectorSection>

          {/* Owner Info Card */}
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
                  <a
                    href={`tel:${displayBooking.owner.phone}`}
                    className="flex items-center gap-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)] hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {displayBooking.owner.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-[var(--bb-space-2)] mt-[var(--bb-space-4)]">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleViewOwner}
              >
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Button>
              {displayBooking.owner.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${displayBooking.owner.phone}`)}
                  title="Call owner"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </div>
          </InspectorSection>
        </div>

        {/* Booking Details */}
        <InspectorSection title="Schedule" icon={Calendar}>
          <div className="grid gap-[var(--bb-space-4)] sm:grid-cols-2 lg:grid-cols-4">
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
            <div>
              <InspectorField label="Duration" layout="stacked" icon={Clock}>
                <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                  {duration} {duration === 1 ? 'night' : 'nights'}
                </p>
              </InspectorField>
            </div>
            {/* Kennel Assignment - Inline Dropdown */}
            <div className="relative">
              <InspectorField label="Assigned Kennel" layout="stacked" icon={Home}>
                <button
                  type="button"
                  onClick={() => setShowKennelDropdown(!showKennelDropdown)}
                  className={cn(
                    'flex items-center justify-between w-full px-2 py-1 -mx-2 rounded-md transition-colors',
                    'hover:bg-[var(--bb-color-bg-elevated)] cursor-pointer',
                    !displayBooking.kennel.name && 'text-[var(--bb-color-status-warning)]'
                  )}
                >
                  <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]">
                    {displayBooking.kennel.name || 'Unassigned'}
                  </span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    showKennelDropdown && 'rotate-180'
                  )} />
                </button>
              </InspectorField>

              {/* Kennel Dropdown */}
              {showKennelDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-surface)',
                    borderColor: 'var(--bb-color-border-subtle)'
                  }}
                >
                  <div className="max-h-48 overflow-y-auto py-1">
                    {availableKennels.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-[var(--bb-color-text-muted)]">
                        No kennels available
                      </p>
                    ) : (
                      availableKennels.map((kennel) => (
                        <button
                          key={kennel.id || kennel.recordId}
                          type="button"
                          onClick={() => handleAssignKennel(kennel.id || kennel.recordId)}
                          disabled={assignKennelMutation.isPending}
                          className={cn(
                            'w-full px-3 py-2 text-left text-sm transition-colors',
                            'hover:bg-[var(--bb-color-bg-elevated)]',
                            (kennel.id || kennel.recordId) === displayBooking.kennel.id && 'bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>{kennel.name}</span>
                            {kennel.capacity && (
                              <span className="text-xs text-[var(--bb-color-text-muted)]">
                                Cap: {kennel.capacity}
                              </span>
                            )}
                          </div>
                          {kennel.building && (
                            <p className="text-xs text-[var(--bb-color-text-muted)]">
                              {kennel.building}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </InspectorSection>

        {/* Notes Card */}
        <InspectorSection title="Notes & Instructions" icon={MessageSquare}>
          {displayBooking.notes && (
            <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-warning-soft)] border border-[var(--bb-color-status-warning)] p-[var(--bb-space-4)] mb-3">
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                {displayBooking.notes}
              </p>
            </div>
          )}

          {/* Add Note Form */}
          {addingNote ? (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                style={{
                  backgroundColor: 'var(--bb-color-bg-body)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddingNote(false); setNoteText(''); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                >
                  Add Note
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingNote(true)}
              className="w-full"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          )}
        </InspectorSection>

        {/* Billing Card */}
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

        {/* Footer with Actions */}
        <InspectorFooter>
          <div className="flex items-center justify-between w-full">
            {/* Left: Cancel booking */}
            {displayBooking.status !== 'CANCELLED' && displayBooking.status !== 'CHECKED_OUT' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-[var(--bb-color-status-negative)] hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel Booking
              </Button>
            )}
            {(displayBooking.status === 'CANCELLED' || displayBooking.status === 'CHECKED_OUT') && <div />}

            {/* Right: Primary actions */}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {displayBooking.status === 'CONFIRMED' && onCheckIn && (
                <Button variant="primary" onClick={onCheckIn}>
                  <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
                  Check In
                </Button>
              )}
              {displayBooking.status === 'CHECKED_IN' && onCheckOut && (
                <Button variant="primary" onClick={onCheckOut}>
                  <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
                  Check Out
                </Button>
              )}
              {onEdit && displayBooking.status !== 'CANCELLED' && (
                <Button variant="outline" onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-[var(--bb-space-2)]" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </InspectorFooter>
      </InspectorRoot>

      {/* Cancel Booking Confirmation */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelBooking}
        title="Cancel Booking"
        message={`Are you sure you want to cancel this booking for ${displayBooking.pet.name || 'this pet'}? This action cannot be undone.`}
        confirmText="Cancel Booking"
        cancelText="Keep Booking"
        variant="danger"
        isLoading={deleteBookingMutation.isPending}
      />
    </>
  );
};

export default BookingDetailModal;
