import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calendar, Plus, List, ChevronLeft, ChevronRight, Search,
  SlidersHorizontal, RefreshCw, X,
  PawPrint, User, CheckCircle2, Mail, Info,
  Edit, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import SinglePageBookingWizard from '../components/SinglePageBookingWizard';
import BookingDetailModal from '../components/BookingDetailModal';
import { useBookingsQuery, useDeleteBookingMutation } from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// View modes - Calendar and List (NO Run Board - that belongs on Schedule page)
const VIEW_MODES = {
  CALENDAR: 'calendar',
  LIST: 'list',
};

// Date period modes
const PERIOD_MODES = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

// Status color configurations - LEFT BORDER colors only, dark card background
const STATUS_CONFIG = {
  PENDING: { label: 'Pending', variant: 'neutral', borderColor: 'border-l-gray-400' },
  CONFIRMED: { label: 'Reserved', variant: 'info', borderColor: 'border-l-blue-500' },
  CHECKED_IN: { label: 'Checked In', variant: 'success', borderColor: 'border-l-emerald-500' },
  CHECKED_OUT: { label: 'Checked Out', variant: 'neutral', borderColor: 'border-l-gray-500' },
  CANCELLED: { label: 'Cancelled', variant: 'danger', borderColor: 'border-l-red-500' },
  CHECKOUT_TODAY: { label: 'Checkout Today', variant: 'warning', borderColor: 'border-l-yellow-500' },
  OVERDUE: { label: 'Overdue', variant: 'danger', borderColor: 'border-l-red-500' },
  NO_SHOW: { label: 'No Show', variant: 'neutral', borderColor: 'border-l-purple-500' },
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Bookings = () => {
  const [searchParams] = useSearchParams();

  // View state
  const [viewMode, setViewMode] = useState(VIEW_MODES.CALENDAR);
  const [showNewBooking, setShowNewBooking] = useState(searchParams.get('action') === 'new');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [selectedDayBookings, setSelectedDayBookings] = useState(null); // For month view day click

  // Period and date state
  const [periodMode, setPeriodMode] = useState(PERIOD_MODES.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Table state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'checkIn', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Refs
  const filterRef = useRef(null);
  const scrollRef = useRef(null);

  // Calculate date range based on period mode
  const dateRange = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);

    if (periodMode === PERIOD_MODES.DAY) {
      dates.push(new Date(start));
    } else if (periodMode === PERIOD_MODES.WEEK) {
      start.setDate(start.getDate() - start.getDay());
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        dates.push(day);
      }
    } else if (periodMode === PERIOD_MODES.MONTH) {
      // For month view, we need the full calendar grid (including days from prev/next months)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);
      
      // Start from the Sunday of the week containing the 1st
      const startDay = new Date(firstOfMonth);
      startDay.setDate(startDay.getDate() - startDay.getDay());
      
      // End on the Saturday of the week containing the last day
      const endDay = new Date(lastOfMonth);
      endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));
      
      const current = new Date(startDay);
      while (current <= endDay) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  }, [currentDate, periodMode]);

  // Get month boundaries for API query
  const queryDateRange = useMemo(() => {
    if (periodMode === PERIOD_MODES.MONTH) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);
      
      // Expand to include surrounding weeks for the calendar grid
      const startDay = new Date(firstOfMonth);
      startDay.setDate(startDay.getDate() - startDay.getDay());
      const endDay = new Date(lastOfMonth);
      endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));
      
      return {
        startDate: startDay.toISOString().split('T')[0],
        endDate: endDay.toISOString().split('T')[0],
      };
    }
    return {
      startDate: dateRange[0]?.toISOString().split('T')[0],
      endDate: dateRange[dateRange.length - 1]?.toISOString().split('T')[0],
    };
  }, [currentDate, periodMode, dateRange]);

  // Data fetching - only bookings for the Bookings page
  const { data: apiBookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useBookingsQuery(queryDateRange);

  const isLoading = bookingsLoading;

  // Process bookings with computed fields
  const processedBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return apiBookings.map(booking => {
      const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
      const checkOut = booking.checkOut ? new Date(booking.checkOut) : null;

      let displayStatus = booking.status || 'PENDING';

      // Check if overdue (should have checked out but hasn't)
      if (displayStatus === 'CHECKED_IN' && checkOut && checkOut < today) {
        displayStatus = 'OVERDUE';
      }
      // Check if checking out today
      else if (displayStatus === 'CHECKED_IN' && checkOut && checkOut.toDateString() === today.toDateString()) {
        displayStatus = 'CHECKOUT_TODAY';
      }
      // Check if no-show (check-in date passed but never checked in, still CONFIRMED)
      else if (displayStatus === 'CONFIRMED' && checkIn && checkIn < today) {
        displayStatus = 'NO_SHOW';
      }

      const petName = booking.pet?.name || 'Unknown Pet';
      const ownerName = booking.owner
        ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim()
        : 'Unknown Owner';
      const ownerPhone = booking.owner?.phone || '';
      const ownerEmail = booking.owner?.email || '';
      const serviceName = booking.service?.name || 'Boarding';
      // Use kennel_id (the actual DB field) or kennelId (camelCase from API), falling back to runTemplateId for backwards compat
      const runId = booking.kennelId || booking.kennel_id || booking.kennel?.id || booking.runTemplateId || booking.runTemplate?.recordId;

      return {
        ...booking,
        id: booking.recordId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        displayStatus,
        petName,
        ownerName,
        ownerPhone,
        ownerEmail,
        serviceName,
        runId,
      };
    });
  }, [apiBookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return processedBookings.filter(booking => {
      // Search filter
      const matchesSearch = !searchTerm ||
        booking.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

      // Service filter
      const matchesService = serviceFilter === 'all' ||
        booking.serviceName?.toLowerCase().includes(serviceFilter.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        booking.displayStatus === statusFilter;

      return matchesSearch && matchesService && matchesStatus;
    });
  }, [processedBookings, searchTerm, serviceFilter, statusFilter]);

  // Sort bookings for list view
  const sortedBookings = useMemo(() => {
    if (!sortConfig.key) return filteredBookings;

    return [...filteredBookings].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBookings, sortConfig]);

  // Paginate bookings for list view
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedBookings.slice(start, start + pageSize);
  }, [sortedBookings, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedBookings.length / pageSize);

  // Calculate booking data per date (for calendar views)
  const bookingsByDate = useMemo(() => {
    const map = {};

    dateRange.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];

      // Get bookings that span this date
      const bookingsOnDate = filteredBookings.filter(b => {
        if (!b.checkInDate || !b.checkOutDate) return false;
        const checkInStr = b.checkInDate.toISOString().split('T')[0];
        const checkOutStr = b.checkOutDate.toISOString().split('T')[0];
        return dateStr >= checkInStr && dateStr <= checkOutStr;
      });

      const count = bookingsOnDate.length;

      map[dateStr] = {
        bookings: bookingsOnDate,
        count,
      };
    });

    return map;
  }, [dateRange, filteredBookings]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: processedBookings.length,
    checkedIn: processedBookings.filter(b => b.displayStatus === 'CHECKED_IN').length,
    pending: processedBookings.filter(b => b.displayStatus === 'PENDING' || b.displayStatus === 'CONFIRMED').length,
    checkingOutToday: processedBookings.filter(b => b.displayStatus === 'CHECKOUT_TODAY').length,
    overdue: processedBookings.filter(b => b.displayStatus === 'OVERDUE').length,
  }), [processedBookings]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetchBookings();
    toast.success('Refreshed');
  }, [refetchBookings]);

  const navigatePeriod = useCallback((direction) => {
    const newDate = new Date(currentDate);
    if (periodMode === PERIOD_MODES.DAY) {
      newDate.setDate(newDate.getDate() + direction);
    } else if (periodMode === PERIOD_MODES.WEEK) {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  }, [currentDate, periodMode]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleBookingComplete = useCallback(() => {
    setShowNewBooking(false);
    refetchBookings();
  }, [refetchBookings]);

  const handleBookingClick = useCallback((bookingOrAssignment) => {
    // Debug: log what we receive
    console.log('[BookingClick] Raw data:', bookingOrAssignment);
    // Transform run assignment to booking-like shape for the detail modal
    // Run assignments have flat fields (petName, ownerName), bookings have nested objects (pet, owner)
    const normalizedBooking = bookingOrAssignment.pet
      ? bookingOrAssignment // Already a booking with nested objects
      : {
          // Transform flat assignment to booking shape
          id: bookingOrAssignment.bookingId || bookingOrAssignment.id,
          recordId: bookingOrAssignment.bookingId || bookingOrAssignment.id,
          pet: {
            id: bookingOrAssignment.petId,
            name: bookingOrAssignment.petName || 'Unknown Pet',
            breed: bookingOrAssignment.petBreed || null,
            species: bookingOrAssignment.petSpecies || null,
            photoUrl: bookingOrAssignment.petPhotoUrl,
          },
          owner: {
            name: bookingOrAssignment.ownerName || 'Unknown',
            phone: bookingOrAssignment.ownerPhone,
          },
          // Use booking dates if available, otherwise use assignment times
          checkIn: bookingOrAssignment.bookingCheckIn || bookingOrAssignment.startAt || bookingOrAssignment.assignedDate,
          checkOut: bookingOrAssignment.bookingCheckOut || bookingOrAssignment.endAt || bookingOrAssignment.assignedDate,
          status: bookingOrAssignment.bookingStatus || bookingOrAssignment.status || 'CONFIRMED',
          kennel: { name: bookingOrAssignment.kennelName || 'Unassigned' },
          // Use run name as additional context
          runName: bookingOrAssignment.runName,
          totalCents: bookingOrAssignment.bookingTotalCents || 0,
          amountPaidCents: 0, // TODO: fetch actual paid amount if needed
        };
    setSelectedBooking(normalizedBooking);
    setShowBookingDetail(true);
  }, []);

  const handleEmptyCellClick = useCallback((runId, date) => {
    // Pre-populate booking wizard with run and date
    setShowNewBooking(true);
  }, []);

  const handleDayClick = useCallback((date, bookings) => {
    setSelectedDayBookings({ date, bookings });
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedBookings.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedBookings.map(b => b.id)));
    }
  }, [paginatedBookings, selectedRows.size]);

  const handleSelectRow = useCallback((id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setServiceFilter('all');
    setStatusFilter('all');
  }, []);

  const hasActiveFilters = searchTerm || serviceFilter !== 'all' || statusFilter !== 'all';

  // Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, serviceFilter, statusFilter, pageSize]);

  // Format date range display
  const dateRangeDisplay = useMemo(() => {
    if (periodMode === PERIOD_MODES.DAY) {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (periodMode === PERIOD_MODES.WEEK) {
      const weekDates = dateRange.filter(d => d);
      const start = weekDates[0];
      const end = weekDates[weekDates.length - 1];
      if (start && end) {
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return '';
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }, [currentDate, periodMode, dateRange]);

  if (showNewBooking) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => setShowNewBooking(false)} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Bookings
          </Button>
        </div>
        <SinglePageBookingWizard onComplete={handleBookingComplete} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)]">
      {/* Header Section */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <PageHeader
          breadcrumbs={[
            { label: 'Operations', href: '/bookings' },
            { label: 'Bookings' }
          ]}
          title="Bookings"
        />
        <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
          Manage reservations and view booking schedules over time
        </p>

        {/* View Toggle + New Booking */}
        <div className="flex items-center justify-between mt-4">
          {/* View Mode Tabs - Calendar and List View */}
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.CALENDAR)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                viewMode === VIEW_MODES.CALENDAR
                  ? 'bg-[color:var(--bb-color-accent)] text-white'
                  : 'bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
              )}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                viewMode === VIEW_MODES.LIST
                  ? 'bg-[color:var(--bb-color-accent)] text-white'
                  : 'bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
              )}
            >
              <List className="h-4 w-4" />
              List View
            </button>
          </div>

          <Button size="sm" onClick={() => setShowNewBooking(true)} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div
        className="sticky top-0 z-20 px-4 py-3 border-b shadow-sm rounded-lg"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Period + Date Nav */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Toggles */}
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              {Object.entries(PERIOD_MODES).map(([key, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriodMode(value)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    periodMode === value
                      ? 'bg-[color:var(--bb-color-accent)] text-white'
                      : 'bg-[color:var(--bb-color-bg-body)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
                  )}
                >
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Today Button */}
            <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
              Today
            </Button>

            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigatePeriod(-1)} className="px-2 h-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)] min-w-[180px] text-center">
                {dateRangeDisplay}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigatePeriod(1)} className="px-2 h-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Service Filter */}
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-8 rounded-lg border px-2 text-sm"
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

          {/* Center: Results Count */}
          <span className="hidden lg:block text-sm text-[color:var(--bb-color-text-muted)]">
            {isLoading ? 'Loading...' : `${filteredBookings.length} bookings`}
          </span>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
              <input
                type="text"
                placeholder="Search by pet or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 rounded-lg border pl-9 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                style={{
                  backgroundColor: 'var(--bb-color-bg-body)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              />
            </div>

            {/* Filters Button - only show status filter for non-month views */}
            {periodMode !== PERIOD_MODES.MONTH && (
              <div className="relative" ref={filterRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={cn('gap-1.5 h-8', showFilterPanel && 'ring-2 ring-[var(--bb-color-accent)]')}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
                {showFilterPanel && (
                  <FilterPanel
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    onClose={() => setShowFilterPanel(false)}
                    onClear={clearFilters}
                  />
                )}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5 h-8">
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {serviceFilter !== 'all' && (
              <FilterTag label={`Service: ${serviceFilter}`} onRemove={() => setServiceFilter('all')} />
            )}
            {statusFilter !== 'all' && periodMode !== PERIOD_MODES.MONTH && (
              <FilterTag label={`Status: ${STATUS_CONFIG[statusFilter]?.label || statusFilter}`} onRemove={() => setStatusFilter('all')} />
            )}
            {searchTerm && (
              <FilterTag label={`Search: "${searchTerm}"`} onRemove={() => setSearchTerm('')} />
            )}
            <button type="button" onClick={clearFilters} className="text-sm text-[color:var(--bb-color-accent)] hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Content - Two-column layout for calendar views */}
      <div className="flex-1 mt-4">
        {viewMode === VIEW_MODES.CALENDAR ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left: Calendar */}
            <div className="flex flex-col">
              {periodMode === PERIOD_MODES.MONTH ? (
                <MonthCalendarView
                  currentDate={currentDate}
                  dateRange={dateRange}
                  bookingsByDate={bookingsByDate}
                  isLoading={isLoading}
                  onDayClick={handleDayClick}
                  onNewBooking={() => setShowNewBooking(true)}
                />
              ) : (
                <WeeklyCalendarView
                  bookings={filteredBookings}
                  dateRange={dateRange}
                  bookingsByDate={bookingsByDate}
                  isLoading={isLoading}
                  onBookingClick={handleBookingClick}
                  onNewBooking={() => setShowNewBooking(true)}
                />
              )}
            </div>

            {/* Right: Legend Sidebar */}
            <div className="space-y-6">
              <LegendSidebar />
            </div>
          </div>
        ) : (
          /* List view - full width, no sidebar */
          <ListView
            bookings={paginatedBookings}
            sortedBookings={sortedBookings}
            selectedRows={selectedRows}
            sortConfig={sortConfig}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            isLoading={isLoading}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onBookingClick={handleBookingClick}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onNewBooking={() => setShowNewBooking(true)}
          />
        )}
      </div>

      {/* Day Bookings Modal (for month view day click) */}
      {selectedDayBookings && (
        <DayBookingsModal
          date={selectedDayBookings.date}
          bookings={selectedDayBookings.bookings}
          onClose={() => setSelectedDayBookings(null)}
          onBookingClick={(booking) => {
            setSelectedDayBookings(null);
            handleBookingClick(booking);
          }}
          onNewBooking={() => {
            setSelectedDayBookings(null);
            setShowNewBooking(true);
          }}
        />
      )}

      {/* Booking Detail Modal */}
      {showBookingDetail && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={showBookingDetail}
          onClose={() => {
            setShowBookingDetail(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

// Legend Sidebar Component - Always visible sidebar with legend info
const LegendSidebar = () => {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Legend</h3>
      </div>

      {/* Card Border Colors */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Card Border Colors
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">Checked In</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-orange-500 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">Checkout Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-red-500 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-purple-500 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">No Show</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gray-400 shrink-0" />
            <span className="text-[color:var(--bb-color-text-primary)]">Pending / Checked Out</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Badges
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">Check In</Badge>
            <span className="text-[color:var(--bb-color-text-muted)]">Arrival day</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">Check Out</Badge>
            <span className="text-[color:var(--bb-color-text-muted)]">Departure day</span>
          </div>
        </div>
      </div>

      {/* Interactions */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] mb-3">
          Interactions
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-[color:var(--bb-color-text-muted)] shrink-0" />
            <span className="text-[color:var(--bb-color-text-muted)]">Add booking on empty day</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded shrink-0"
              style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
            />
            <span className="text-[color:var(--bb-color-text-muted)]">Today (highlighted)</span>
          </div>
          <div className="flex items-center gap-2">
            <PawPrint className="h-4 w-4 text-[color:var(--bb-color-text-muted)] shrink-0" />
            <span className="text-[color:var(--bb-color-text-muted)]">Click card for details</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Month Calendar View Component
const MonthCalendarView = ({
  currentDate,
  dateRange,
  bookingsByDate,
  isLoading,
  onDayClick,
  onNewBooking,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = currentDate.getMonth();

  // Split dates into weeks (7 days per row)
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < dateRange.length; i += 7) {
      result.push(dateRange.slice(i, i + 7));
    }
    return result;
  }, [dateRange]);

  if (isLoading) {
    return <MonthCalendarSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Calendar Grid */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Rows */}
        <div className="flex-1">
          {weeks.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="grid grid-cols-7 border-b last:border-b-0"
              style={{ borderColor: 'var(--bb-color-border-subtle)', minHeight: '120px' }}
            >
              {week.map((date, dayIdx) => {
                const dateStr = date.toISOString().split('T')[0];
                const dayData = bookingsByDate[dateStr] || { bookings: [], count: 0, percent: 0, colorLevel: 'gray' };
                const isToday = date.toDateString() === today.toDateString();
                const isCurrentMonth = date.getMonth() === currentMonth;

                const colorClasses = {
                  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
                  green: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700',
                  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700',
                  red: 'bg-red-100 dark:bg-red-900/40 text-red-700',
                };

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'relative p-2 transition-colors cursor-pointer hover:bg-[color:var(--bb-color-bg-elevated)] border-r last:border-r-0',
                      !isCurrentMonth && 'opacity-40'
                    )}
                    style={{
                      borderColor: 'var(--bb-color-border-subtle)',
                      backgroundColor: isToday ? 'var(--bb-color-accent-soft)' : undefined,
                    }}
                    onClick={() => onDayClick(date, dayData.bookings)}
                  >
                    {/* Day Number */}
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium',
                          isToday && 'bg-[color:var(--bb-color-accent)] text-white',
                          !isToday && isCurrentMonth && 'text-[color:var(--bb-color-text-primary)]',
                          !isToday && !isCurrentMonth && 'text-[color:var(--bb-color-text-muted)]'
                        )}
                      >
                        {date.getDate()}
                      </span>
                      
                      {/* Utilization Badge */}
                      {dayData.count > 0 && (
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', colorClasses[dayData.colorLevel])}>
                          {dayData.percent}%
                        </span>
                      )}
                    </div>

                    {/* Booking Count */}
                    {dayData.count > 0 && (
                      <div className="text-xs text-[color:var(--bb-color-text-muted)]">
                        {dayData.count} booking{dayData.count !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Booking Preview (first 2-3) */}
                    {dayData.bookings.slice(0, 2).map((booking, idx) => (
                      <div
                        key={booking.id || idx}
                        className="mt-1 text-xs truncate px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bb-color-bg-elevated)',
                          color: 'var(--bb-color-text-primary)',
                        }}
                        title={`${booking.petName} - ${booking.ownerName}`}
                      >
                        {booking.petName}
                      </div>
                    ))}
                    {dayData.bookings.length > 2 && (
                      <div className="mt-1 text-xs text-[color:var(--bb-color-accent)] font-medium">
                        +{dayData.bookings.length - 2} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-[color:var(--bb-color-text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />
          <span>&lt;50% Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500" />
          <span>50-85% Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span>&gt;85% Full</span>
        </div>
      </div>
    </div>
  );
};

// Day Bookings Modal (when clicking a day in month view)
const DayBookingsModal = ({ date, bookings, onClose, onBookingClick, onNewBooking }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-xl shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bookings List */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-[color:var(--bb-color-text-muted)] mx-auto mb-3" />
              <p className="text-[color:var(--bb-color-text-muted)]">No bookings on this day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => {
                const statusConfig = STATUS_CONFIG[booking.displayStatus] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={booking.id}
                    className="p-3 rounded-lg border cursor-pointer transition-colors hover:border-[color:var(--bb-color-accent)]"
                    style={{
                      backgroundColor: 'var(--bb-color-bg-body)',
                      borderColor: 'var(--bb-color-border-subtle)',
                    }}
                    onClick={() => onBookingClick(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bb-color-accent)', color: 'white' }}>
                          <PawPrint className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-[color:var(--bb-color-text-primary)]">{booking.petName}</p>
                          <p className="text-sm text-[color:var(--bb-color-text-muted)]">{booking.ownerName}</p>
                        </div>
                      </div>
                      <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-[color:var(--bb-color-text-muted)]">
                      <span>{booking.serviceName}</span>
                      <span>•</span>
                      <span>
                        {booking.checkInDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                        {booking.checkOutDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Button className="w-full" onClick={onNewBooking}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking for {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Month Calendar Skeleton
const MonthCalendarSkeleton = () => (
  <div className="flex-1">
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      {/* Header */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-3 text-center" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0" style={{ borderColor: 'var(--bb-color-border-subtle)', minHeight: '120px' }}>
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div key={dayIdx} className="p-2 border-r last:border-r-0" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <Skeleton className="h-6 w-6 rounded-full mb-2" />
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Weekly Calendar View Component - Shows bookings as cards across days
const WeeklyCalendarView = ({
  bookings,
  dateRange,
  bookingsByDate,
  isLoading,
  onBookingClick,
  onNewBooking,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get bookings for a specific date, sorted by check-in date
  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings
      .filter(b => {
        if (!b.checkInDate || !b.checkOutDate) return false;
        const checkInStr = b.checkInDate.toISOString().split('T')[0];
        const checkOutStr = b.checkOutDate.toISOString().split('T')[0];
        return dateStr >= checkInStr && dateStr <= checkOutStr;
      })
      .sort((a, b) => a.checkInDate - b.checkInDate);
  };

  if (isLoading) {
    return (
      <div className="flex-1">
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
          <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${dateRange.length}, 1fr)` }}>
            {dateRange.map((_, idx) => (
              <div key={idx} className="p-4">
                <Skeleton className="h-6 w-12 mb-2" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-20 w-full mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Weekly Grid */}
      <div className="flex-1 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
        {/* Day Headers */}
        <div
          className="grid gap-px border-b"
          style={{
            gridTemplateColumns: `repeat(${dateRange.length}, 1fr)`,
            borderColor: 'var(--bb-color-border-subtle)',
            backgroundColor: 'var(--bb-color-border-subtle)'
          }}
        >
          {dateRange.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString();
            const dateStr = date.toISOString().split('T')[0];
            const dayData = bookingsByDate[dateStr] || { count: 0 };

            return (
              <div
                key={idx}
                className="p-3 text-center"
                style={{
                  backgroundColor: isToday ? 'var(--bb-color-accent-soft)' : 'var(--bb-color-bg-elevated)',
                }}
              >
                <div className="text-xs text-[color:var(--bb-color-text-muted)] font-medium uppercase">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={cn(
                  'text-2xl font-bold',
                  isToday ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-primary)]'
                )}>
                  {date.getDate()}
                </div>
                <div className="text-xs text-[color:var(--bb-color-text-muted)]">
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                {dayData.count > 0 && (
                  <div className="mt-1 text-xs font-medium text-[color:var(--bb-color-accent)]">
                    {dayData.count} booking{dayData.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Booking Cards Grid */}
        <div
          className="grid gap-px flex-1"
          style={{
            gridTemplateColumns: `repeat(${dateRange.length}, 1fr)`,
            backgroundColor: 'var(--bb-color-border-subtle)',
            minHeight: '400px'
          }}
        >
          {dateRange.map((date, idx) => {
            const isToday = date.toDateString() === today.toDateString();
            const dayBookings = getBookingsForDate(date);

            return (
              <div
                key={idx}
                className="p-2 flex flex-col gap-1.5 overflow-y-auto"
                style={{
                  backgroundColor: isToday ? 'var(--bb-color-accent-soft)' : 'var(--bb-color-bg-body)',
                  maxHeight: '500px'
                }}
              >
                {dayBookings.length === 0 ? (
                  <div
                    className="flex-1 flex items-center justify-center min-h-[100px] rounded-lg border-2 border-dashed cursor-pointer hover:border-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                    style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    onClick={onNewBooking}
                  >
                    <div className="text-center">
                      <Plus className="h-5 w-5 mx-auto mb-1 text-[color:var(--bb-color-text-muted)]" />
                      <span className="text-xs text-[color:var(--bb-color-text-muted)]">Add booking</span>
                    </div>
                  </div>
                ) : (
                  dayBookings.map((booking) => {
                    const statusConfig = STATUS_CONFIG[booking.displayStatus] || STATUS_CONFIG.PENDING;
                    const isCheckIn = booking.checkInDate?.toDateString() === date.toDateString();
                    const isCheckOut = booking.checkOutDate?.toDateString() === date.toDateString();

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'rounded-lg border-l-4 p-2.5 cursor-pointer transition-all hover:shadow-md',
                          statusConfig.borderColor
                        )}
                        style={{
                          backgroundColor: 'var(--bb-color-bg-elevated)',
                        }}
                        onClick={() => onBookingClick(booking)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <PawPrint className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--bb-color-text-muted)]" />
                              <span className="font-medium text-sm truncate text-[color:var(--bb-color-text-primary)]">{booking.petName}</span>
                            </div>
                            <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate mt-0.5">{booking.ownerName}</p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-[color:var(--bb-color-text-muted)]">{booking.serviceName}</span>
                          {isCheckIn && <Badge variant="success" size="xs">Check In</Badge>}
                          {isCheckOut && <Badge variant="warning" size="xs">Check Out</Badge>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// List View Component
const ListView = ({
  bookings,
  sortedBookings,
  selectedRows,
  sortConfig,
  currentPage,
  pageSize,
  totalPages,
  isLoading,
  onSort,
  onSelectAll,
  onSelectRow,
  onBookingClick,
  onPageChange,
  onPageSizeChange,
  hasActiveFilters,
  onClearFilters,
  onNewBooking,
}) => {
  const columns = [
    { id: 'select', label: '', sortable: false, width: 48 },
    { id: 'pet', label: 'Pet', sortable: true, sortKey: 'petName' },
    { id: 'owner', label: 'Owner', sortable: true, sortKey: 'ownerName' },
    { id: 'run', label: 'Run', sortable: false },
    { id: 'service', label: 'Service', sortable: true, sortKey: 'serviceName' },
    { id: 'dates', label: 'Check In / Out', sortable: true, sortKey: 'checkInDate' },
    { id: 'duration', label: 'Duration', sortable: false },
    { id: 'status', label: 'Status', sortable: true, sortKey: 'displayStatus' },
    { id: 'actions', label: '', sortable: false, width: 80 },
  ];

  if (isLoading) {
    return <ListSkeleton />;
  }

  if (bookings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="flex h-20 w-20 items-center justify-center rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <Calendar className="h-10 w-10 text-[color:var(--bb-color-text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
            {hasActiveFilters ? 'No bookings match your filters' : 'No bookings yet'}
          </h3>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create your first booking to get started.'}
          </p>
          <div className="flex justify-center gap-3">
            {hasActiveFilters && (
              <Button variant="outline" onClick={onClearFilters}>Clear Filters</Button>
            )}
            <Button onClick={onNewBooking}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}>
          <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">{selectedRows.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <CheckCircle2 className="h-3.5 w-3.5" />Check In
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Mail className="h-3.5 w-3.5" />Send Reminder
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-red-500">
              <Trash2 className="h-3.5 w-3.5" />Cancel
            </Button>
          </div>
          <button type="button" onClick={() => onSelectAll()} className="ml-auto text-sm text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 w-full overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderBottom: '2px solid var(--bb-color-border-subtle)' }}>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)] whitespace-nowrap',
                    col.id === 'select' ? 'text-center' : 'text-left',
                    col.sortable && 'cursor-pointer hover:text-[color:var(--bb-color-text-primary)]'
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort(col.sortKey)}
                >
                  {col.id === 'select' ? (
                    <input
                      type="checkbox"
                      checked={selectedRows.size === bookings.length && bookings.length > 0}
                      onChange={onSelectAll}
                      className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon active={sortConfig.key === col.sortKey} direction={sortConfig.direction} />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking, index) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                isSelected={selectedRows.has(booking.id)}
                onSelect={() => onSelectRow(booking.id)}
                onClick={() => onBookingClick(booking)}
                isEven={index % 2 === 0}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 px-6 lg:px-12 border-t mt-4"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border px-2 py-1.5 text-sm"
            style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (<option key={size} value={size}>{size}</option>))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedBookings.length)} of {sortedBookings.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="px-2 h-8">
              <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 h-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium text-[color:var(--bb-color-text-primary)]">{currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-2 h-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="px-2 h-8">
              <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Booking Row Component
const BookingRow = ({ booking, isSelected, onSelect, onClick, isEven }) => {
  const [showActions, setShowActions] = useState(false);
  const statusConfig = STATUS_CONFIG[booking.displayStatus] || STATUS_CONFIG.PENDING;

  const duration = booking.checkInDate && booking.checkOutDate
    ? Math.ceil((booking.checkOutDate - booking.checkInDate) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <tr
      className={cn('transition-colors', isSelected && 'bg-[color:var(--bb-color-accent-soft)]')}
      style={{
        borderBottom: '1px solid var(--bb-color-border-subtle)',
        backgroundColor: !isSelected && isEven ? 'var(--bb-color-bg-surface)' : !isSelected ? 'var(--bb-color-bg-body)' : undefined,
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-gray-300 accent-[var(--bb-color-accent)]"
        />
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--bb-color-accent)', color: 'white' }}>
            <PawPrint className="h-4 w-4" />
          </div>
          <span className="font-medium text-[color:var(--bb-color-text-primary)]">{booking.petName}</span>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <div>
            <div className="text-[color:var(--bb-color-text-primary)]">{booking.ownerName}</div>
            {booking.ownerPhone && (
              <div className="text-xs text-[color:var(--bb-color-text-muted)]">{booking.ownerPhone}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[color:var(--bb-color-text-primary)]">
        {booking.runId ? 'Run Assigned' : '—'}
      </td>
      <td className="px-4 py-3 text-[color:var(--bb-color-text-primary)]">
        {booking.serviceName}
      </td>
      <td className="px-4 py-3">
        <div className="text-[color:var(--bb-color-text-primary)]">
          {booking.checkInDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' → '}
          {booking.checkOutDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </td>
      <td className="px-4 py-3 text-[color:var(--bb-color-text-muted)]">
        {duration} night{duration !== 1 ? 's' : ''}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </td>
      <td className="px-4 py-3 last:pr-6 lg:last:pr-12">
        <div className={cn('flex items-center gap-1 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1.5 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]" title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button type="button" className="p-1.5 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]" title="Edit">
            <Edit className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Sort Icon Component
const SortIcon = ({ active, direction }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
};

// Filter Tag Component
const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)]">
    {label}
    <button type="button" onClick={onRemove} className="hover:bg-[color:var(--bb-color-accent)]/20 rounded-full p-0.5">
      <X className="h-3 w-3" />
    </button>
  </span>
);

// Filter Panel Component
const FilterPanel = ({ statusFilter, onStatusChange, onClose, onClear }) => (
  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border p-4 shadow-lg z-30" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Filters</h3>
      <button type="button" onClick={onClose} className="text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]">
        <X className="h-4 w-4" />
      </button>
    </div>
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Reserved</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKOUT_TODAY">Checking Out Today</option>
          <option value="OVERDUE">Overdue</option>
          <option value="NO_SHOW">No Show</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" onClick={onClear}>Reset</Button>
      <Button size="sm" className="flex-1" onClick={onClose}>Apply</Button>
    </div>
  </div>
);

// List Skeleton Component
const ListSkeleton = () => (
  <div className="flex-1">
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4" style={{ backgroundColor: i % 2 === 0 ? 'var(--bb-color-bg-surface)' : 'var(--bb-color-bg-body)' }}>
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export default Bookings;
