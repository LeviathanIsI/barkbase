/**
 * Bookings Page - Demo Version
 * Calendar and list view for managing pet bookings.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  PawPrint,
  Clock,
  Info,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useBookingsQuery, BOOKING_STATUS } from '../api';
import NewBookingModal from '../components/NewBookingModal';
import BookingDetailModal from '../components/BookingDetailModal';

// View modes
const VIEW_MODES = {
  CALENDAR: 'calendar',
  LIST: 'list',
};

// Period modes for calendar
const PERIOD_MODES = {
  WEEK: 'week',
  MONTH: 'month',
};

// Status configuration
const STATUS_CONFIG = {
  [BOOKING_STATUS.PENDING]: { label: 'Pending', variant: 'warning', borderColor: 'border-yellow-500' },
  [BOOKING_STATUS.CONFIRMED]: { label: 'Confirmed', variant: 'info', borderColor: 'border-blue-500' },
  [BOOKING_STATUS.CHECKED_IN]: { label: 'Checked In', variant: 'success', borderColor: 'border-emerald-500' },
  [BOOKING_STATUS.CHECKED_OUT]: { label: 'Checked Out', variant: 'neutral', borderColor: 'border-gray-400' },
  [BOOKING_STATUS.CANCELLED]: { label: 'Cancelled', variant: 'danger', borderColor: 'border-red-500' },
  [BOOKING_STATUS.NO_SHOW]: { label: 'No Show', variant: 'danger', borderColor: 'border-purple-500' },
};

// Date helpers
const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDateFull = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const Bookings = () => {
  // View state
  const [viewMode, setViewMode] = useState(VIEW_MODES.CALENDAR);
  const [periodMode, setPeriodMode] = useState(PERIOD_MODES.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

  // Modal state
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Fetch bookings
  const { data: bookings = [], isLoading, refetch } = useBookingsQuery();

  // Date range for calendar
  const dateRange = useMemo(() => {
    if (periodMode === PERIOD_MODES.WEEK) {
      const weekStart = getWeekStart(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      // Month view
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const startDay = firstDay.getDay();
      const totalDays = lastDay.getDate();
      const dates = [];

      // Previous month days
      for (let i = startDay - 1; i >= 0; i--) {
        dates.push(addDays(firstDay, -i - 1));
      }
      // Current month days
      for (let i = 0; i < totalDays; i++) {
        dates.push(addDays(firstDay, i));
      }
      // Next month days to complete grid
      const remaining = 42 - dates.length;
      for (let i = 0; i < remaining; i++) {
        dates.push(addDays(lastDay, i + 1));
      }

      return dates;
    }
  }, [currentDate, periodMode]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesPet = booking.petName?.toLowerCase().includes(term);
        const matchesOwner = booking.ownerName?.toLowerCase().includes(term);
        if (!matchesPet && !matchesOwner) return false;
      }

      // Service filter
      if (serviceFilter !== 'all' && booking.serviceType !== serviceFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, searchTerm, serviceFilter]);

  // Group bookings by date for calendar
  const bookingsByDate = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);

      // Add booking to each day it spans
      dateRange.forEach((date) => {
        const dateStr = date.toISOString().split('T')[0];
        if (date >= checkIn && date <= checkOut) {
          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }
          map.get(dateStr).push({
            ...booking,
            isCheckIn: isSameDay(date, checkIn),
            isCheckOut: isSameDay(date, checkOut),
          });
        }
      });
    });

    return map;
  }, [filteredBookings, dateRange]);

  // Navigation
  const navigatePeriod = useCallback(
    (direction) => {
      const days = periodMode === PERIOD_MODES.WEEK ? 7 : 30;
      setCurrentDate((prev) => addDays(prev, direction * days));
    },
    [periodMode]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handlers
  const handleBookingClick = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowBookingDetail(true);
  }, []);

  const handleBookingComplete = useCallback(() => {
    refetch();
  }, [refetch]);

  // Date range display
  const dateRangeDisplay = useMemo(() => {
    if (periodMode === PERIOD_MODES.WEEK) {
      const start = dateRange[0];
      const end = dateRange[6];
      return `${formatDateShort(start)} - ${formatDateShort(end)}, ${end.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }, [currentDate, periodMode, dateRange]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        onSuccess={handleBookingComplete}
      />

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={showBookingDetail}
          onClose={() => {
            setShowBookingDetail(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Main Page */}
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)]">
        {/* Header */}
        <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Operations', href: '/bookings' }, { label: 'Bookings' }]}
            title="Bookings"
          />
          <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
            Manage reservations and view booking schedules
          </p>

          {/* View Toggle */}
          <div className="flex items-center justify-between mt-4">
            <div
              className="flex items-center rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Button
                variant={viewMode === VIEW_MODES.CALENDAR ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(VIEW_MODES.CALENDAR)}
                className={cn(
                  'rounded-none gap-2',
                  viewMode !== VIEW_MODES.CALENDAR && 'bg-[color:var(--bb-color-bg-surface)]'
                )}
              >
                <Calendar className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant={viewMode === VIEW_MODES.LIST ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                className={cn(
                  'rounded-none gap-2',
                  viewMode !== VIEW_MODES.LIST && 'bg-[color:var(--bb-color-bg-surface)]'
                )}
              >
                <List className="h-4 w-4" />
                List View
              </Button>
            </div>

            <Button size="sm" onClick={() => setShowNewBooking(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="sticky top-0 z-20 px-4 py-3 border-b shadow-sm rounded-lg mt-4"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Period + Navigation */}
            <div className="flex items-center gap-2">
              {viewMode === VIEW_MODES.CALENDAR && (
                <>
                  {/* Period Toggle */}
                  <div
                    className="flex items-center rounded-lg border overflow-hidden"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    {Object.entries(PERIOD_MODES).map(([key, value]) => (
                      <Button
                        key={value}
                        variant={periodMode === value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setPeriodMode(value)}
                        className={cn(
                          'rounded-none h-8',
                          periodMode !== value && 'bg-[color:var(--bb-color-bg-body)]'
                        )}
                      >
                        {key.charAt(0) + key.slice(1).toLowerCase()}
                      </Button>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
                    Today
                  </Button>

                  {/* Date Navigation */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePeriod(-1)}
                      className="px-2 h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)] min-w-[180px] text-center">
                      {dateRangeDisplay}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePeriod(1)}
                      className="px-2 h-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {viewMode === VIEW_MODES.LIST && (
                <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                  Today - {formatDateFull(today)}
                </span>
              )}

              {/* Service Filter */}
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="h-8 px-3 text-sm rounded-lg border"
                style={{
                  backgroundColor: 'var(--bb-color-bg-body)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              >
                <option value="all">All Services</option>
                <option value="boarding">Boarding</option>
                <option value="daycare">Daycare</option>
                <option value="grooming">Grooming</option>
              </select>
            </div>

            {/* Right: Search + Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search by pet or owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 rounded-lg border pl-9 pr-4 text-sm"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-body)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                />
              </div>

              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 mt-4">
          {viewMode === VIEW_MODES.CALENDAR ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              {/* Calendar Grid */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                {/* Week Header */}
                <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-xs font-semibold text-center text-[color:var(--bb-color-text-muted)]"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className={cn('grid grid-cols-7', periodMode === PERIOD_MODES.MONTH ? 'grid-rows-6' : '')}>
                  {dateRange.map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayBookings = bookingsByDate.get(dateStr) || [];
                    const isToday = isSameDay(date, today);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'min-h-[100px] border-r border-b p-1.5',
                          isToday && 'bg-[color:var(--bb-color-accent-soft)]',
                          !isCurrentMonth && periodMode === PERIOD_MODES.MONTH && 'opacity-40'
                        )}
                        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                      >
                        {/* Date Header */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              isToday ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-muted)]'
                            )}
                          >
                            {date.getDate()}
                          </span>
                          {dayBookings.length > 0 && (
                            <span className="text-xs text-[color:var(--bb-color-text-muted)]">
                              {dayBookings.length}
                            </span>
                          )}
                        </div>

                        {/* Booking Cards */}
                        <div className="space-y-1">
                          {dayBookings.slice(0, periodMode === PERIOD_MODES.MONTH ? 2 : 4).map((booking) => (
                            <button
                              key={`${booking.id}-${dateStr}`}
                              onClick={() => handleBookingClick(booking)}
                              className={cn(
                                'w-full text-left px-1.5 py-1 rounded text-xs transition-colors',
                                'hover:ring-1 hover:ring-[var(--bb-color-accent)]',
                                'border-l-2',
                                STATUS_CONFIG[booking.status]?.borderColor || 'border-gray-400'
                              )}
                              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                            >
                              <div className="font-medium truncate text-[color:var(--bb-color-text-primary)]">
                                {booking.petName}
                              </div>
                              <div className="flex items-center gap-1">
                                {booking.isCheckIn && (
                                  <Badge variant="success" size="xs">In</Badge>
                                )}
                                {booking.isCheckOut && (
                                  <Badge variant="warning" size="xs">Out</Badge>
                                )}
                              </div>
                            </button>
                          ))}
                          {dayBookings.length > (periodMode === PERIOD_MODES.MONTH ? 2 : 4) && (
                            <div className="text-xs text-[color:var(--bb-color-text-muted)] text-center">
                              +{dayBookings.length - (periodMode === PERIOD_MODES.MONTH ? 2 : 4)} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend Sidebar */}
              <LegendSidebar />
            </div>
          ) : (
            /* List View */
            <ListView
              bookings={filteredBookings}
              isLoading={isLoading}
              onBookingClick={handleBookingClick}
              onNewBooking={() => setShowNewBooking(true)}
            />
          )}
        </div>
      </div>
    </>
  );
};

// Legend Sidebar Component
const LegendSidebar = () => {
  return (
    <div
      className="rounded-xl border p-4 h-fit"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Legend</h3>
      </div>

      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Status Colors
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500" />
            <span className="text-[color:var(--bb-color-text-primary)]">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-500" />
            <span className="text-[color:var(--bb-color-text-primary)]">Checked In</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-yellow-500" />
            <span className="text-[color:var(--bb-color-text-primary)]">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gray-400" />
            <span className="text-[color:var(--bb-color-text-primary)]">Checked Out</span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Badges
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">In</Badge>
            <span className="text-[color:var(--bb-color-text-muted)]">Arrival day</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">Out</Badge>
            <span className="text-[color:var(--bb-color-text-muted)]">Departure day</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Interactions
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
            <span className="text-[color:var(--bb-color-text-muted)]">Click card for details</span>
          </div>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
            <span className="text-[color:var(--bb-color-text-muted)]">New Booking button</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// List View Component
const ListView = ({ bookings, isLoading, onBookingClick, onNewBooking }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-[color:var(--bb-color-text-muted)]" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <Calendar className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
          No bookings found
        </h3>
        <p className="text-[color:var(--bb-color-text-muted)] mb-4">
          Create a new booking to get started
        </p>
        <Button onClick={onNewBooking}>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase">
              Pet
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase">
              Owner
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase">
              Service
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase">
              Dates
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--bb-color-text-muted)] uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.id}
              onClick={() => onBookingClick(booking)}
              className="border-b cursor-pointer hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bb-color-accent-soft)]">
                    <PawPrint className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                      {booking.petName}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                      {booking.petBreed || booking.petSpecies}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-primary)]">
                {booking.ownerName}
              </td>
              <td className="px-4 py-3 text-sm text-[color:var(--bb-color-text-primary)]">
                {booking.serviceName}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-sm text-[color:var(--bb-color-text-primary)]">
                  <Clock className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
                  {formatDateShort(booking.checkIn)} - {formatDateShort(booking.checkOut)}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_CONFIG[booking.status]?.variant || 'neutral'}>
                  {STATUS_CONFIG[booking.status]?.label || booking.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Bookings;
