import { useState, useRef, useEffect } from 'react';
import { AlertCircle, PawPrint, Sparkles, UserCheck, Phone, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import TodayCard from './TodayCard';
import TodaySection from './TodaySection';
import { TodayListSkeleton } from './TodaySkeleton';
import PetQuickActionsDrawer from '@/features/owners/components/PetQuickActionsDrawer';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout/SlideoutProvider';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';

const TodayArrivalsList = ({ arrivals, isLoading, hasError }) => {
  // Track which bookings are checked in (to hide from list with animation)
  const [checkedInIds, setCheckedInIds] = useState(new Set());

  // Filter out checked-in bookings for display count
  const pendingArrivals = arrivals.filter(b => !checkedInIds.has(b.id || b.recordId));

  if (isLoading) {
    return (
      <TodayCard className="h-full">
        <TodayListSkeleton />
      </TodayCard>
    );
  }

  return (
    <TodayCard className="h-full" id="arrivals-section">
      <TodaySection
        title="Today's Arrivals"
        icon={UserCheck}
        iconClassName="text-emerald-600 dark:text-emerald-400"
        badge={<Badge variant="success">{pendingArrivals.length}</Badge>}
      >
        <ListBody
          items={arrivals}
          hasError={hasError}
          checkedInIds={checkedInIds}
          onCheckInSuccess={(id) => setCheckedInIds(prev => new Set([...prev, id]))}
        />
      </TodaySection>
    </TodayCard>
  );
};

const ListBody = ({ items, hasError, checkedInIds, onCheckInSuccess }) => {
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
        <p className="font-medium">Unable to load arrivals</p>
        <p className="text-sm opacity-80">Please refresh the page</p>
      </div>
    );
  }

  // Filter out already checked-in items
  const pendingItems = items.filter(b => !checkedInIds.has(b.id || b.recordId));

  if (!pendingItems.length) {
    return (
      <div className="py-[var(--bb-space-10,2.5rem)] text-center">
        <div className="relative mx-auto mb-4 h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
          <PawPrint className="absolute inset-0 m-auto h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" />
        </div>
        <p className="text-[var(--bb-font-size-base,1rem)] font-semibold text-[color:var(--bb-color-text-primary)]">
          {items.length > 0 ? 'All checked in!' : 'No pets arriving today'}
        </p>
        <p className="mt-1 text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
          {items.length > 0 ? 'Great job! All arrivals are checked in.' : 'Chill day ahead!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-2,0.5rem)]">
      {pendingItems.map((booking, idx) => (
        <ArrivalRow
          key={booking.id || booking.recordId || idx}
          booking={booking}
          onCheckInSuccess={onCheckInSuccess}
        />
      ))}
    </div>
  );
};

const ArrivalRow = ({ booking, onCheckInSuccess }) => {
  const [showOwnerPopover, setShowOwnerPopover] = useState(false);
  const [showVaxDetails, setShowVaxDetails] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const ownerRef = useRef(null);
  const { openSlideout } = useSlideout();
  const tz = useTimezoneUtils();

  const time = booking.arrivalTime || booking.departureTime || booking.startDate;
  const bookingId = booking.id || booking.recordId;
  const petId = booking.petId || booking.pet?.id || booking.pet?.recordId;
  const petName = booking.petName || booking.pet?.name;
  const ownerName = booking.ownerName || booking.owner?.name || booking.owner?.firstName
    ? `${booking.owner?.firstName || ''} ${booking.owner?.lastName || ''}`.trim()
    : 'Owner';
  const ownerPhone = booking.ownerPhone || booking.owner?.phone;
  const ownerEmail = booking.ownerEmail || booking.owner?.email;

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

  const handleCheckIn = (e) => {
    e.stopPropagation();
    if (!bookingId) {
      toast.error('Invalid booking');
      return;
    }

    // Open the check-in slideout modal
    openSlideout(SLIDEOUT_TYPES.BOOKING_CHECK_IN, {
      bookingId,
      booking,
      onSuccess: () => {
        onCheckInSuccess?.(bookingId);
      },
    });
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
    setShowVaxDetails(true);
    // Open pet drawer to vaccination section
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
            <Badge variant="success" className="shrink-0 text-xs">
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

        {/* Check-in button */}
        <Button
          size="sm"
          variant="primary"
          onClick={handleCheckIn}
          className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Check In
        </Button>
      </div>

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

export default TodayArrivalsList;
