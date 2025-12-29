/**
 * KennelAssignDrawer - Slide-out drawer to assign pets/bookings to a kennel
 * Shows all bookings (any status) so users can set up assignments early or move pets
 */

import { useState, useMemo } from 'react';
import { Search, PawPrint, Calendar, User, Check, AlertCircle, ArrowRightLeft, Home } from 'lucide-react';
import Select from 'react-select';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookingsQuery, useAssignKennelMutation } from '@/features/bookings/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { useTimezoneUtils } from '@/lib/timezone';
import { format, addMonths, subDays } from 'date-fns';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    padding: '8px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
};

// Status badge colors
const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CHECKED_IN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CHECKED_OUT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const KennelAssignDrawer = ({ isOpen, onClose, kennel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Calculate date range: 7 days back (catch current stays) to 6 months ahead (catch future bookings)
  // Start date is near today to show current/upcoming bookings, not ancient history
  const dateRange = useMemo(() => {
    const today = new Date();
    return {
      startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
      endDate: format(addMonths(today, 6), 'yyyy-MM-dd'),
    };
  }, []);

  // Fetch bookings within a wide date range to show all assignable bookings
  // Users may want to assign kennels early or move pets between kennels
  const { data: bookings = [], isLoading } = useBookingsQuery(dateRange);

  const assignKennelMutation = useAssignKennelMutation();

  // Filter bookings based on search and status
  // Show ALL bookings so users can assign new ones or move pets between kennels
  const availableBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((booking) => {
      // Exclude cancelled and checked out bookings
      const status = booking.status?.toUpperCase();
      if (status === 'CANCELLED' || status === 'CHECKED_OUT' || status === 'NO_SHOW') {
        return false;
      }

      // Apply status filter
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const petName = (booking.pet?.name || booking.petName || '').toLowerCase();
        const ownerName = (booking.owner?.name || booking.ownerName ||
          `${booking.owner?.firstName || ''} ${booking.owner?.lastName || ''}`.trim()).toLowerCase();

        return petName.includes(search) || ownerName.includes(search);
      }

      return true;
    });
  }, [bookings, kennel?.id, searchTerm, statusFilter]);

  // Separate into: assigned to THIS kennel, assigned to OTHER kennels, and unassigned
  const { assignedHere, assignedElsewhere, unassignedBookings } = useMemo(() => {
    const here = [];
    const elsewhere = [];
    const unassigned = [];

    availableBookings.forEach((booking) => {
      const bookingKennelId = booking.kennelId || booking.kennel?.id;

      if (bookingKennelId === kennel?.id) {
        // Currently assigned to THIS kennel
        here.push(booking);
      } else if (bookingKennelId) {
        // Assigned to a DIFFERENT kennel - can be moved here
        elsewhere.push(booking);
      } else {
        // Not assigned to any kennel
        unassigned.push(booking);
      }
    });

    return { assignedHere: here, assignedElsewhere: elsewhere, unassignedBookings: unassigned };
  }, [availableBookings, kennel?.id]);

  const handleAssign = async (bookingId) => {
    if (!kennel?.id) return;

    try {
      setSelectedBookingId(bookingId);
      await assignKennelMutation.mutateAsync({
        bookingId,
        kennelId: kennel.id,
      });

      toast.success('Pet assigned to kennel');
    } catch (error) {
      toast.error(error.message || 'Failed to assign kennel');
    } finally {
      setSelectedBookingId(null);
    }
  };

  const handleUnassign = async (bookingId) => {
    try {
      setSelectedBookingId(bookingId);
      await assignKennelMutation.mutateAsync({
        bookingId,
        kennelId: null,
      });

      toast.success('Pet unassigned from kennel');
    } catch (error) {
      toast.error(error.message || 'Failed to unassign kennel');
    } finally {
      setSelectedBookingId(null);
    }
  };

  const capacity = kennel?.capacity || kennel?.maxOccupancy || 1;
  const occupied = kennel?.occupied || 0;
  const available = Math.max(0, capacity - occupied);
  const isFull = available <= 0;

  return (
    <SlideOutDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign to ${kennel?.name || 'Kennel'}`}
      subtitle={`${occupied}/${capacity} occupied - ${available} spot${available !== 1 ? 's' : ''} available`}
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Kennel Info */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-surface border border-border">
          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <PawPrint className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-text">{kennel?.name}</h3>
            <p className="text-sm text-muted">{kennel?.building || kennel?.location || 'No location'}</p>
          </div>
          <Badge variant={isFull ? 'danger' : 'success'}>
            {isFull ? 'Full' : `${available} open`}
          </Badge>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by pet or owner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="min-w-[130px]">
            <Select
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'CHECKED_IN', label: 'Checked In' },
              ]}
              value={[{ value: 'ALL', label: 'All Status' }, { value: 'PENDING', label: 'Pending' }, { value: 'CONFIRMED', label: 'Confirmed' }, { value: 'CHECKED_IN', label: 'Checked In' }].find(o => o.value === statusFilter) || null}
              onChange={(opt) => setStatusFilter(opt?.value || 'ALL')}
              isClearable={false}
              isSearchable
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>
        </div>

        {/* Currently Assigned to THIS Kennel */}
        {assignedHere.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              In This Kennel ({assignedHere.length})
            </h4>
            <div className="space-y-2">
              {assignedHere.map((booking) => (
                <BookingCard
                  key={booking.id || booking.recordId}
                  booking={booking}
                  isAssignedHere
                  isLoading={selectedBookingId === (booking.id || booking.recordId)}
                  onAction={() => handleUnassign(booking.id || booking.recordId)}
                  actionLabel="Remove"
                />
              ))}
            </div>
          </div>
        )}

        {/* Not Assigned to Any Kennel */}
        {unassignedBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted" />
              No Kennel Assigned ({unassignedBookings.length})
            </h4>
            <div className="space-y-2">
              {unassignedBookings.map((booking) => (
                <BookingCard
                  key={booking.id || booking.recordId}
                  booking={booking}
                  isLoading={selectedBookingId === (booking.id || booking.recordId)}
                  onAction={() => handleAssign(booking.id || booking.recordId)}
                  actionLabel="Assign"
                  disabled={isFull}
                />
              ))}
            </div>
          </div>
        )}

        {/* Assigned to OTHER Kennels - Can Move Here */}
        {assignedElsewhere.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-500" />
              In Other Kennels ({assignedElsewhere.length})
            </h4>
            <p className="text-xs text-muted mb-3">Move a pet from another kennel to this one</p>
            <div className="space-y-2">
              {assignedElsewhere.map((booking) => (
                <BookingCard
                  key={booking.id || booking.recordId}
                  booking={booking}
                  currentKennel={booking.kennel?.name || booking.kennelName}
                  isLoading={selectedBookingId === (booking.id || booking.recordId)}
                  onAction={() => handleAssign(booking.id || booking.recordId)}
                  actionLabel="Move Here"
                  disabled={isFull}
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && availableBookings.length === 0 && (
          <div className="text-center py-8 text-muted">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm
                ? 'No bookings match your search'
                : 'No active bookings found'}
            </p>
          </div>
        )}

        {/* Full Warning */}
        {isFull && (unassignedBookings.length > 0 || assignedElsewhere.length > 0) && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">This kennel is at full capacity. Remove a pet to make room.</p>
          </div>
        )}
      </div>
    </SlideOutDrawer>
  );
};

// Individual booking card
const BookingCard = ({ booking, isAssignedHere, currentKennel, isLoading, onAction, actionLabel, disabled }) => {
  const tz = useTimezoneUtils();
  const petName = booking.pet?.name || booking.petName || 'Unknown Pet';
  const petBreed = booking.pet?.breed || booking.petBreed || '';
  const ownerName = booking.owner?.name || booking.ownerName ||
    `${booking.owner?.firstName || ''} ${booking.owner?.lastName || ''}`.trim() || 'Unknown Owner';

  const checkIn = booking.checkIn || booking.startDate;
  const checkOut = booking.checkOut || booking.endDate;
  const status = booking.status?.toUpperCase() || 'PENDING';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return tz.formatShortDate(dateStr);
  };

  const statusLabel = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    CHECKED_OUT: 'Checked Out',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isAssignedHere
          ? 'bg-success/5 border-success/20'
          : currentKennel
            ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'
            : 'bg-surface border-border hover:border-primary/30'
      )}
    >
      {/* Pet Avatar */}
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <PawPrint className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text truncate">{petName}</span>
          {petBreed && (
            <span className="text-xs text-muted truncate">({petBreed})</span>
          )}
          <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
            STATUS_COLORS[status] || STATUS_COLORS.PENDING
          )}>
            {statusLabel[status] || status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <User className="h-3 w-3" />
          <span className="truncate">{ownerName}</span>
          {checkIn && checkOut && (
            <>
              <span>•</span>
              <span>{formatDate(checkIn)} - {formatDate(checkOut)}</span>
            </>
          )}
        </div>
        {/* Show current kennel if assigned elsewhere */}
        {currentKennel && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 dark:text-amber-400">
            <Home className="h-3 w-3" />
            <span>Currently in: {currentKennel}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Button
        size="sm"
        variant={isAssignedHere ? 'outline' : currentKennel ? 'secondary' : 'primary'}
        onClick={onAction}
        disabled={disabled || isLoading}
        className="flex-shrink-0"
      >
        {isLoading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          actionLabel
        )}
      </Button>
    </div>
  );
};

export default KennelAssignDrawer;
