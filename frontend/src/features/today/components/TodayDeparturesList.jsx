import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Heart, LogOut, UserX, Phone, Mail, MessageSquare, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';
import { TodayListSkeleton } from './TodaySkeleton';
import { useBookingCheckOutMutation } from '@/features/bookings/api';
import PetQuickActionsDrawer from '@/features/owners/components/PetQuickActionsDrawer';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';

const TodayDeparturesList = ({ departures, isLoading, hasError }) => {
  // Track which bookings are checked out (to hide from list)
  const [checkedOutIds, setCheckedOutIds] = useState(new Set());

  // Filter out checked-out bookings for display count
  const pendingDepartures = departures.filter(b => !checkedOutIds.has(b.id || b.recordId));

  if (isLoading) {
    return (
      <TodayCard className="h-full">
        <TodayListSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard className="h-full" id="departures-section">
      <TodaySection
        title="Today's Departures"
        icon={UserX}
        iconClassName="text-amber-600 dark:text-amber-400"
        badge={<Badge variant="warning">{pendingDepartures.length}</Badge>}
      >
        <ListBody
          items={departures}
          hasError={hasError}
          checkedOutIds={checkedOutIds}
          onCheckOutSuccess={(id) => setCheckedOutIds(prev => new Set([...prev, id]))}
        />
      </TodaySection>
    </TodayCard>
  );
};

const ListBody = ({ items, hasError, checkedOutIds, onCheckOutSuccess }) => {
  if (hasError) {
    return (
      <div
        className="rounded-xl border p-[var(--bb-space-4,1rem)] text-center"
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          color: 'var(--bb-color-status-negative)',
        }}
      >
        <AlertCircle className="mx-auto mb-2 h-6 w-6" />
        <p className="font-medium">Unable to load departures</p>
        <p className="text-sm opacity-80">Please refresh the page</p>
      </div>
    );
  }

  // Filter out already checked-out items
  const pendingItems = items.filter(b => !checkedOutIds.has(b.id || b.recordId));

  if (!pendingItems.length) {
    return (
      <div className="py-[var(--bb-space-10,2.5rem)] text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-900/30" />
          <LogOut className="absolute inset-0 m-auto h-8 w-8 text-amber-500 dark:text-amber-400" />
          <Heart className="absolute -top-1 -right-1 h-5 w-5 text-rose-400" />
        </div>
        <p className="text-[var(--bb-font-size-base,1rem)] font-semibold text-[color:var(--bb-color-text-primary)]">
          {items.length > 0 ? 'All checked out!' : 'No pets departing today'}
        </p>
        <p className="mt-1 text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
          {items.length > 0 ? 'Great job! All departures complete.' : 'Everyone\'s staying cozy!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-2,0.5rem)]">
      {pendingItems.map((booking, idx) => (
        <DepartureRow
          key={booking.id || booking.recordId || idx}
          booking={booking}
          onCheckOutSuccess={onCheckOutSuccess}
        />
      ))}
    </div>
  );
};

const DepartureRow = ({ booking, onCheckOutSuccess }) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showOwnerPopover, setShowOwnerPopover] = useState(false);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const ownerRef = useRef(null);
  const checkOutMutation = useBookingCheckOutMutation();
  const tz = useTimezoneUtils();

  const time = booking.arrivalTime || booking.departureTime || booking.endDate;
  const bookingId = booking.id || booking.recordId;
  const petId = booking.petId || booking.pet?.id || booking.pet?.recordId;
  const petName = booking.petName || booking.pet?.name;
  const petBreed = booking.pet?.breed || booking.petBreed || '';
  const ownerName = booking.ownerName || booking.owner?.name || booking.owner?.firstName
    ? `${booking.owner?.firstName || ''} ${booking.owner?.lastName || ''}`.trim()
    : 'Owner';
  const ownerPhone = booking.ownerPhone || booking.owner?.phone;
  const ownerEmail = booking.ownerEmail || booking.owner?.email;
  const serviceName = typeof booking.service === 'object' ? booking.service?.name : (booking.service || booking.serviceName);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target)) {
        setShowOwnerPopover(false);
      }
    };
    if (showOwnerPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOwnerPopover]);

  const handleCheckOutClick = (e) => {
    e.stopPropagation();
    setShowCheckOutConfirm(true);
  };

  const handleConfirmCheckOut = async () => {
    if (!bookingId) {
      toast.error('Invalid booking');
      setShowCheckOutConfirm(false);
      return;
    }

    setIsCheckingOut(true);
    try {
      await checkOutMutation.mutateAsync({ bookingId });
      toast.success(`${petName} checked out!`);
      onCheckOutSuccess?.(bookingId);
    } catch (error) {
      console.error('Check-out failed:', error);
      toast.error(error?.message || 'Failed to check out');
    } finally {
      setIsCheckingOut(false);
      setShowCheckOutConfirm(false);
    }
  };

  const handlePetClick = (e) => {
    e.stopPropagation();
    if (petId) {
      setSelectedPetId(petId);
    }
  };

  const handleOwnerClick = (e) => {
    e.stopPropagation();
    setShowOwnerPopover(prev => !prev);
  };

  const handleVaxClick = (e) => {
    e.stopPropagation();
    if (petId) {
      setSelectedPetId(petId);
    }
  };

  return (
    <>
      <div
        className="group flex items-center gap-[var(--bb-space-3,0.75rem)] rounded-xl p-[var(--bb-space-3,0.75rem)] transition-all hover:shadow-sm"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <PetAvatar
          pet={booking.pet || { name: petName }}
          size="md"
          showStatus={false}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            {/* Clickable pet name */}
            <button
              type="button"
              onClick={handlePetClick}
              className="truncate text-[var(--bb-font-size-sm,0.875rem)] font-semibold text-[color:var(--bb-color-text-primary)] hover:text-[color:var(--bb-color-accent)] hover:underline transition-colors text-left"
            >
              {petName}
            </button>
            <Badge variant="warning" className="shrink-0 text-xs">
              {time ? tz.formatTime(time) : 'TBD'}
            </Badge>
          </div>

          {/* Clickable owner name with popover */}
          <div className="relative" ref={ownerRef}>
            <button
              type="button"
              onClick={handleOwnerClick}
              className="truncate text-[var(--bb-font-size-xs,0.75rem)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-accent)] hover:underline transition-colors text-left"
            >
              {ownerName}
            </button>

            {/* Owner contact popover */}
            {showOwnerPopover && (
              <OwnerContactPopover
                ownerName={ownerName}
                phone={ownerPhone}
                email={ownerEmail}
                onClose={() => setShowOwnerPopover(false)}
              />
            )}
          </div>

          {(booking.service || booking.serviceName) && (
            <p className="mt-0.5 truncate text-[var(--bb-font-size-xs,0.75rem)] text-[color:var(--bb-color-text-subtle)]">
              {typeof booking.service === 'object' ? booking.service?.name : (booking.service || booking.serviceName)}
            </p>
          )}
        </div>

        {/* Vaccination alert - clickable */}
        {booking.hasExpiringVaccinations && (
          <button
            type="button"
            onClick={handleVaxClick}
            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            title="Click to view vaccination details"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          </button>
        )}

        {/* Check-out button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCheckOutClick}
          disabled={isCheckingOut}
          className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          {isCheckingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogOut className="h-4 w-4 mr-1" />
              Check Out
            </>
          )}
        </Button>
      </div>

      {/* Check-out Confirmation Dialog */}
      {showCheckOutConfirm && (
        <CheckOutConfirmDialog
          petName={petName}
          petBreed={petBreed}
          ownerName={ownerName}
          serviceName={serviceName}
          departureTime={time ? tz.formatTime(time) : 'TBD'}
          isLoading={isCheckingOut}
          onConfirm={handleConfirmCheckOut}
          onCancel={() => setShowCheckOutConfirm(false)}
        />
      )}

      {/* Pet Quick Actions Drawer */}
      <PetQuickActionsDrawer
        petId={selectedPetId}
        isOpen={!!selectedPetId}
        onClose={() => setSelectedPetId(null)}
      />
    </>
  );
};

/**
 * Check-out Confirmation Dialog
 */
const CheckOutConfirmDialog = ({
  petName,
  petBreed,
  ownerName,
  serviceName,
  departureTime,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, isLoading]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ backgroundColor: 'var(--bb-color-bg-surface, #fff)' }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <LogOut className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Check out {petName}?
            </h3>
          </div>

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--bb-color-text-muted)]">Pet</span>
              <span className="font-medium text-[color:var(--bb-color-text-primary)]">
                {petName}{petBreed ? ` (${petBreed})` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--bb-color-text-muted)]">Owner</span>
              <span className="font-medium text-[color:var(--bb-color-text-primary)]">{ownerName}</span>
            </div>
            {serviceName && (
              <div className="flex justify-between">
                <span className="text-[color:var(--bb-color-text-muted)]">Service</span>
                <span className="font-medium text-[color:var(--bb-color-text-primary)]">{serviceName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[color:var(--bb-color-text-muted)]">Departure</span>
              <span className="font-medium text-[color:var(--bb-color-text-primary)]">{departureTime}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking out...
                </>
              ) : (
                'Confirm Check-Out'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Owner Contact Popover - Quick contact actions
 */
const OwnerContactPopover = ({ ownerName, phone, email, onClose }) => {
  const handleCall = () => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
    onClose();
  };

  const handleEmail = () => {
    if (email) {
      window.open(`mailto:${email}`, '_blank');
    }
    onClose();
  };

  const handleSMS = () => {
    if (phone) {
      window.open(`sms:${phone}`, '_self');
    }
    onClose();
  };

  return (
    <div
      className="absolute left-0 top-full mt-1 z-50 w-48 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)]">Contact</p>
        <p className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] truncate">{ownerName}</p>
      </div>

      <div className="py-1">
        <button
          type="button"
          onClick={handleCall}
          disabled={!phone}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Phone className="h-4 w-4 text-emerald-500" />
          <span>{phone || 'No phone'}</span>
        </button>

        <button
          type="button"
          onClick={handleEmail}
          disabled={!email}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="h-4 w-4 text-blue-500" />
          <span className="truncate">{email || 'No email'}</span>
        </button>

        <button
          type="button"
          onClick={handleSMS}
          disabled={!phone}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[color:var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span>Send SMS</span>
        </button>
      </div>
    </div>
  );
};

export default TodayDeparturesList;
