import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { addDays, startOfWeek, format } from 'date-fns';
import {
  Plus, Home, Users, Settings, ChevronRight,
  Clock, PawPrint, UserCheck, UserX, CheckCircle,
  TrendingUp, Brain, Search, LogIn, LogOut,
  AlertTriangle, BarChart3, Zap, Info, Phone, User,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/Card';
import { useTimezoneUtils } from '@/lib/timezone';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import SlidePanel from '@/components/ui/SlidePanel';
import StyledSelect from '@/components/ui/StyledSelect';
import NewBookingModal from '@/features/bookings/components/NewBookingModal';
import BookingDetailModal from '@/features/bookings/components/BookingDetailModal';
import KennelLayoutView from '@/features/calendar/components/KennelLayoutView';
import CheckInOutDashboard from '@/features/calendar/components/CheckInOutDashboard';
import FilterOptionsPanel from '@/features/calendar/components/FilterOptionsPanel';
import { useBookingsQuery, useBookingCheckInMutation, useBookingCheckOutMutation } from '@/features/bookings/api';
import { useRunTemplatesQuery } from '@/features/daycare/api-templates';
import { useRunAssignmentsQuery, useAssignPetsToRunMutation } from '@/features/daycare/api';
import { useTodayStats } from '../hooks/useTodayStats';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

const Schedule = () => {
  const [currentDate, _setCurrentDate] = useState(new Date());

  // Modals & panels
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showKennelsPanel, setShowKennelsPanel] = useState(false);
  const [showCheckInOutPanel, setShowCheckInOutPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);
  const [selectedRunForAssignment, setSelectedRunForAssignment] = useState(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState(null); // 'pets' | 'checkins' | 'checkouts' | 'occupancy'
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [filters, setFilters] = useState({
    services: ['boarding', 'daycare', 'grooming'],
    kennels: ['all'],
    status: ['CONFIRMED', 'PENDING', 'CHECKED_IN'],
    highlights: ['check-in-today', 'check-out-today', 'medication-required'],
  });

  // Get current user for audit fields
  const userId = useAuthStore((state) => state.user?.id);

  // Stats (hook must be called, but result currently unused)
  const _todayStats = useTodayStats(currentDate);

  // Week dates for grid
  const weekStart = startOfWeek(currentDate);
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekStartStr = weekDates[0].toISOString().split('T')[0];
  const weekEndStr = weekDates[6].toISOString().split('T')[0];

  // Data fetching
  const { data: runTemplates = [], isLoading: runsLoading, refetch: _refetchRuns } = useRunTemplatesQuery();
  const { data: weekBookings = [], isLoading: bookingsLoading, refetch: _refetchBookings } = useBookingsQuery({
    startDate: weekStartStr,
    endDate: weekEndStr,
  });

  // Fetch run assignments for the week (from RunAssignment table)
  const { data: runAssignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useRunAssignmentsQuery({
    startDate: weekStartStr,
    endDate: weekEndStr,
  });

  const isLoading = runsLoading || bookingsLoading || assignmentsLoading;

  // Mutation for assigning pets to runs
  const assignPetsMutation = useAssignPetsToRunMutation();

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
      // Use assignedDate from RunAssignment table, fallback to startAt for legacy data
      // Use string split to avoid timezone conversion issues with date-only strings
      const dateStr = assignment.assignedDate
        ? assignment.assignedDate.split('T')[0]
        : assignment.startAt
          ? format(new Date(assignment.startAt), 'yyyy-MM-dd')
          : null;

      // Determine service type from run type or booking
      const serviceType = assignment.serviceType || assignment.runType || 'Daycare';

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
        serviceType,
        dateStr, // The date this assignment is for
      };
    }).filter(a => a.dateStr); // Only include valid assignments with dates
  }, [runAssignmentsData]);

  // Filter assignments based on search and service filter
  const filteredAssignments = useMemo(() => {
    return processedAssignments.filter(assignment => {
      // Search filter
      const matchesSearch = !searchTerm ||
        assignment.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Service filter
      const matchesService = serviceFilter === 'all' ||
        assignment.serviceType?.toLowerCase().includes(serviceFilter.toLowerCase());

      return matchesSearch && matchesService;
    });
  }, [processedAssignments, searchTerm, serviceFilter]);

  // Filter bookings based on search and service filter
  const filteredBookings = useMemo(() => {
    return processedBookings.filter(booking => {
      // Search filter
      const matchesSearch = !searchTerm ||
        booking.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());

      // Service filter
      const matchesService = serviceFilter === 'all' ||
        booking.serviceName?.toLowerCase().includes(serviceFilter.toLowerCase());

      return matchesSearch && matchesService;
    });
  }, [processedBookings, searchTerm, serviceFilter]);

  // Calculate occupancy per day based on run assignments (currently unused but kept for future features)
  const _occupancyByDate = useMemo(() => {
    const map = {};
    weekDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
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
    document.title = "Run Schedules | BarkBase";
    return () => { document.title = 'BarkBase'; };
  }, []);

  // Handlers
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
          kennel: { name: bookingOrAssignment.kennelName || null, id: bookingOrAssignment.kennelId },
          // Use run name as additional context
          runName: bookingOrAssignment.runName,
          runId: bookingOrAssignment.runId,
          // Run assignment times (TIME strings like "08:00")
          startTime: bookingOrAssignment.startTime || null,
          endTime: bookingOrAssignment.endTime || null,
          // Full timestamps
          startAt: bookingOrAssignment.startAt || null,
          endAt: bookingOrAssignment.endAt || null,
          // Service/activity type
          serviceType: bookingOrAssignment.serviceType || 'Social',
          totalCents: bookingOrAssignment.bookingTotalCents || 0,
          amountPaidCents: 0, // TODO: fetch actual paid amount if needed
        };
    setSelectedBooking(normalizedBooking);
    setShowBookingModal(true);
  }, []);

  // Get checked-in pets that are not assigned to any run today
  const unassignedCheckedInPets = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // Get all assigned pet IDs for today
    const assignedPetIds = new Set(
      processedAssignments
        .filter(a => a.dateStr === today)
        .map(a => a.petId)
    );

    // Get checked-in bookings that don't have a run assignment
    return processedBookings.filter(b => {
      if (b.status !== 'CHECKED_IN') return false;
      if (!b.checkInDate || !b.checkOutDate) return false;
      const inStr = b.checkInDate.toISOString().split('T')[0];
      const outStr = b.checkOutDate.toISOString().split('T')[0];
      // Must be active today
      if (today < inStr || today > outStr) return false;
      // Must not already be assigned
      return !assignedPetIds.has(b.pet?.id || b.petId);
    });
  }, [processedBookings, processedAssignments]);

  // Handler for empty cell click - opens assignment panel
  const handleEmptyCellClick = useCallback((run, hour) => {
    setSelectedRunForAssignment({ ...run, hour });
    setShowAssignmentPanel(true);
  }, []);

  return (
    <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)]">
      {/* Header with Sticky Action Bar */}
      <div className="pb-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <PageHeader
              breadcrumbs={[
                { label: 'Operations' },
                { label: 'Run Schedules' }
              ]}
              title="Run Schedules"
            />
            <p className="mt-1 text-sm text-[color:var(--bb-color-text-muted)]">
              Manage run assignments and track pet activities throughout the day
            </p>
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

        {/* Two-column layout: Grid (left ~70%) + Capacity/Assistant (right ~30%) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Today's Hourly Grid */}
          <DailyHourlyGrid
            runs={runs}
            bookings={filteredBookings}
            assignments={filteredAssignments}
            currentDate={currentDate}
            isLoading={isLoading}
            onBookingClick={handleBookingClick}
            onEmptyCellClick={handleEmptyCellClick}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            userId={userId}
          />

          {/* Right: Stacked widgets */}
          <div className="space-y-6">
            <CapacityOverview stats={stats} />
            <SmartSchedulingAssistant stats={stats} onOpenCheckInPanel={() => setShowCheckInOutPanel(true)} />
          </div>
        </div>
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
          bookings={processedBookings}
          onBookingClick={handleBookingClick}
        />
      </SlidePanel>

      {/* Pet Assignment Panel */}
      <SlidePanel
        open={showAssignmentPanel}
        onClose={() => {
          setShowAssignmentPanel(false);
          setSelectedRunForAssignment(null);
        }}
        title={`Assign Pet to ${selectedRunForAssignment?.name || 'Run'}`}
      >
        <PetAssignmentPanel
          run={selectedRunForAssignment}
          unassignedPets={unassignedCheckedInPets}
          onAssign={async (pet, startTime, endTime) => {
            if (!selectedRunForAssignment?.id) {
              toast.error('No run selected');
              return;
            }

            const todayStr = currentDate.toISOString().split('T')[0];
            // pet is actually a booking object from processedBookings
            const petId = pet.pet?.id || pet.petId;
            const bookingId = pet.id; // The booking's ID

            if (!petId) {
              toast.error('Could not find pet ID');
              return;
            }

            try {
              await assignPetsMutation.mutateAsync({
                runId: selectedRunForAssignment.id,
                petIds: [petId],
                date: todayStr,
                bookingIds: [bookingId],
                startTime,
                endTime,
              });

              toast.success(`${pet.petName} assigned to ${selectedRunForAssignment?.name}`);
              setShowAssignmentPanel(false);
              setSelectedRunForAssignment(null);
              // Refetch assignments
              refetchAssignments();
            } catch (error) {
              console.error('[Schedule] Failed to assign pet:', error);
              console.error('[Schedule] Error details:', error?.response?.data || error?.message);
              toast.error(error?.response?.data?.message || error?.message || 'Failed to assign pet to run');
            }
          }}
          onClose={() => {
            setShowAssignmentPanel(false);
            setSelectedRunForAssignment(null);
          }}
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

// Daily Hourly Grid - Shows which pet is WHERE at each HOUR for TODAY
// Rows = Hours (6am-8pm), Columns = Kennels/Runs
const DailyHourlyGrid = ({
  runs,
  bookings,
  assignments = [],
  currentDate,
  isLoading,
  onBookingClick,
  onEmptyCellClick,
  searchTerm,
  onSearchChange,
  serviceFilter,
  onServiceFilterChange,
  userId,
}) => {
  const scrollRef = useRef(null);
  const currentHourRef = useRef(null);
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();

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

  // Get the date string for filtering (use local date, not UTC)
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  // Build track maps for each run - determines which track each pet occupies
  // This ensures the same pet gets the same track index in start, middle, and end cells
  const trackMaps = useMemo(() => {
    const maps = {};
    runs.forEach(run => {
      maps[run.id] = {};
      // Get all assignments for this run on this date
      const runAssignments = assignments
        .filter(a => a.runId === run.id && a.dateStr === dateStr)
        .map(a => {
          // Parse start time for sorting
          let startHour = 0;
          let startMinute = 0;
          if (a.startTime) {
            const parts = a.startTime.split(':');
            startHour = parseInt(parts[0], 10) || 0;
            startMinute = parseInt(parts[1], 10) || 0;
          } else if (a.startAt) {
            const d = new Date(a.startAt);
            startHour = d.getHours();
            startMinute = d.getMinutes();
          }
          return { ...a, _sortStart: startHour * 60 + startMinute };
        })
        // Sort by start time so earlier assignments get lower track indices
        .sort((x, y) => x._sortStart - y._sortStart);

      // Assign track index to each pet based on their position in the sorted list
      runAssignments.forEach((a, idx) => {
        const petKey = a.petId || a.id;
        if (maps[run.id][petKey] === undefined) {
          maps[run.id][petKey] = idx;
        }
      });
    });
    return maps;
  }, [runs, assignments, dateStr]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (isToday && currentHourRef.current) {
      currentHourRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isToday]);

  // Get pets in a kennel/run at a specific hour with position info (start/middle/end)
  const getPetsForCell = (runId, hour) => {
    // First check run assignments for this run/kennel on this date
    const runAssignments = assignments
      .filter(a => a.runId === runId && a.dateStr === dateStr)
      .map(a => {
        // Parse start/end time - could be TIME strings like "08:00" or timestamps
        let startHour = 0;
        let startMinute = 0;
        let endHour = 18; // Default to 6pm
        let endMinute = 0;

        if (a.startTime) {
          const parts = a.startTime.split(':');
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          startHour = isNaN(h) ? 0 : h;
          startMinute = isNaN(m) ? 0 : m;
        } else if (a.startAt) {
          const d = new Date(a.startAt);
          startHour = d.getHours();
          startMinute = d.getMinutes();
        }

        if (a.endTime) {
          const parts = a.endTime.split(':');
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          endHour = isNaN(h) ? 18 : h;
          endMinute = isNaN(m) ? 0 : m;
        } else if (a.endAt) {
          const d = new Date(a.endAt);
          endHour = d.getHours();
          endMinute = d.getMinutes();
        }

        return { ...a, _startHour: startHour, _endHour: endHour, _startMinute: startMinute, _endMinute: endMinute };
      })
      .filter(a => {
        // Check if the assignment overlaps this hour slot
        const slotStart = hour;
        const slotEnd = hour + 1;
        const assignStart = a._startHour + a._startMinute / 60;
        const assignEnd = a._endHour + a._endMinute / 60;
        const isActiveInSlot = assignStart < slotEnd && assignEnd > slotStart;
        const needsEndMarker = hour === a._endHour;
        return isActiveInSlot || needsEndMarker;
      })
      .map((a, idx) => {
        // Determine position: start, middle, or end
        const isStartHour = hour === a._startHour;
        const isEndHour = hour === a._endHour;
        // If assignment spans only 1 hour, it's both start and end
        const isSingleHour = a._startHour === a._endHour || (a._endHour - a._startHour === 1 && a._endMinute === 0);

        let position = 'middle';
        if (isSingleHour) {
          position = 'single'; // Show full chip, no line
        } else if (isStartHour) {
          position = 'start';
        } else if (isEndHour) {
          position = 'end';
        }

        // Use track map for consistent track index across all cells (start, middle, end)
        const petKey = a.petId || a.id;
        const trackIndex = trackMaps[runId]?.[petKey] ?? idx;

        return { ...a, position, trackIndex };
      });

    // Only show actual RunAssignment data - no booking fallback
    // Bookings are for kennel reservations, RunAssignments are for run/play area scheduling
    return runAssignments;
  };

  // Calculate occupancy for a run (how many hours it's occupied)
  const getRunOccupancy = (runId) => {
    let occupiedHours = 0;
    hours.forEach(hour => {
      if (getPetsForCell(runId, hour).length > 0) occupiedHours++;
    });
    return Math.round((occupiedHours / hours.length) * 100);
  };

  // Check in handler
  const handleCheckIn = useCallback(async (e, pet) => {
    e.stopPropagation();
    const bookingId = pet.bookingId || pet.id;
    if (!bookingId) {
      toast.error('No booking ID found');
      return;
    }
    try {
      await checkInMutation.mutateAsync({ bookingId, payload: { userId } });
      toast.success(`${pet.petName} checked in!`);
    } catch (error) {
      toast.error(error?.message || 'Failed to check in');
    }
  }, [checkInMutation, userId]);

  // Check out handler
  const handleCheckOut = useCallback(async (e, pet) => {
    e.stopPropagation();
    const bookingId = pet.bookingId || pet.id;
    if (!bookingId) {
      toast.error('No booking ID found');
      return;
    }
    try {
      await checkOutMutation.mutateAsync({ bookingId, payload: { userId } });
      toast.success(`${pet.petName} checked out!`);
    } catch (error) {
      toast.error(error?.message || 'Failed to check out');
    }
  }, [checkOutMutation, userId]);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
          <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Runs & Play Areas</h3>
          <Badge variant="info" size="sm">Today</Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        {/* Activity Filter */}
        <div className="min-w-[150px]">
          <StyledSelect
            options={[
              { value: 'all', label: 'All Activities' },
              { value: 'social', label: 'Social Play' },
              { value: 'individual', label: 'Individual' },
              { value: 'training', label: 'Training' },
            ]}
            value={serviceFilter}
            onChange={(opt) => onServiceFilterChange(opt?.value || 'all')}
            isClearable={false}
            isSearchable
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by pet or owner..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 rounded-lg border pl-9 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
            style={{
              backgroundColor: 'var(--bb-color-bg-body)',
              borderColor: 'var(--bb-color-border-subtle)',
              color: 'var(--bb-color-text-primary)',
            }}
          />
        </div>

        {/* Results count */}
        <span className="text-sm text-[color:var(--bb-color-text-muted)]">
          {assignments.length + bookings.length} pets
        </span>
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500 [&::-webkit-scrollbar-corner]:bg-slate-100 dark:[&::-webkit-scrollbar-corner]:bg-slate-800 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300 dark:scrollbar-track-slate-800 dark:scrollbar-thumb-slate-600"
        ref={scrollRef}
      >
        <div style={{ minWidth: `${80 + runs.length * 140}px` }}>
          {/* Column Headers - Kennels/Runs */}
          <div
            className="grid border-b"
            style={{
              gridTemplateColumns: `80px repeat(${runs.length}, minmax(120px, 1fr))`,
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
                  ref={isCurrentHour ? currentHourRef : null}
                  className={cn(
                    "grid border-b last:border-b-0",
                    isCurrentHour && "ring-2 ring-inset ring-[var(--bb-color-accent)]"
                  )}
                  style={{
                    gridTemplateColumns: `80px repeat(${runs.length}, minmax(120px, 1fr))`,
                    borderColor: 'var(--bb-color-border-subtle)',
                    overflow: 'visible', // Allow spanning lines to extend vertically
                  }}
                >
                  {/* Hour Label - Sticky */}
                  <div
                    className={cn(
                      'p-2 sticky left-0 z-10 border-r flex items-center justify-center',
                      isCurrentHour && 'bg-[var(--bb-color-accent)] text-white'
                    )}
                    style={{
                      backgroundColor: isCurrentHour ? undefined : 'var(--bb-color-bg-surface)',
                      borderColor: 'var(--bb-color-border-subtle)'
                    }}
                  >
                    <span className={cn(
                      'text-sm font-semibold',
                      !isCurrentHour && 'text-[color:var(--bb-color-text-muted)]'
                    )}>
                      {formatHour(hour)}
                      {isCurrentHour && ' •'}
                    </span>
                  </div>

                  {/* Kennel/Run Cells */}
                  {runs.map((run, runIndex) => {
                    const cellPets = getPetsForCell(run.id, hour);
                    const hasPets = cellPets.length > 0;
                    const isNearRightEdge = runIndex >= runs.length - 3;

                    return (
                      <div
                        key={run.id}
                        className={cn(
                          'min-h-[60px] border-l relative transition-colors cursor-pointer',
                          !hasPets && 'hover:bg-[color:var(--bb-color-bg-elevated)]',
                          isCurrentHour && 'bg-[color:var(--bb-color-accent-soft)]'
                        )}
                        style={{
                          backgroundColor: isCurrentHour ? undefined : 'var(--bb-color-bg-body)',
                          borderColor: 'var(--bb-color-border-subtle)',
                          overflow: 'visible', // Allow spanning lines to extend into subsequent cells
                        }}
                        onClick={() => hasPets ? onBookingClick(cellPets[0]) : onEmptyCellClick(run, hour)}
                      >
                        {hasPets ? (
                          <div className="absolute inset-0 p-1" style={{ overflow: 'visible' }}>
                            {cellPets.slice(0, 4).map((pet, idx) => {
                              const position = pet.position || 'single';
                              const trackOffset = pet.trackIndex * 28; // Offset for parallel tracks

                              if (position === 'start' || position === 'single') {
                                // Calculate start/end hour indices for spanning line
                                const startHourIndex = hours.indexOf(pet._startHour);
                                const endHourIndex = hours.indexOf(pet._endHour);
                                const isMultiHour = position === 'start' && startHourIndex >= 0 && endHourIndex > startHourIndex;

                                // Use array return for multiple elements with keys
                                const elements = [
                                  <PetTimeBar
                                    key={`bar-${pet.id || idx}`}
                                    pet={pet}
                                    hour={hour}
                                    onBookingClick={onBookingClick}
                                    trackOffset={trackOffset}
                                    flipTooltip={isNearRightEdge}
                                  />
                                ];
                                /* Render spanning SVG line for multi-hour assignments */
                                if (isMultiHour) {
                                  elements.push(
                                    <SpanningDashLine
                                      key={`line-${pet.id || idx}`}
                                      pet={pet}
                                      startHourIndex={startHourIndex}
                                      endHourIndex={endHourIndex}
                                      hours={hours}
                                      trackOffset={trackOffset}
                                      rowHeight={60}
                                      onBookingClick={onBookingClick}
                                    />
                                  );
                                }
                                return elements;
                              }

                              if (position === 'middle') {
                                return (
                                  <TimeSpanLine
                                    key={pet.id || idx}
                                    pet={pet}
                                    trackOffset={trackOffset}
                                    onBookingClick={onBookingClick}
                                    flipTooltip={isNearRightEdge}
                                  />
                                );
                              }

                              if (position === 'end') {
                                return (
                                  <EndTimeMarker
                                    key={pet.id || idx}
                                    pet={pet}
                                    trackOffset={trackOffset}
                                    onBookingClick={onBookingClick}
                                    flipTooltip={isNearRightEdge}
                                  />
                                );
                              }

                              return null;
                            })}
                            {cellPets.length > 4 && (
                              <p className="text-[9px] text-center text-blue-600 dark:text-blue-300 font-medium absolute bottom-0 right-1">
                                +{cellPets.length - 4}
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

// Get stroke color for SVG lines based on service type
const getStrokeColor = (service) => {
  const s = (service || '').toLowerCase();
  if (s.includes('social')) return '#34d399'; // emerald-400
  if (s.includes('individual')) return '#60a5fa'; // blue-400
  if (s.includes('training')) return '#fbbf24'; // amber-400
  return '#9ca3af'; // gray-400
};

// SpanningDashLine - ONE SVG line per multi-hour assignment spanning from start to end
const SpanningDashLine = ({ pet, startHourIndex, endHourIndex, hours, trackOffset = 0, rowHeight = 60 }) => {
  // Calculate chip height in first cell (based on duration overlap)
  const firstHour = hours[startHourIndex];
  const slotStart = firstHour;
  const slotEnd = firstHour + 1;
  const assignStart = pet._startHour + pet._startMinute / 60;
  const assignEnd = pet._endHour + pet._endMinute / 60;
  const overlapStart = Math.max(assignStart, slotStart);
  const overlapEnd = Math.min(assignEnd, slotEnd);
  const overlapDuration = Math.max(0, overlapEnd - overlapStart);
  const chipHeightPercent = Math.round(overlapDuration * 100);

  // Y start: after the chip in the first cell (chip top padding + chip height)
  const chipTopPadding = 4;
  const chipHeight = Math.max(20, (rowHeight - 8) * chipHeightPercent / 100); // min 20px
  const yStart = chipTopPadding + chipHeight;

  // Y end: position based on actual end minute within the final cell
  const totalRows = endHourIndex - startHourIndex;
  const endMinutePercent = (pet._endMinute || 0) / 60;
  const yEnd = (totalRows * rowHeight) + (rowHeight * endMinutePercent);

  // X position: align with activity dot (8px from left edge of track)
  const xPos = 4 + trackOffset + 8;

  const strokeColor = getStrokeColor(pet.serviceType);
  const lineHeight = yEnd - yStart;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: `${xPos}px`,
        top: `${yStart}px`,
        width: '2px',
        height: `${lineHeight}px`,
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      <line
        x1="1"
        y1="0"
        x2="1"
        y2={lineHeight}
        stroke={strokeColor}
        strokeWidth="2"
        strokeDasharray="6 4"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
};

// Time Span Line - Hover/click target for middle hours of an assignment (no line - SVG handles it)
const TimeSpanLine = ({ pet, trackOffset = 0, onBookingClick, flipTooltip = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: `${4 + trackOffset}px`,
        top: 0,
        bottom: 0,
        width: '20px',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        onBookingClick(pet);
      }}
    >
      {/* Hover highlight only - SVG line is rendered separately as spanning element */}
      <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bb-color-accent-soft)]" />

      {/* Tooltip on hover */}
      {showTooltip && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs shadow-lg",
            flipTooltip ? "right-full mr-2" : "left-full ml-2"
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            border: '1px solid var(--bb-color-border-subtle)',
            color: 'var(--bb-color-text-primary)',
          }}
        >
          <span className="font-medium">{pet.petName}</span>
          <span className="text-[color:var(--bb-color-text-muted)]"> • {pet.serviceType || 'Social'}</span>
        </div>
      )}
    </div>
  );
};

// End Time Marker - Shows end time label (no line - SVG handles it)
const EndTimeMarker = ({ pet, trackOffset = 0, onBookingClick, flipTooltip = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Format end time
  const formatEndTime = () => {
    if (pet._endHour !== undefined) {
      const h = pet._endHour;
      const m = pet._endMinute || 0;
      const suffix = h >= 12 ? 'p' : 'a';
      const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return m > 0 ? `${hour12}:${m.toString().padStart(2, '0')}${suffix}` : `${hour12}${suffix}`;
    }
    return '';
  };

  return (
    <div
      className="absolute cursor-pointer group"
      style={{
        left: `${4 + trackOffset}px`,
        top: 0,
        width: '40px',
        height: '100%',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        onBookingClick(pet);
      }}
    >
      {/* End time label */}
      <div
        className={cn(
          'absolute text-[9px] font-medium px-1 rounded',
          'text-[color:var(--bb-color-text-muted)]',
          'group-hover:bg-[var(--bb-color-accent-soft)]'
        )}
        style={{ left: '8px', top: '4px' }}
      >
        {formatEndTime()}
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-2 py-1 text-xs shadow-lg",
            flipTooltip ? "right-full mr-2" : "left-full ml-2"
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            border: '1px solid var(--bb-color-border-subtle)',
            color: 'var(--bb-color-text-primary)',
          }}
        >
          <span className="font-medium">{pet.petName}</span>
          <span className="text-[color:var(--bb-color-text-muted)]"> ends {formatEndTime()}</span>
        </div>
      )}
    </div>
  );
};

// Pet Time Bar - Shows at START of assignment with activity dot
const PetTimeBar = ({ pet, hour, onBookingClick, trackOffset = 0, flipTooltip = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tz = useTimezoneUtils();

  // Calculate width percentage based on how much of this hour the assignment covers
  const calculateWidthPercent = () => {
    let startHour = 0, startMinute = 0, endHour = 23, endMinute = 59;

    if (pet.startTime) {
      const parts = pet.startTime.split(':');
      startHour = parseInt(parts[0], 10) || 0;
      startMinute = parseInt(parts[1], 10) || 0;
    } else if (pet.startAt) {
      const d = new Date(pet.startAt);
      startHour = d.getHours();
      startMinute = d.getMinutes();
    }

    if (pet.endTime) {
      const parts = pet.endTime.split(':');
      endHour = parseInt(parts[0], 10) || 23;
      endMinute = parseInt(parts[1], 10) || 59;
    } else if (pet.endAt) {
      const d = new Date(pet.endAt);
      endHour = d.getHours();
      endMinute = d.getMinutes();
    }

    // Convert to decimal hours
    const assignStart = startHour + startMinute / 60;
    const assignEnd = endHour + endMinute / 60;
    const slotStart = hour;
    const slotEnd = hour + 1;

    // Calculate overlap within this hour slot
    const overlapStart = Math.max(assignStart, slotStart);
    const overlapEnd = Math.min(assignEnd, slotEnd);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);

    // Return percentage (0-100)
    return Math.round(overlapDuration * 100);
  };

  const heightPercent = calculateWidthPercent();

  // Status for tooltip display
  const status = pet.bookingStatus || pet.status || 'CONFIRMED';
  const isCheckedIn = status === 'CHECKED_IN';
  const isCheckedOut = status === 'CHECKED_OUT';

  // Activity type dot color (based on run type)
  const getActivityDotColor = (service) => {
    const s = (service || '').toLowerCase();
    if (s.includes('social')) return 'bg-emerald-500';
    if (s.includes('individual')) return 'bg-blue-500';
    if (s.includes('training')) return 'bg-amber-500';
    return 'bg-gray-400'; // Default for unknown types
  };

  // Status border color
  const getStatusBorderColor = () => {
    if (isCheckedOut) return 'border-l-gray-400';
    if (isCheckedIn) return 'border-l-emerald-500';
    if (status === 'CONFIRMED') return 'border-l-blue-500';
    if (status === 'PENDING') return 'border-l-amber-500';
    return 'border-l-gray-400';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return tz.formatTime(timeStr);
  };

  // Calculate height based on duration in this hour slot
  // 15 min = 25%, 30 min = 50%, 45 min = 75%, 60 min = 100%
  const cellHeightPercent = heightPercent;

  return (
    <div
      className="absolute transition-all"
      style={{
        left: `${4 + trackOffset}px`,
        right: '4px',
        top: '4px',
        height: `calc(${cellHeightPercent}% - 8px)`, // Subtract padding
        minHeight: '20px', // Minimum height for very short slots
        zIndex: showTooltip ? 50 : 1, // Pop to front on hover
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Main chip */}
      <div
        className={cn(
          'relative rounded border-l-4 px-2 cursor-pointer transition-all h-full',
          'hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-[var(--bb-color-accent)]',
          'flex items-center',
          getStatusBorderColor()
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-elevated)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onBookingClick(pet);
        }}
      >
        {/* Compact single-row layout */}
        <div className="flex items-center justify-between gap-1.5 w-full">
          {/* Left: Activity dot + Pet name */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Activity type dot */}
            <span className={cn('w-2 h-2 rounded-full shrink-0', getActivityDotColor(pet.serviceType))} />
            <span className="text-[11px] font-semibold text-[color:var(--bb-color-text-primary)] truncate">
            {pet.petName}
          </span>
        </div>

      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div
          className={cn(
            "absolute top-0 z-50 w-56 rounded-lg p-3 shadow-xl",
            flipTooltip ? "right-full mr-2" : "left-full ml-2"
          )}
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            border: '1px solid var(--bb-color-border-subtle)',
          }}
        >
          <div className="space-y-2">
            {/* Pet info */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bb-color-accent)] text-white">
                <PawPrint className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[color:var(--bb-color-text-primary)]">{pet.petName}</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">{pet.petBreed || pet.petSpecies || 'Pet'}</p>
              </div>
            </div>

            {/* Owner */}
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-[color:var(--bb-color-text-primary)]">{pet.ownerName}</span>
            </div>

            {/* Phone */}
            {pet.ownerPhone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
                <a href={`tel:${pet.ownerPhone}`} className="text-[color:var(--bb-color-accent)] hover:underline">
                  {pet.ownerPhone}
                </a>
              </div>
            )}

            {/* Activity Type */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[color:var(--bb-color-text-muted)]">Activity:</span>
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', getActivityDotColor(pet.serviceType))} />
                <span className="text-[color:var(--bb-color-text-primary)]">{pet.serviceType || 'Social'}</span>
              </div>
            </div>

            {/* Times */}
            <div className="pt-2 border-t text-xs space-y-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <div className="flex justify-between">
                <span className="text-[color:var(--bb-color-text-muted)]">Check-in:</span>
                <span className="text-[color:var(--bb-color-text-primary)]">{formatTime(pet.bookingCheckIn || pet.startAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--bb-color-text-muted)]">Check-out:</span>
                <span className="text-[color:var(--bb-color-text-primary)]">{formatTime(pet.bookingCheckOut || pet.endAt)}</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">Status:</span>
              <Badge size="sm" variant={isCheckedIn ? 'success' : isCheckedOut ? 'neutral' : 'info'}>
                {status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* SVG spanning line is rendered separately at the column level for continuous dash pattern */}
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

      {/* Activity Types Legend */}
      <div className="pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-2">Activity Types</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-[color:var(--bb-color-text-primary)]">Social</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-[color:var(--bb-color-text-primary)]">Individual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-[color:var(--bb-color-text-primary)]">Training</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Smart Scheduling Assistant
const SmartSchedulingAssistant = ({ stats, onOpenCheckInPanel }) => {
  const insights = useMemo(() => {
    const list = [];

    if (stats.occupancy >= 90) {
      list.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High Capacity',
        message: `At ${stats.occupancy}% capacity — consider limiting new bookings`,
        clickable: false,
      });
    } else if (stats.occupancy < 50) {
      list.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Good Availability',
        message: `${stats.availableSpots} spots open — great time to accept new bookings`,
        clickable: false,
      });
    }

    if (stats.checkIns > 0) {
      list.push({
        type: 'info',
        icon: UserCheck,
        title: 'Pending Check-ins',
        message: `${stats.checkIns} guest${stats.checkIns > 1 ? 's' : ''} arriving — click to view`,
        clickable: true,
        onClick: onOpenCheckInPanel,
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'success',
        icon: CheckCircle,
        title: 'All Systems Optimal',
        message: 'No scheduling recommendations at this time',
        clickable: false,
      });
    }

    return list;
  }, [stats, onOpenCheckInPanel]);

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
          const Wrapper = insight.clickable ? 'button' : 'div';
          return (
            <Wrapper
              key={idx}
              type={insight.clickable ? 'button' : undefined}
              onClick={insight.clickable ? insight.onClick : undefined}
              className={cn(
                'flex items-start gap-2 rounded-lg border p-3 w-full text-left',
                variantStyles[insight.type],
                insight.clickable && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all'
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{insight.title}</p>
                <p className="text-xs opacity-80">{insight.message}</p>
              </div>
              {insight.clickable && (
                <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-60" />
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};

// Pet Assignment Panel - Shows unassigned checked-in pets to assign to a run
const PetAssignmentPanel = ({ run, unassignedPets, onAssign, onClose }) => {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');

  if (!run) return null;

  // Generate time options (6am to 8pm) with 15-minute increments
  const timeOptions = [];
  for (let h = 6; h <= 20; h++) {
    const hour = h.toString().padStart(2, '0');
    timeOptions.push(`${hour}:00`);
    if (h < 20) {
      timeOptions.push(`${hour}:15`);
      timeOptions.push(`${hour}:30`);
      timeOptions.push(`${hour}:45`);
    }
  }

  const handleAssign = (pet) => {
    onAssign(pet, startTime, endTime);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Run Info */}
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{run.name}</p>
        <p className="text-xs text-[color:var(--bb-color-text-muted)]">{run.type} • Capacity: {run.capacity}</p>
      </div>

      {/* Time Selection */}
      <div className="grid grid-cols-2 gap-3">
        <StyledSelect
          label="Start Time"
          options={timeOptions.map(time => ({ value: time, label: time }))}
          value={startTime}
          onChange={(opt) => setStartTime(opt?.value || '08:00')}
          isClearable={false}
          isSearchable
        />
        <StyledSelect
          label="End Time"
          options={timeOptions.map(time => ({ value: time, label: time }))}
          value={endTime}
          onChange={(opt) => setEndTime(opt?.value || '17:00')}
          isClearable={false}
          isSearchable
        />
      </div>

      {/* Unassigned Pets List */}
      <div>
        <h4 className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2">
          Available Pets to Assign
        </h4>
        {unassignedPets.length === 0 ? (
          <div className="text-center py-8">
            <PawPrint className="h-8 w-8 text-[color:var(--bb-color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">All checked-in pets are already assigned</p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">Check in more pets or clear existing assignments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unassignedPets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => handleAssign(pet)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--bb-color-accent)] cursor-pointer"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-color-accent)] text-white shrink-0">
                  <PawPrint className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">{pet.petName}</p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                    {pet.pet?.breed || 'Pet'} • {pet.ownerName}
                  </p>
                </div>
                <Badge variant="success" size="sm">Checked In</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default Schedule;
