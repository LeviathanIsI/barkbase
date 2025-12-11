import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, differenceInDays } from 'date-fns';
import {
  Calendar, Plus, Home, Users, Settings, ChevronLeft, ChevronRight,
  RefreshCw, Clock, PawPrint, UserCheck, UserX, AlertCircle, CheckCircle,
  TrendingUp, Brain, CheckSquare, Square, LogIn, LogOut, DollarSign,
  AlertTriangle, BarChart3, Zap, Info, ArrowUpRight, Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import SlidePanel from '@/components/ui/SlidePanel';
import NewBookingModal from '@/features/bookings/components/NewBookingModal';
import BookingDetailModal from '@/features/calendar/components/BookingDetailModal';
import KennelLayoutView from '@/features/calendar/components/KennelLayoutView';
import CheckInOutDashboard from '@/features/calendar/components/CheckInOutDashboard';
import FilterOptionsPanel from '@/features/calendar/components/FilterOptionsPanel';
import { useBookingsQuery } from '@/features/bookings/api';
import { useRunTemplatesQuery } from '@/features/daycare/api-templates';
import { useRunAssignmentsQuery } from '@/features/daycare/api';
import { useTodayStats } from '../hooks/useTodayStats';
import { cn } from '@/lib/cn';

const Schedule = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Modals & panels
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showKennelsPanel, setShowKennelsPanel] = useState(false);
  const [showCheckInOutPanel, setShowCheckInOutPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState(null); // 'pets' | 'checkins' | 'checkouts' | 'occupancy'
  const [filters, setFilters] = useState({
    services: ['boarding', 'daycare', 'grooming'],
    kennels: ['all'],
    status: ['CONFIRMED', 'PENDING', 'CHECKED_IN'],
    highlights: ['check-in-today', 'check-out-today', 'medication-required'],
  });

  // Stats
  const todayStats = useTodayStats(currentDate);

  // Week dates for grid
  const weekStart = startOfWeek(currentDate);
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekStartStr = weekDates[0].toISOString().split('T')[0];
  const weekEndStr = weekDates[6].toISOString().split('T')[0];

  // Data fetching
  const { data: runTemplates = [], isLoading: runsLoading, refetch: refetchRuns } = useRunTemplatesQuery();
  const { data: weekBookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useBookingsQuery({
    startDate: weekStartStr,
    endDate: weekEndStr,
  });

  // Fetch run assignments for the week (from RunAssignment table)
  const { data: runAssignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useRunAssignmentsQuery({
    startDate: weekStartStr,
    endDate: weekEndStr,
  });

  const isLoading = runsLoading || bookingsLoading || assignmentsLoading;

  // Transform runs from templates
  const runs = useMemo(() => {
    // Prefer runs from assignments API if available (includes actual Run records)
    const apiRuns = runAssignmentsData?.runs || [];
    if (apiRuns.length > 0) {
      return apiRuns.map(run => ({
        id: run.id,
        name: run.name,
        type: run.type || 'Standard',
        capacity: run.maxCapacity || 1,
      }));
    }
    // Fall back to run templates
    return runTemplates.map(template => ({
      id: template.recordId,
      name: template.name,
      type: template.type || 'Standard',
      capacity: template.maxCapacity || 1,
    }));
  }, [runTemplates, runAssignmentsData]);

  const totalCapacity = runs.reduce((sum, r) => sum + r.capacity, 0);

  // Process bookings for the week (for stats/compatibility)
  const processedBookings = useMemo(() => {
    return weekBookings
      .filter(booking => booking && (booking.id || booking.recordId))
      .map((booking, index) => ({
      ...booking,
      id: booking.id || booking.recordId || `fallback-${index}`,
      checkInDate: booking.checkIn ? new Date(booking.checkIn) : null,
      checkOutDate: booking.checkOut ? new Date(booking.checkOut) : null,
      petName: booking.pet?.name || 'Unknown',
      ownerName: booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : 'Unknown',
      runId: booking.runTemplateId || booking.runTemplate?.recordId,
    }));
  }, [weekBookings]);

  // Process run assignments for the week grid (from RunAssignment table)
  const processedAssignments = useMemo(() => {
    const assignments = runAssignmentsData?.assignments || [];
    return assignments.map(assignment => {
      // Parse the date from startAt to get the assignment date
      const startDate = assignment.startAt ? new Date(assignment.startAt) : null;
      const dateStr = startDate ? startDate.toISOString().split('T')[0] : null;

      return {
        id: assignment.id,
        runId: assignment.runId,
        runName: assignment.runName,
        petId: assignment.petId,
        petName: assignment.petName || 'Unknown',
        petBreed: assignment.petBreed,
        petSpecies: assignment.petSpecies,
        petPhotoUrl: assignment.petPhotoUrl,
        ownerName: assignment.ownerName || 'Unknown',
        ownerPhone: assignment.ownerPhone,
        bookingId: assignment.bookingId,
        bookingStatus: assignment.bookingStatus,
        bookingCheckIn: assignment.bookingCheckIn,
        bookingCheckOut: assignment.bookingCheckOut,
        bookingTotalCents: assignment.bookingTotalCents || 0,
        kennelId: assignment.kennelId,
        kennelName: assignment.kennelName,
        startAt: assignment.startAt,
        endAt: assignment.endAt,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        status: assignment.status,
        dateStr, // The date this assignment is for
      };
    }).filter(a => a.dateStr); // Only include valid assignments with dates
  }, [runAssignmentsData]);

  // Calculate occupancy per day based on run assignments
  const occupancyByDate = useMemo(() => {
    const map = {};
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      // Count assignments for this date (using RunAssignment data)
      const count = processedAssignments.filter(a => a.dateStr === dateStr).length;
      const pct = totalCapacity > 0 ? Math.round((count / totalCapacity) * 100) : 0;
      map[dateStr] = { count, pct };
    });
    return map;
  }, [weekDates, processedAssignments, totalCapacity]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = processedBookings.filter(b => {
      if (!b.checkInDate || !b.checkOutDate) return false;
      const inStr = b.checkInDate.toISOString().split('T')[0];
      const outStr = b.checkOutDate.toISOString().split('T')[0];
      return today >= inStr && today <= outStr;
    });

    const checkInsToday = processedBookings.filter(b => 
      b.checkInDate?.toISOString().split('T')[0] === today && b.status !== 'CHECKED_IN'
    );
    const checkOutsToday = processedBookings.filter(b => 
      b.checkOutDate?.toISOString().split('T')[0] === today && b.status !== 'CHECKED_OUT'
    );

    const occupancy = totalCapacity > 0 ? Math.round((todayBookings.length / totalCapacity) * 100) : 0;

    // Compare with yesterday (mock delta for now)
    const yesterdayDelta = Math.floor(Math.random() * 5) - 2;

    return {
      petsToday: todayBookings.length,
      petsDelta: yesterdayDelta,
      checkIns: checkInsToday.length,
      checkInsDelta: 0,
      checkOuts: checkOutsToday.length,
      checkOutsDelta: 0,
      occupancy,
      occupancyDelta: 5,
      availableSpots: Math.max(0, totalCapacity - todayBookings.length),
      totalCapacity,
    };
  }, [processedBookings, totalCapacity]);

  // Set document title
  useEffect(() => {
    document.title = "Today's Schedule | BarkBase";
    return () => { document.title = 'BarkBase'; };
  }, []);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetchRuns();
    refetchBookings();
    refetchAssignments();
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    setLastRefreshed(new Date());
  }, [refetchRuns, refetchBookings, refetchAssignments, queryClient]);

  const handleBookingClick = useCallback((bookingOrAssignment) => {
    // Transform run assignment to booking-like shape for the detail modal
    // Run assignments have flat fields (petName, ownerName), bookings have nested objects (pet, owner)
    const normalizedBooking = bookingOrAssignment.pet
      ? bookingOrAssignment // Already a booking with nested objects
      : {
          // Transform flat assignment to booking shape
          // IMPORTANT: Keep bookingId and runAssignmentId separate so we know which is which
          id: bookingOrAssignment.bookingId || bookingOrAssignment.id,
          recordId: bookingOrAssignment.bookingId || bookingOrAssignment.id,
          bookingId: bookingOrAssignment.bookingId || null, // The actual booking ID (may be null for daycare)
          runAssignmentId: bookingOrAssignment.id, // The run assignment ID
          pet: {
            id: bookingOrAssignment.petId,
            recordId: bookingOrAssignment.petId,
            name: bookingOrAssignment.petName || 'Unknown Pet',
            breed: bookingOrAssignment.petBreed || null,
            species: bookingOrAssignment.petSpecies || null,
            photoUrl: bookingOrAssignment.petPhotoUrl,
          },
          owner: {
            id: bookingOrAssignment.ownerId,
            recordId: bookingOrAssignment.ownerId,
            name: bookingOrAssignment.ownerName || 'Unknown',
            phone: bookingOrAssignment.ownerPhone,
          },
          // Use booking dates if available, otherwise use assignment times
          checkIn: bookingOrAssignment.bookingCheckIn || bookingOrAssignment.startAt || bookingOrAssignment.assignedDate,
          checkOut: bookingOrAssignment.bookingCheckOut || bookingOrAssignment.endAt || bookingOrAssignment.assignedDate,
          status: bookingOrAssignment.bookingStatus || bookingOrAssignment.status || 'CONFIRMED',
          kennel: { name: bookingOrAssignment.kennelName || 'Unassigned', id: bookingOrAssignment.kennelId },
          // Use run name as additional context
          runName: bookingOrAssignment.runName,
          runId: bookingOrAssignment.runId,
          totalCents: bookingOrAssignment.bookingTotalCents || 0,
          amountPaidCents: 0, // TODO: fetch actual paid amount if needed
        };
    setSelectedBooking(normalizedBooking);
    setShowBookingModal(true);
  }, []);

  const navigateWeek = useCallback((direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  }, []);

  // Navigate by day for the hourly grid
  const navigateDay = useCallback((direction) => {
    setCurrentDate(prev => addDays(prev, direction));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const formatLastRefreshed = () => {
    const mins = Math.floor((new Date() - lastRefreshed) / 60000);
    if (mins < 1) return 'just now';
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)]">
      {/* Header with Sticky Action Bar */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <PageHeader
              breadcrumbs={[
                { label: 'Operations', href: '/schedule' },
                { label: 'Schedule' }
              ]}
              title="Today's Schedule"
            />
            <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
              Real-time facility operations — see where pets are TODAY, hour by hour
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowKennelsPanel(true)} className="gap-1.5 h-9">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Kennels</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCheckInOutPanel(true)} className="gap-1.5 h-9">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Check-in/out</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(true)} className="gap-1.5 h-9">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button size="sm" onClick={() => setShowNewBookingModal(true)} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 mt-6">
        {/* Today Summary Cards - 4-card status row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={PawPrint}
            label="Pets Today"
            value={stats.petsToday}
            delta={stats.petsDelta}
            variant="primary"
            isActive={activeFilter === 'pets'}
            onClick={() => setActiveFilter(activeFilter === 'pets' ? null : 'pets')}
            tooltip="Total pets currently in facility"
          />
          <StatCard
            icon={UserCheck}
            label="Check-ins Today"
            value={stats.checkIns}
            delta={stats.checkInsDelta}
            variant="success"
            isActive={activeFilter === 'checkins'}
            onClick={() => setActiveFilter(activeFilter === 'checkins' ? null : 'checkins')}
            tooltip="Pets scheduled to arrive today"
          />
          <StatCard
            icon={UserX}
            label="Check-outs Today"
            value={stats.checkOuts}
            delta={stats.checkOutsDelta}
            variant="warning"
            isActive={activeFilter === 'checkouts'}
            onClick={() => setActiveFilter(activeFilter === 'checkouts' ? null : 'checkouts')}
            tooltip="Pets scheduled to depart today"
          />
          <StatCard
            icon={TrendingUp}
            label="Occupancy"
            value={`${stats.occupancy}%`}
            delta={stats.occupancyDelta}
            variant={stats.occupancy >= 90 ? 'danger' : stats.occupancy >= 70 ? 'warning' : 'success'}
            isActive={activeFilter === 'occupancy'}
            onClick={() => setActiveFilter(activeFilter === 'occupancy' ? null : 'occupancy')}
            tooltip={`${stats.availableSpots} of ${stats.totalCapacity} spots available`}
          />
        </div>

        {/* Today's Dashboard - Compact insights block */}
        <TodayDashboard stats={stats} lastRefreshed={formatLastRefreshed()} onRefresh={handleRefresh} isLoading={isLoading} />

        {/* Capacity Alerts - Horizontal card */}
        <CapacityAlerts stats={stats} lastRefreshed={formatLastRefreshed()} />

        {/* Today's Hourly Grid - Shows which pet is WHERE at each HOUR */}
        <DailyHourlyGrid
          runs={runs}
          bookings={processedBookings}
          assignments={processedAssignments}
          currentDate={currentDate}
          isLoading={isLoading}
          onBookingClick={handleBookingClick}
          onNewBooking={(runId, date) => {
            // Could pre-fill the modal here
            setShowNewBookingModal(true);
          }}
          onNavigateDay={navigateDay}
          onGoToToday={goToToday}
        />

        {/* Two-column layout for remaining modules */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Capacity Overview Widget */}
          <CapacityOverview stats={stats} />

          {/* Smart Scheduling Assistant */}
          <SmartSchedulingAssistant stats={stats} />
        </div>

        {/* Daily Operations Checklist */}
        <DailyChecklist bookings={processedBookings} stats={stats} />
      </div>

      {/* Modals */}
      <NewBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
      />

      <BookingDetailModal
        booking={selectedBooking}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <FilterOptionsPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Slide Panels */}
      <SlidePanel
        open={showKennelsPanel}
        onClose={() => setShowKennelsPanel(false)}
        title="Kennel Layout"
      >
        <KennelLayoutView
          currentDate={currentDate}
          onBookingClick={handleBookingClick}
          filters={filters}
        />
      </SlidePanel>

      <SlidePanel
        open={showCheckInOutPanel}
        onClose={() => setShowCheckInOutPanel(false)}
        title="Check-in / Check-out"
      >
        <CheckInOutDashboard
          currentDate={currentDate}
          onBookingClick={handleBookingClick}
        />
      </SlidePanel>
    </div>
  );
};

// Stat Card Component - Compact with delta indicators
const StatCard = ({ icon: Icon, label, value, delta, variant, isActive, onClick, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
      active: 'ring-2 ring-blue-500',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      active: 'ring-2 ring-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
      active: 'ring-2 ring-amber-500',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
      active: 'ring-2 ring-red-500',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={cn(
        'relative flex items-center gap-3 rounded-xl border p-4 transition-all cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5',
        styles.bg,
        styles.border,
        isActive && styles.active
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">
          {value}
        </p>
        {delta !== undefined && delta !== 0 && (
          <p className={cn('text-xs font-medium', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
            {delta > 0 ? '+' : ''}{delta} vs yesterday
          </p>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium shadow-lg z-10"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)', color: 'var(--bb-color-text-primary)', border: '1px solid var(--bb-color-border-subtle)' }}
        >
          {tooltip}
        </div>
      )}
    </button>
  );
};

// Today's Dashboard - Compact 2-row insights block
const TodayDashboard = ({ stats, lastRefreshed, onRefresh, isLoading }) => {
  const today = new Date();

  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
          <h2 className="font-semibold text-[color:var(--bb-color-text-primary)]">
            Today's Dashboard
          </h2>
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">
            {format(today, 'EEEE, MMMM d')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[color:var(--bb-color-text-muted)]">
          <Clock className="h-3 w-3" />
          <span>Updated {lastRefreshed}</span>
          <button type="button" onClick={onRefresh} className="p-1 rounded hover:bg-[color:var(--bb-color-bg-elevated)]">
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricPill label="Total Bookings" value={stats.petsToday} icon={Calendar} />
        <MetricPill label="Capacity" value={`${stats.occupancy}%`} icon={TrendingUp} />
        <MetricPill label="Check-ins" value={stats.checkIns} icon={UserCheck} />
        <MetricPill label="Available" value={stats.availableSpots} icon={Home} />
      </div>
    </div>
  );
};

// Metric Pill - Compact inline metric
const MetricPill = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}>
    <Icon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
    <div>
      <p className="text-xs text-[color:var(--bb-color-text-muted)]">{label}</p>
      <p className="text-sm font-bold text-[color:var(--bb-color-text-primary)]">{value}</p>
    </div>
  </div>
);

// Capacity Alerts - Horizontal alert card
const CapacityAlerts = ({ stats, lastRefreshed }) => {
  const hasAlert = stats.occupancy >= 90;

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        backgroundColor: hasAlert ? 'var(--bb-color-status-warning-soft)' : 'var(--bb-color-status-positive-soft)',
        borderColor: hasAlert ? 'var(--bb-color-status-warning)' : 'var(--bb-color-status-positive)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hasAlert ? (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">High Capacity Alert</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Facility at {stats.occupancy}% — consider limiting new bookings
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">No Capacity Alerts</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {stats.availableSpots} spots available — good availability
                </p>
              </div>
            </>
          )}
        </div>
        <span className="text-xs text-[color:var(--bb-color-text-muted)]">Updated {lastRefreshed}</span>
      </div>
    </div>
  );
};

// Daily Hourly Grid - Shows which pet is WHERE at each HOUR for TODAY
// Rows = Hours (6am-8pm), Columns = Kennels/Runs
const DailyHourlyGrid = ({ runs, bookings, assignments = [], currentDate, isLoading, onBookingClick, onNewBooking, onNavigateDay, onGoToToday }) => {
  const scrollRef = useRef(null);

  // Generate hours array (6am to 8pm = 6-20)
  const hours = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => i + 6); // 6, 7, 8, ... 20
  }, []);

  // Format hour for display
  const formatHour = (hour) => {
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Get current hour for highlighting
  const now = new Date();
  const currentHour = now.getHours();
  const isToday = currentDate.toDateString() === now.toDateString();

  // Get the date string for filtering
  const dateStr = currentDate.toISOString().split('T')[0];

  // Get pets in a kennel/run at a specific hour
  const getPetsForCell = (runId, hour) => {
    // First check run assignments for this run/kennel on this date
    const runAssignments = assignments.filter(a => {
      if (a.runId !== runId || a.dateStr !== dateStr) return false;
      // Check if this assignment covers this hour
      const startHour = a.startAt ? new Date(a.startAt).getHours() : 0;
      const endHour = a.endAt ? new Date(a.endAt).getHours() : 23;
      return hour >= startHour && hour <= endHour;
    });

    if (runAssignments.length > 0) return runAssignments;

    // Fall back to bookings assigned to this kennel
    return bookings.filter(b => {
      if (b.runId !== runId) return false;
      if (!b.checkInDate || !b.checkOutDate) return false;
      const checkInStr = b.checkInDate.toISOString().split('T')[0];
      const checkOutStr = b.checkOutDate.toISOString().split('T')[0];
      // Check if booking spans this date
      if (dateStr < checkInStr || dateStr > checkOutStr) return false;
      // For simplicity, if booking spans this day, show it all day
      return true;
    });
  };

  // Calculate occupancy for a run (how many hours it's occupied)
  const getRunOccupancy = (runId) => {
    let occupiedHours = 0;
    hours.forEach(hour => {
      if (getPetsForCell(runId, hour).length > 0) occupiedHours++;
    });
    return Math.round((occupiedHours / hours.length) * 100);
  };

  const dateLabel = format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
          <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Today's Facility Grid</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigateDay(-1)} className="px-2 h-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onGoToToday} className="h-8">Today</Button>
          <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)] min-w-[200px] text-center">{dateLabel}</span>
          <Button variant="ghost" size="sm" onClick={() => onNavigateDay(1)} className="px-2 h-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto" ref={scrollRef}>
        <div style={{ minWidth: `${80 + runs.length * 120}px` }}>
          {/* Column Headers - Kennels/Runs */}
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: `80px repeat(${runs.length}, minmax(100px, 1fr))`,
              backgroundColor: 'var(--bb-color-bg-elevated)',
              borderColor: 'var(--bb-color-border-subtle)'
            }}
          >
            <div className="p-3 font-medium text-sm text-[color:var(--bb-color-text-muted)] sticky left-0 z-10" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
              Time
            </div>
            {runs.map((run) => {
              const occupancy = getRunOccupancy(run.id);
              return (
                <div
                  key={run.id}
                  className="p-2 text-center border-l"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  <div className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">{run.name}</div>
                  <div className="text-xs text-[color:var(--bb-color-text-muted)]">{run.type}</div>
                  <Badge
                    variant={occupancy >= 85 ? 'danger' : occupancy >= 50 ? 'warning' : 'success'}
                    size="sm"
                    className="mt-1"
                  >
                    {occupancy}%
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Hour Rows */}
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingState variant="skeleton" />
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center">
              <Home className="h-8 w-8 text-[color:var(--bb-color-text-muted)] mx-auto mb-2" />
              <p className="text-[color:var(--bb-color-text-muted)]">No kennels or runs configured</p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/settings/objects/facilities">Configure Facility</Link>
              </Button>
            </div>
          ) : (
            hours.map((hour) => {
              const isCurrentHour = isToday && hour === currentHour;
              return (
                <div
                  key={hour}
                  className="grid border-b last:border-b-0"
                  style={{
                    gridTemplateColumns: `80px repeat(${runs.length}, minmax(100px, 1fr))`,
                    borderColor: 'var(--bb-color-border-subtle)'
                  }}
                >
                  {/* Hour Label - Sticky */}
                  <div
                    className={cn(
                      'p-2 sticky left-0 z-10 border-r flex items-center justify-center',
                      isCurrentHour && 'bg-[color:var(--bb-color-accent-soft)]'
                    )}
                    style={{
                      backgroundColor: isCurrentHour ? undefined : 'var(--bb-color-bg-surface)',
                      borderColor: 'var(--bb-color-border-subtle)'
                    }}
                  >
                    <span className={cn(
                      'text-sm font-medium',
                      isCurrentHour ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-muted)]'
                    )}>
                      {formatHour(hour)}
                    </span>
                  </div>

                  {/* Kennel/Run Cells */}
                  {runs.map((run) => {
                    const cellPets = getPetsForCell(run.id, hour);
                    const hasPets = cellPets.length > 0;

                    return (
                      <div
                        key={run.id}
                        className={cn(
                          'min-h-[48px] border-l relative transition-colors cursor-pointer',
                          !hasPets && 'hover:bg-[color:var(--bb-color-bg-elevated)]',
                          isCurrentHour && 'bg-[color:var(--bb-color-accent-soft)]'
                        )}
                        style={{
                          backgroundColor: isCurrentHour ? undefined : 'var(--bb-color-bg-body)',
                          borderColor: 'var(--bb-color-border-subtle)',
                        }}
                        onClick={() => hasPets ? onBookingClick(cellPets[0]) : onNewBooking(run.id, currentDate)}
                      >
                        {hasPets ? (
                          <div className="p-1 space-y-0.5 overflow-hidden">
                            {cellPets.slice(0, 2).map((pet, idx) => (
                              <div
                                key={pet.id || idx}
                                className="rounded bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500 px-1.5 py-0.5 overflow-hidden"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookingClick(pet);
                                }}
                              >
                                <p className="text-[10px] font-medium text-blue-800 dark:text-blue-200 truncate">
                                  {pet.petName}
                                </p>
                              </div>
                            ))}
                            {cellPets.length > 2 && (
                              <p className="text-[9px] text-center text-blue-600 dark:text-blue-300 font-medium">
                                +{cellPets.length - 2} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Plus className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Capacity Overview Widget
const CapacityOverview = ({ stats }) => {
  const getThresholdLabel = (pct) => {
    if (pct >= 90) return { label: 'Critical', color: 'text-red-600' };
    if (pct >= 70) return { label: 'High', color: 'text-amber-600' };
    return { label: 'Normal', color: 'text-emerald-600' };
  };

  const threshold = getThresholdLabel(stats.occupancy);

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Capacity Overview</h3>
      </div>

      {/* Visual Capacity Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">Current Utilization</span>
          <span className={cn('text-lg font-bold', threshold.color)}>{stats.occupancy}%</span>
        </div>
        <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <div
            className={cn(
              'h-full rounded-full transition-all',
              stats.occupancy >= 90 ? 'bg-red-500' : stats.occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
            )}
            style={{ width: `${Math.min(stats.occupancy, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[color:var(--bb-color-text-muted)]">
          <span>Normal</span>
          <span>70%</span>
          <span>90%</span>
          <span>Full</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-[color:var(--bb-color-text-muted)]">Status:</span>
        <Badge variant={stats.occupancy >= 90 ? 'danger' : stats.occupancy >= 70 ? 'warning' : 'success'}>
          {threshold.label}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Optimize
        </Button>
        <Button variant="ghost" size="sm" className="text-xs">
          <BarChart3 className="h-3 w-3 mr-1" />
          Analytics
        </Button>
      </div>
    </div>
  );
};

// Smart Scheduling Assistant
const SmartSchedulingAssistant = ({ stats }) => {
  const insights = useMemo(() => {
    const list = [];

    if (stats.occupancy >= 90) {
      list.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High Capacity',
        message: `At ${stats.occupancy}% capacity — consider limiting new bookings`,
      });
    } else if (stats.occupancy < 50) {
      list.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Good Availability',
        message: `${stats.availableSpots} spots open — great time to accept new bookings`,
      });
    }

    if (stats.checkIns > 0) {
      list.push({
        type: 'info',
        icon: Info,
        title: 'Pending Check-ins',
        message: `${stats.checkIns} guest${stats.checkIns > 1 ? 's' : ''} arriving — ensure kennels are ready`,
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'success',
        icon: CheckCircle,
        title: 'All Systems Optimal',
        message: 'No scheduling recommendations at this time',
      });
    }

    return list;
  }, [stats]);

  const variantStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-200',
  };

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Smart Scheduling Assistant</h3>
      </div>

      <div className="space-y-2">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div key={idx} className={cn('flex items-start gap-2 rounded-lg border p-3', variantStyles[insight.type])}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs opacity-80">{insight.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Daily Checklist
const DailyChecklist = ({ bookings, stats }) => {
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const today = new Date().toISOString().split('T')[0];

  const tasks = useMemo(() => {
    const list = [];

    // Check-ins
    bookings
      .filter(b => b.checkInDate?.toISOString().split('T')[0] === today && b.status !== 'CHECKED_IN')
      .forEach(b => {
        list.push({
          id: `checkin-${b.id}`,
          icon: LogIn,
          label: `Check in ${b.petName} (${b.ownerName})`,
          priority: 'high',
        });
      });

    // Check-outs
    bookings
      .filter(b => b.checkOutDate?.toISOString().split('T')[0] === today && b.status !== 'CHECKED_OUT')
      .forEach(b => {
        list.push({
          id: `checkout-${b.id}`,
          icon: LogOut,
          label: `Check out ${b.petName} (${b.ownerName})`,
          priority: 'high',
        });
      });

    // Routine tasks
    if (stats.petsToday > 0) {
      list.push({ id: 'morning-feed', icon: Clock, label: 'Complete morning feeding round', priority: 'medium' });
      list.push({ id: 'facility-check', icon: CheckSquare, label: 'Inspect all kennels', priority: 'medium' });
    }

    return list;
  }, [bookings, stats, today]);

  const toggleTask = (id) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const completedCount = tasks.filter(t => completedTasks.has(t.id)).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 100;

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Daily Operations Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">{completedCount}/{tasks.length} done</span>
          <span className="text-lg font-bold text-emerald-600">{progressPct}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full mb-4" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6 text-[color:var(--bb-color-text-muted)]">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tasks scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => {
            const Icon = task.icon;
            const done = completedTasks.has(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg p-2 transition-colors',
                  done ? 'opacity-60' : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
              >
                {done ? (
                  <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-[color:var(--bb-color-text-muted)] shrink-0" />
                )}
                <Icon className="h-4 w-4 text-[color:var(--bb-color-text-muted)] shrink-0" />
                <span className={cn('text-sm text-left flex-1', done && 'line-through text-[color:var(--bb-color-text-muted)]')}>
                  {task.label}
                </span>
                {task.priority === 'high' && !done && (
                  <Badge variant="danger" size="sm">Priority</Badge>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Add Task CTA */}
      <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Add Task
      </Button>
    </div>
  );
};

export default Schedule;
