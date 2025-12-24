/**
 * Check-In Page - Demo Version
 * Shows today's arrivals and departures with check-in/out actions.
 */

import { useState } from 'react';
import {
  UserCheck,
  LogOut,
  PawPrint,
  RefreshCw,
  Clock,
  Sparkles,
  Heart,
  AlertCircle,
  CheckCircle,
  Loader2,
  Phone,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  useTodayArrivalsQuery,
  useTodayDeparturesQuery,
  useTodayStatsQuery,
  useBookingCheckInMutation,
  useBookingCheckOutMutation,
} from '../api';
import toast from 'react-hot-toast';

const CheckIn = () => {
  const { data: arrivals = [], isLoading: arrivalsLoading, refetch: refetchArrivals } = useTodayArrivalsQuery();
  const { data: departures = [], isLoading: departuresLoading, refetch: refetchDepartures } = useTodayDeparturesQuery();
  const { data: stats = {} } = useTodayStatsQuery();

  // Track locally checked-in/out IDs for optimistic UI
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [checkedOutIds, setCheckedOutIds] = useState(new Set());

  const handleRefresh = () => {
    refetchArrivals();
    refetchDepartures();
  };

  // Filter out already processed
  const pendingArrivals = arrivals.filter((a) => !checkedInIds.has(a.id));
  const pendingDepartures = departures.filter((d) => !checkedOutIds.has(d.id));

  const isLoading = arrivalsLoading || departuresLoading;

  return (
    <div className="flex flex-col flex-grow w-full">
      {/* Header */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <PageHeader
          breadcrumbs={[{ label: 'Operations', href: '/check-in' }, { label: 'Check-In' }]}
          title="Check-In / Check-Out"
        />
        <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
          Manage today's arrivals and departures
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">Arrivals</p>
              <p className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                {pendingArrivals.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <LogOut className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">Departures</p>
              <p className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                {pendingDepartures.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <PawPrint className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">Currently In</p>
              <p className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                {stats.currentlyInCount || 0}
              </p>
            </div>
          </div>

          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Arrivals Column */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">
                Today's Arrivals
              </h2>
              <Badge variant="success">{pendingArrivals.length}</Badge>
            </div>
          </div>

          {/* List */}
          <div className="p-4">
            {arrivalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            ) : pendingArrivals.length === 0 ? (
              <EmptyArrivals hasCheckedIn={arrivals.length > pendingArrivals.length} />
            ) : (
              <div className="space-y-2">
                {pendingArrivals.map((booking) => (
                  <ArrivalRow
                    key={booking.id}
                    booking={booking}
                    onCheckInSuccess={(id) => setCheckedInIds((prev) => new Set([...prev, id]))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Departures Column */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">
                Today's Departures
              </h2>
              <Badge variant="warning">{pendingDepartures.length}</Badge>
            </div>
          </div>

          {/* List */}
          <div className="p-4">
            {departuresLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            ) : pendingDepartures.length === 0 ? (
              <EmptyDepartures hasCheckedOut={departures.length > pendingDepartures.length} />
            ) : (
              <div className="space-y-2">
                {pendingDepartures.map((booking) => (
                  <DepartureRow
                    key={booking.id}
                    booking={booking}
                    onCheckOutSuccess={(id) => setCheckedOutIds((prev) => new Set([...prev, id]))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Arrival Row Component
const ArrivalRow = ({ booking, onCheckInSuccess }) => {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const checkInMutation = useBookingCheckInMutation();

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkInMutation.mutateAsync({ bookingId: booking.id });
      toast.success(`${booking.petName} checked in!`);
      onCheckInSuccess?.(booking.id);
    } catch (error) {
      toast.error('Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div
      className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:shadow-sm"
      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
    >
      {/* Pet Avatar */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bb-color-accent-soft)]">
        <PawPrint className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[color:var(--bb-color-text-primary)] truncate">
            {booking.petName}
          </span>
          <Badge variant="success" size="sm">
            {formatTime(booking.arrivalTime || booking.checkInTime)}
          </Badge>
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
          {booking.ownerName}
        </p>
        <p className="text-xs text-[color:var(--bb-color-text-subtle)] truncate">
          {booking.serviceName}
        </p>
      </div>

      {/* Vaccination alert */}
      {booking.hasExpiringVaccinations && (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}

      {/* Check-in button */}
      <Button
        size="sm"
        onClick={handleCheckIn}
        disabled={isCheckingIn}
        className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        {isCheckingIn ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-1" />
            Check In
          </>
        )}
      </Button>
    </div>
  );
};

// Departure Row Component
const DepartureRow = ({ booking, onCheckOutSuccess }) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const checkOutMutation = useBookingCheckOutMutation();

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await checkOutMutation.mutateAsync({ bookingId: booking.id });
      toast.success(`${booking.petName} checked out!`);
      onCheckOutSuccess?.(booking.id);
    } catch (error) {
      toast.error('Failed to check out');
    } finally {
      setIsCheckingOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div
        className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:shadow-sm"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        {/* Pet Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <PawPrint className="h-5 w-5 text-amber-600" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[color:var(--bb-color-text-primary)] truncate">
              {booking.petName}
            </span>
            <Badge variant="warning" size="sm">
              {formatTime(booking.departureTime || booking.checkOutTime)}
            </Badge>
          </div>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
            {booking.ownerName}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-subtle)] truncate">
            {booking.serviceName}
          </p>
        </div>

        {/* Check-out button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfirm(true)}
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

      {/* Confirmation Dialog */}
      {showConfirm && (
        <CheckOutConfirmDialog
          petName={booking.petName}
          ownerName={booking.ownerName}
          isLoading={isCheckingOut}
          onConfirm={handleCheckOut}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

// Check-out Confirmation Dialog
const CheckOutConfirmDialog = ({ petName, ownerName, isLoading, onConfirm, onCancel }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-sm mx-4 rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <LogOut className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Check out {petName}?
            </h3>
          </div>

          <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-6">
            Confirm checkout for <span className="font-medium">{petName}</span> (owner: {ownerName})
          </p>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking out...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Empty States
const EmptyArrivals = ({ hasCheckedIn }) => (
  <div className="py-10 text-center">
    <div className="relative mx-auto mb-4 h-16 w-16">
      <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
      <PawPrint className="absolute inset-0 m-auto h-8 w-8 text-emerald-500" />
      <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400" />
    </div>
    <p className="text-base font-semibold text-[color:var(--bb-color-text-primary)]">
      {hasCheckedIn ? 'All checked in!' : 'No arrivals today'}
    </p>
    <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
      {hasCheckedIn ? 'Great job! All arrivals processed.' : 'Enjoy the quiet moment!'}
    </p>
  </div>
);

const EmptyDepartures = ({ hasCheckedOut }) => (
  <div className="py-10 text-center">
    <div className="relative mx-auto mb-4 h-16 w-16">
      <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-900/30" />
      <LogOut className="absolute inset-0 m-auto h-8 w-8 text-amber-500" />
      <Heart className="absolute -top-1 -right-1 h-5 w-5 text-rose-400" />
    </div>
    <p className="text-base font-semibold text-[color:var(--bb-color-text-primary)]">
      {hasCheckedOut ? 'All checked out!' : 'No departures today'}
    </p>
    <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
      {hasCheckedOut ? 'All departures complete.' : "Everyone's staying cozy!"}
    </p>
  </div>
);

// Helper
const formatTime = (time) => {
  if (!time) return 'TBD';

  // Handle time string like "10:00"
  if (typeof time === 'string' && time.includes(':') && !time.includes('T')) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${hour12}:${minutes} ${suffix}`;
  }

  // Handle ISO date string
  try {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'TBD';
  }
};

export default CheckIn;
