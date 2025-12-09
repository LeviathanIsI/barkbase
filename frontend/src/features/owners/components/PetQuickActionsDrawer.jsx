/**
 * PetQuickActionsDrawer - Quick actions drawer for a pet
 * Opens from hover card, shows pet details and quick action buttons
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, PawPrint, Calendar, Syringe, ExternalLink, Bell,
  LogIn, LogOut, User, Scale, Cake, Clock, Check, AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInYears, differenceInMonths } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { usePetQuery } from '@/features/pets/api';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout/SlideoutProvider';
import { useBookingsQuery } from '@/features/bookings/api';

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const years = differenceInYears(new Date(), birthDate);
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''}`;
  const months = differenceInMonths(new Date(), birthDate);
  return `${months} month${months !== 1 ? 's' : ''}`;
};

/**
 * Format weight with unit
 */
const formatWeight = (weight) => {
  if (!weight) return null;
  return `${weight} lbs`;
};

const PetQuickActionsDrawer = ({ petId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();

  // Fetch pet details
  const { data: pet, isLoading: petLoading } = usePetQuery(petId, {
    enabled: isOpen && !!petId,
  });

  // Fetch recent bookings for this pet
  const { data: bookingsData } = useBookingsQuery({
    petId,
    limit: 5,
  });
  const recentBookings = bookingsData?.slice?.(0, 5) || [];

  // Determine if pet has active booking today (for check-in/out)
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayBooking = recentBookings.find(b => {
    const checkIn = b.checkIn || b.startDate;
    const checkOut = b.checkOut || b.endDate;
    return checkIn?.startsWith(today) || checkOut?.startsWith(today);
  });
  const isCheckedIn = todayBooking?.status === 'CHECKED_IN';
  const canCheckIn = todayBooking && !isCheckedIn && todayBooking.status !== 'CHECKED_OUT';
  const canCheckOut = isCheckedIn;

  // Pet info
  const petName = pet?.name || 'Loading...';
  const species = pet?.species?.toUpperCase() || '';
  const breed = pet?.breed || '';
  const speciesBreed = [species, breed].filter(Boolean).join(' - ') || 'Unknown';
  const isActive = pet?.status === 'active' || pet?.status === 'ACTIVE' || pet?.is_active !== false;
  const age = calculateAge(pet?.date_of_birth || pet?.birthdate || pet?.dateOfBirth);
  const weight = formatWeight(pet?.weight);

  // Owner info
  const ownerName = pet?.owner_first_name && pet?.owner_last_name
    ? `${pet.owner_first_name} ${pet.owner_last_name}`
    : pet?.owners?.[0]?.firstName && pet?.owners?.[0]?.lastName
      ? `${pet.owners[0].firstName} ${pet.owners[0].lastName}`
      : null;
  const ownerId = pet?.owner_id || pet?.owners?.[0]?.id || pet?.owners?.[0]?.recordId;

  // Vaccination status
  const hasVaccinationIssue = pet?.vaccinationStatus === 'expiring' ||
    pet?.vaccinationStatus === 'missing' ||
    pet?.hasExpiringVaccinations === true;

  // Handlers
  const handleNewBooking = () => {
    openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, {
      petId: pet?.id || pet?.recordId,
      ownerId,
    });
    onClose();
  };

  const handleAddVaccination = () => {
    // Navigate to pet detail with vaccination tab or open modal
    navigate(`/pets/${petId}?tab=vaccinations&action=add`);
    onClose();
  };

  const handleViewProfile = () => {
    navigate(`/pets/${petId}`);
    onClose();
  };

  const handleSendReminder = () => {
    // Could open communication slideout
    openSlideout(SLIDEOUT_TYPES.COMMUNICATION_CREATE, {
      ownerId,
      petId: pet?.id || pet?.recordId,
      subject: `Reminder for ${petName}`,
    });
    onClose();
  };

  const handleCheckIn = () => {
    // TODO: Implement check-in mutation
    console.log('Check in:', todayBooking?.id);
  };

  const handleCheckOut = () => {
    // TODO: Implement check-out mutation
    console.log('Check out:', todayBooking?.id);
  };

  const handleOwnerClick = () => {
    if (ownerId) {
      navigate(`/customers/${ownerId}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md z-50',
          'animate-in slide-in-from-right duration-300',
          'flex flex-col'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-body)',
          borderLeft: '1px solid var(--bb-color-border-subtle)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            {/* Pet Avatar */}
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
              style={{
                backgroundColor: 'var(--bb-color-bg-elevated)',
                color: 'var(--bb-color-text-muted)',
              }}
            >
              {pet?.name?.[0]?.toUpperCase() || <PawPrint className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                  {petName}
                </h2>
                <Badge variant={isActive ? 'success' : 'neutral'} className="text-xs">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                {speciesBreed}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
          >
            <X className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {petLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--bb-color-text-muted)]" />
            </div>
          ) : (
            <>
              {/* Quick Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
                  Quick Info
                </h3>
                <div className="space-y-2">
                  {ownerName && (
                    <InfoRow
                      icon={User}
                      label="Owner"
                      value={ownerName}
                      onClick={handleOwnerClick}
                      clickable
                    />
                  )}
                  {age && (
                    <InfoRow icon={Cake} label="Age" value={age} />
                  )}
                  {weight && (
                    <InfoRow icon={Scale} label="Weight" value={weight} />
                  )}
                  <InfoRow
                    icon={hasVaccinationIssue ? AlertTriangle : Check}
                    iconColor={hasVaccinationIssue ? 'text-amber-500' : 'text-emerald-500'}
                    label="Vaccinations"
                    value={hasVaccinationIssue ? 'Needs attention' : 'Up to date'}
                  />
                </div>
              </section>

              {/* Quick Actions */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    icon={Calendar}
                    label="New Booking"
                    onClick={handleNewBooking}
                  />
                  <ActionButton
                    icon={Syringe}
                    label="Add Vaccination"
                    onClick={handleAddVaccination}
                  />
                  <ActionButton
                    icon={ExternalLink}
                    label="View Profile"
                    onClick={handleViewProfile}
                  />
                  <ActionButton
                    icon={Bell}
                    label="Send Reminder"
                    onClick={handleSendReminder}
                  />
                  {canCheckIn && (
                    <ActionButton
                      icon={LogIn}
                      label="Check In"
                      onClick={handleCheckIn}
                      variant="success"
                    />
                  )}
                  {canCheckOut && (
                    <ActionButton
                      icon={LogOut}
                      label="Check Out"
                      onClick={handleCheckOut}
                      variant="warning"
                    />
                  )}
                </div>
              </section>

              {/* Recent Activity */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
                  Recent Bookings
                </h3>
                {recentBookings.length > 0 ? (
                  <div className="space-y-2">
                    {recentBookings.map((booking) => (
                      <BookingRow key={booking.id || booking.recordId} booking={booking} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[color:var(--bb-color-text-muted)] py-2">
                    No recent bookings
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewProfile}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
        </div>
      </div>
    </>
  );
};

/**
 * Info row component
 */
const InfoRow = ({ icon: Icon, iconColor, label, value, onClick, clickable }) => (
  <div
    className={cn(
      'flex items-center gap-3 py-1.5',
      clickable && 'cursor-pointer hover:bg-[var(--bb-color-bg-surface)] -mx-2 px-2 rounded'
    )}
    onClick={onClick}
  >
    <Icon className={cn('h-4 w-4', iconColor || 'text-[color:var(--bb-color-text-muted)]')} />
    <span className="text-sm text-[color:var(--bb-color-text-muted)]">{label}</span>
    <span className={cn(
      'text-sm ml-auto text-[color:var(--bb-color-text-primary)]',
      clickable && 'text-[color:var(--bb-color-accent)] hover:underline'
    )}>
      {value}
    </span>
  </div>
);

/**
 * Action button component
 */
const ActionButton = ({ icon: Icon, label, onClick, variant }) => {
  const variantStyles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
    warning: 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors',
        variant ? variantStyles[variant] : 'border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-surface)]'
      )}
      style={!variant ? { color: 'var(--bb-color-text-primary)' } : undefined}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

/**
 * Booking row component
 */
const BookingRow = ({ booking }) => {
  const checkIn = booking.checkIn || booking.startDate || booking.check_in;
  const status = booking.status || 'PENDING';

  const statusVariants = {
    PENDING: 'neutral',
    CONFIRMED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'warning',
  };

  return (
    <div
      className="flex items-center justify-between py-2 px-2 rounded hover:bg-[var(--bb-color-bg-surface)] transition-colors"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <span className="text-sm text-[color:var(--bb-color-text-primary)]">
          {checkIn ? format(new Date(checkIn), 'MMM d, yyyy') : 'No date'}
        </span>
      </div>
      <Badge variant={statusVariants[status] || 'neutral'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    </div>
  );
};

export default PetQuickActionsDrawer;
