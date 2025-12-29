/**
 * Booking Detail Inspector - DAFE Pattern
 * Do Anything From Everywhere - All actions available without navigation
 * Used in Bookings list view
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Calendar, PawPrint, User, CheckCircle, Clock, DollarSign, Phone, Edit2, X, MessageSquare, Home, ChevronDown, ChevronLeft, LogIn, LogOut, Play, ArrowRight, Timer } from 'lucide-react';
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
import { useAssignKennelMutation, useDeleteBookingMutation, useBookingCheckInMutation, useBookingCheckOutMutation } from '@/features/bookings/api';
import { useRunsQuery, useUpdateRunAssignmentMutation, useRemovePetFromRunMutation, useAssignPetsToRunMutation } from '@/features/daycare/api';
import { useAuthStore } from '@/stores/auth';
import { useTimezoneUtils, useTimezone, convertTimeToTimezone } from '@/lib/timezone';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

const BookingDetailModal = ({ booking, isOpen, onClose, onEdit }) => {
  const { openSlideout } = useSlideout();
  const { data: kennels = [] } = useKennels();
  const { data: runTemplates = [] } = useRunsQuery();
  const assignKennelMutation = useAssignKennelMutation();
  const deleteBookingMutation = useDeleteBookingMutation();
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();
  const updateAssignmentMutation = useUpdateRunAssignmentMutation();
  const removeFromRunMutation = useRemovePetFromRunMutation();
  const assignPetsToRunMutation = useAssignPetsToRunMutation();

  // Get current user for audit fields
  const userId = useAuthStore((state) => state.user?.id);

  // Timezone utilities for proper date/time display
  const tz = useTimezoneUtils();
  const userTimezone = useTimezone();

  // Local state
  const [activeTab, setActiveTab] = useState('assignment'); // 'assignment' | 'booking'
  const [assignmentView, setAssignmentView] = useState('main'); // 'main' | 'changeRun' | 'adjustTime'
  const [showKennelDropdown, setShowKennelDropdown] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showQuickCheckoutDialog, setShowQuickCheckoutDialog] = useState(false);
  const [showEndEarlyDialog, setShowEndEarlyDialog] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const kennelDropdownRef = useRef(null);

  // State for time adjustment
  const [adjustedStartTime, setAdjustedStartTime] = useState('');
  const [adjustedEndTime, setAdjustedEndTime] = useState('');
  const [selectedRunId, setSelectedRunId] = useState(null);

  // Local state for optimistic updates after check-in/out
  const [localStatus, setLocalStatus] = useState(null);
  const [localCheckedInAt, setLocalCheckedInAt] = useState(null);

  // Reset local state when booking changes
  useEffect(() => {
    setLocalStatus(null);
    setLocalCheckedInAt(null);
  }, [booking?.id]);

  // Reset to assignment tab and main view when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('assignment');
      setAssignmentView('main');
      setShowEndEarlyDialog(false);
    }
  }, [isOpen]);

  // Click outside to close kennel dropdown
  useEffect(() => {
    if (!showKennelDropdown) return;

    const handleClickOutside = (e) => {
      if (kennelDropdownRef.current && !kennelDropdownRef.current.contains(e.target)) {
        setShowKennelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showKennelDropdown]);

  // Get the actual booking ID from the database (use optional chaining for null safety)
  const bookingId = booking?.id || booking?.recordId || booking?.booking_id || booking?.bookingId;

  // Generate short reference for display (first 8 chars of UUID)
  const generateBookingRef = (id) => {
    if (id) {
      return id.toString().slice(0, 8).toUpperCase();
    }
    return 'UNKNOWN';
  };

  const duration = booking?.checkIn && booking?.checkOut
    ? Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))
    : 0;

  // Format date using user's timezone
  const formatDate = (date) => {
    if (!date) return '—';
    return tz.formatDate(date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time using user's timezone
  const formatTime = (date) => {
    if (!date) return '';
    return tz.formatTime(date);
  };

  // Format TIME string like "08:00" or "17:30" to human readable in user's timezone
  // Converts from tenant's timezone to user's display timezone
  const formatTimeString = (timeStr, dateStr = null, fromTimezone = null) => {
    if (!timeStr) return '—';

    // Use provided timezone or fall back to displayBooking's tenantTimezone
    const sourceTz = fromTimezone || displayBooking.tenantTimezone || 'America/New_York';

    // If we have a date, use timezone conversion
    if (dateStr) {
      return convertTimeToTimezone(timeStr, dateStr, sourceTz, userTimezone);
    }

    // Fallback: simple formatting without timezone conversion (for time picker display)
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (isNaN(hour)) return timeStr;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return minute > 0 ? `${hour12}:${minute.toString().padStart(2, '0')} ${suffix}` : `${hour12} ${suffix}`;
  };

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

  // Compute booking display data - use local state for optimistic updates
  const displayBooking = {
    id: bookingId,
    bookingRef: generateBookingRef(bookingId),
    pet: booking?.pet || {},
    owner: booking?.owner || {},
    checkIn: booking?.checkIn,
    checkOut: booking?.checkOut,
    checkedInAt: localCheckedInAt || booking?.checkedInAt || booking?.checked_in_at || null,
    status: localStatus || booking?.status || 'PENDING',
    kennel: booking?.segments?.[0]?.kennel || booking?.kennel || { name: null, id: null },
    notes: booking?.notes || booking?.specialInstructions || null,
    totalCents: booking?.totalCents || 0,
    amountPaidCents: booking?.amountPaidCents || 0,
    // Run assignment data (from backend or Schedule page)
    runName: booking?.runName || null,
    runId: booking?.runId || null,
    startAt: booking?.startAt || null,
    endAt: booking?.endAt || null,
    startTime: booking?.startTime || booking?.runStartTime || null, // TIME string like "08:00"
    endTime: booking?.endTime || booking?.runEndTime || null, // TIME string like "17:00"
    runType: booking?.runType || null, // Run type from Run table (SOCIAL, INDIVIDUAL, TRAINING)
    runAssignmentId: booking?.runAssignmentId || null,
    runAssignedDate: booking?.runAssignedDate || null, // DATE for timezone conversion
    tenantTimezone: booking?.tenantTimezone || 'America/New_York', // Tenant's canonical timezone
  };

  const balance = displayBooking.totalCents - displayBooking.amountPaidCents;

  // Check if booking has a valid ID for operations
  const hasValidBookingId = Boolean(bookingId);

  // Helper: Open create booking flow with pre-filled data
  // Used when booking ID is missing but user wants to take action
  // Includes returnTo so user can go back to the booking inspector
  const openCreateBookingWithPrefill = useCallback((extraPrefill = {}) => {
    openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, {
      title: 'Complete Booking',
      description: 'Save this booking to enable all actions',
      prefill: {
        petId: displayBooking.pet?.id || displayBooking.pet?.recordId,
        ownerId: displayBooking.owner?.id || displayBooking.owner?.recordId,
        checkIn: displayBooking.checkIn,
        checkOut: displayBooking.checkOut,
        notes: displayBooking.notes,
        ...extraPrefill,
      },
      returnTo: {
        label: 'Booking',
        onBack: () => {
          // Inspector is still open (controlled by parent), just close slideout
        },
      },
    });
  }, [displayBooking, openSlideout]);

  // DAFE: Open Pet slideout instead of navigating
  // Passes returnTo context so user can navigate back to booking
  const handleViewPet = useCallback(() => {
    const petId = displayBooking.pet?.id || displayBooking.pet?.recordId;
    if (petId) {
      openSlideout(SLIDEOUT_TYPES.PET_EDIT, {
        pet: displayBooking.pet,
        title: `${displayBooking.pet.name || 'Pet'} Profile`,
        returnTo: {
          label: 'Booking',
          onBack: () => {
            // Booking inspector will reopen since isOpen is controlled externally
            // No action needed here - the inspector stays in its open state
          },
        },
      });
    }
  }, [displayBooking.pet, openSlideout]);

  // DAFE: Open Owner slideout instead of navigating
  // Passes returnTo context so user can navigate back to booking
  const handleViewOwner = useCallback(() => {
    const ownerId = displayBooking.owner?.id || displayBooking.owner?.recordId;
    if (ownerId) {
      openSlideout(SLIDEOUT_TYPES.OWNER_EDIT, {
        owner: displayBooking.owner,
        title: `${displayBooking.owner.firstName || ''} ${displayBooking.owner.lastName || 'Owner'}`.trim(),
        returnTo: {
          label: 'Booking',
          onBack: () => {
            // Booking inspector will reopen since isOpen is controlled externally
            // No action needed here - the inspector stays in its open state
          },
        },
      });
    }
  }, [displayBooking.owner, openSlideout]);

  // DAFE: Inline kennel assignment
  // If no booking ID, open create booking flow with kennel pre-selected
  const handleAssignKennel = useCallback(async (kennelId) => {
    if (!hasValidBookingId) {
      // No booking exists - open create booking flow with kennel pre-selected
      openCreateBookingWithPrefill({ kennelId });
      return;
    }

    try {
      await assignKennelMutation.mutateAsync({ bookingId: displayBooking.id, kennelId });
      toast.success('Kennel assigned successfully');
      setShowKennelDropdown(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to assign kennel');
    }
  }, [hasValidBookingId, displayBooking.id, assignKennelMutation, openCreateBookingWithPrefill]);

  // DAFE: Cancel booking
  // If no booking ID, just close (nothing to cancel)
  const handleCancelBooking = useCallback(async () => {
    if (!hasValidBookingId) {
      // Nothing to cancel - just close
      setShowCancelDialog(false);
      onClose();
      return;
    }

    try {
      await deleteBookingMutation.mutateAsync(displayBooking.id);
      toast.success('Booking cancelled');
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to cancel booking');
    }
  }, [hasValidBookingId, displayBooking.id, deleteBookingMutation, onClose]);

  // Check In handler
  // If no booking ID, open create booking flow
  const handleCheckIn = useCallback(async () => {
    if (!hasValidBookingId) {
      openCreateBookingWithPrefill();
      return;
    }

    try {
      await checkInMutation.mutateAsync({
        bookingId: displayBooking.id,
        payload: { userId },
      });
      // Optimistic update - immediately show Check Out button
      setLocalStatus('CHECKED_IN');
      setLocalCheckedInAt(new Date().toISOString());
      toast.success('Checked in successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to check in');
    }
  }, [displayBooking.id, checkInMutation, hasValidBookingId, openCreateBookingWithPrefill, userId]);

  // Check if check-in was less than 5 minutes ago (quick checkout protection)
  const isQuickCheckout = useMemo(() => {
    if (!displayBooking.checkedInAt) return false;
    const checkedInTime = new Date(displayBooking.checkedInAt);
    const now = new Date();
    const diffMinutes = (now - checkedInTime) / (1000 * 60);
    return diffMinutes < 5;
  }, [displayBooking.checkedInAt]);

  // Actual check out execution
  const executeCheckOut = useCallback(async () => {
    try {
      await checkOutMutation.mutateAsync({
        bookingId: displayBooking.id,
        payload: { userId },
      });
      // Optimistic update - immediately show Checked Out badge
      setLocalStatus('CHECKED_OUT');
      toast.success('Checked out successfully');
      setShowQuickCheckoutDialog(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to check out');
    }
  }, [displayBooking.id, checkOutMutation, userId]);

  // Check Out handler - shows confirmation if quick checkout
  const handleCheckOut = useCallback(async () => {
    if (!hasValidBookingId) {
      openCreateBookingWithPrefill();
      return;
    }

    // If checked in less than 5 minutes ago, show confirmation
    if (isQuickCheckout) {
      setShowQuickCheckoutDialog(true);
      return;
    }

    // Otherwise proceed directly
    await executeCheckOut();
  }, [hasValidBookingId, openCreateBookingWithPrefill, isQuickCheckout, executeCheckOut]);

  // DAFE: Add note
  // If no booking ID, open create booking flow with the note pre-filled
  const handleAddNote = useCallback(() => {
    if (!noteText.trim()) return;

    if (!hasValidBookingId) {
      // No booking - open create flow with the note
      openCreateBookingWithPrefill({ notes: noteText });
      return;
    }

    // For now, show toast - actual note creation would go through API
    toast.success('Note added');
    setNoteText('');
    setAddingNote(false);
  }, [noteText, hasValidBookingId, openCreateBookingWithPrefill]);

  // Metrics for header
  const metrics = [
    { label: 'Duration', value: `${duration} ${duration === 1 ? 'night' : 'nights'}` },
    { label: 'Total', value: formatCurrency(displayBooking.totalCents) },
    { label: 'Balance', value: formatCurrency(balance) },
  ];

  // Available kennels for dropdown
  const availableKennels = kennels.filter(k => k.isActive !== false);

  // Get full kennel data (with building/floor) by looking up from availableKennels
  const fullKennelData = useMemo(() => {
    const kennelId = displayBooking.kennel?.id || displayBooking.kennel?.recordId;
    if (!kennelId) return displayBooking.kennel;
    const found = availableKennels.find(k => (k.id || k.recordId) === kennelId);
    return found || displayBooking.kennel;
  }, [displayBooking.kennel, availableKennels]);

  // Early return AFTER all hooks to preserve hook order
  if (!isOpen || !booking) {
    return null;
  }

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

        {/* Tab Bar */}
        <div className="flex border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('assignment')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'assignment'
                ? 'border-[var(--bb-color-accent)] text-[var(--bb-color-accent)]'
                : 'border-transparent text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
            )}
          >
            Run Assignment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('booking')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'booking'
                ? 'border-[var(--bb-color-accent)] text-[var(--bb-color-accent)]'
                : 'border-transparent text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]'
            )}
          >
            Booking Details
          </button>
        </div>

        {/* ===== ASSIGNMENT TAB ===== */}
        {activeTab === 'assignment' && (
          <>
            {/* Main Assignment View */}
            {assignmentView === 'main' && (
              <>
                {/* Pet Info */}
                <InspectorSection title="Pet" icon={PawPrint}>
                  <div className="flex items-center gap-[var(--bb-space-3)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]">
                      <PawPrint className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[var(--bb-font-size-md)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                        {displayBooking.pet.name || 'Unknown Pet'}
                      </p>
                      <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                        {displayBooking.pet.breed || 'Unknown breed'}
                        {displayBooking.pet.age && ` • ${displayBooking.pet.age}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleViewPet}>
                      <PawPrint className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </InspectorSection>

                {/* Owner Info */}
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
                    <div className="flex gap-[var(--bb-space-2)]">
                      <Button variant="outline" size="sm" onClick={handleViewOwner}>
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
                  </div>
                </InspectorSection>

                {/* Run Assignment Info */}
                <InspectorSection title="Current Assignment" icon={Play}>
                  <div className="space-y-[var(--bb-space-3)]">
                    {/* Run/Play Area */}
                    <InspectorField label="Run / Play Area" layout="grid">
                      <span className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
                        {displayBooking.runName || 'Not assigned'}
                      </span>
                    </InspectorField>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-[var(--bb-space-4)]">
                      <InspectorField label="Start Time" layout="stacked" icon={Clock}>
                        <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                          {displayBooking.startTime
                            ? formatTimeString(displayBooking.startTime, displayBooking.runAssignedDate || displayBooking.checkIn)
                            : displayBooking.startAt
                              ? formatTime(displayBooking.startAt)
                              : '—'}
                        </span>
                      </InspectorField>
                      <InspectorField label="End Time" layout="stacked" icon={Timer}>
                        <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                          {displayBooking.endTime
                            ? formatTimeString(displayBooking.endTime, displayBooking.runAssignedDate || displayBooking.checkIn)
                            : displayBooking.endAt
                              ? formatTime(displayBooking.endAt)
                              : '—'}
                        </span>
                      </InspectorField>
                    </div>

                    {/* Activity Type - from Run.run_type */}
                    <InspectorField label="Activity Type" layout="grid">
                      <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)] capitalize">
                        {displayBooking.runType ? displayBooking.runType.toLowerCase() : '—'}
                      </span>
                    </InspectorField>
                  </div>
                </InspectorSection>

                {/* Quick Actions */}
                <InspectorSection title="Quick Actions" icon={ArrowRight}>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1 text-xs"
                      onClick={() => {
                        setSelectedRunId(displayBooking.runId);
                        setAdjustedStartTime(displayBooking.startTime || '');
                        setAdjustedEndTime(displayBooking.endTime || '');
                        setAssignmentView('changeRun');
                      }}
                    >
                      <Home className="w-3.5 h-3.5 shrink-0" />
                      <span>{displayBooking.runAssignmentId ? 'Change Run' : 'Assign Run'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1 text-xs"
                      onClick={() => {
                        setAdjustedStartTime(displayBooking.startTime || '');
                        setAdjustedEndTime(displayBooking.endTime || '');
                        setAssignmentView('adjustTime');
                      }}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Adjust Time</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={() => setShowEndEarlyDialog(true)}
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>End Early</span>
                    </Button>
                  </div>
                </InspectorSection>
              </>
            )}

            {/* Change Run View */}
            {assignmentView === 'changeRun' && (
              <div className="p-4 space-y-4">
                {/* Back button header */}
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--bb-color-border-subtle)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssignmentView('main')}
                    className="p-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h3 className="font-semibold text-[var(--bb-color-text-primary)]">
                    {displayBooking.runAssignmentId ? 'Change Run / Play Area' : 'Assign Run / Play Area'}
                  </h3>
                </div>

                {/* Current assignment - only show if already assigned */}
                {displayBooking.runAssignmentId && (
                  <div className="p-3 rounded-lg bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]">
                    <p className="text-xs text-[var(--bb-color-text-muted)] mb-1">Currently assigned to:</p>
                    <p className="font-medium text-[var(--bb-color-text-primary)]">{displayBooking.runName || 'Not assigned'}</p>
                  </div>
                )}

                {/* Run options */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--bb-color-text-primary)]">Select run:</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {runTemplates.length === 0 ? (
                      <p className="text-sm text-[var(--bb-color-text-muted)] py-4 text-center">No runs available</p>
                    ) : (
                      runTemplates.map((run) => (
                        <button
                          key={run.recordId || run.id}
                          type="button"
                          onClick={() => setSelectedRunId(run.recordId || run.id)}
                          className={cn(
                            'w-full p-3 rounded-lg border text-left transition-all',
                            selectedRunId === (run.recordId || run.id)
                              ? 'border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]'
                              : 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-accent)] hover:bg-[var(--bb-color-bg-elevated)]'
                          )}
                        >
                          <p className="font-medium text-[var(--bb-color-text-primary)]">{run.name}</p>
                          <p className="text-xs text-[var(--bb-color-text-muted)]">
                            {run.type || 'Standard'} • Capacity: {run.maxCapacity || 1}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Time selection - show when creating new assignment */}
                {!displayBooking.runAssignmentId && (
                  <div className="space-y-3 pt-2 border-t border-[var(--bb-color-border-subtle)]">
                    <p className="text-sm font-medium text-[var(--bb-color-text-primary)]">Set schedule:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--bb-color-text-muted)] mb-1">Start Time</label>
                        <select
                          value={adjustedStartTime}
                          onChange={(e) => setAdjustedStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: 'var(--bb-color-bg-body)',
                            borderColor: 'var(--bb-color-border-subtle)',
                            color: 'var(--bb-color-text-primary)',
                          }}
                        >
                          <option value="">Select time</option>
                          {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => (
                            <>
                              <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                                {formatTimeString(`${hour.toString().padStart(2, '0')}:00`)}
                              </option>
                              <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                                {formatTimeString(`${hour.toString().padStart(2, '0')}:30`)}
                              </option>
                            </>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--bb-color-text-muted)] mb-1">End Time</label>
                        <select
                          value={adjustedEndTime}
                          onChange={(e) => setAdjustedEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm"
                          style={{
                            backgroundColor: 'var(--bb-color-bg-body)',
                            borderColor: 'var(--bb-color-border-subtle)',
                            color: 'var(--bb-color-text-primary)',
                          }}
                        >
                          <option value="">Select time</option>
                          {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => (
                            <>
                              <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                                {formatTimeString(`${hour.toString().padStart(2, '0')}:00`)}
                              </option>
                              <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                                {formatTimeString(`${hour.toString().padStart(2, '0')}:30`)}
                              </option>
                            </>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[var(--bb-color-border-subtle)]">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setAssignmentView('main')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={!selectedRunId || selectedRunId === displayBooking.runId || updateAssignmentMutation.isPending || assignPetsToRunMutation.isPending}
                    onClick={async () => {
                      const assignmentId = displayBooking.runAssignmentId;
                      const petId = displayBooking.pet?.id || displayBooking.pet?.recordId;
                      const bookingId = displayBooking.id || displayBooking.recordId;
                      const today = new Date().toISOString().split('T')[0];

                      try {
                        if (assignmentId) {
                          // Update existing assignment
                          await updateAssignmentMutation.mutateAsync({
                            assignmentId,
                            runId: selectedRunId,
                            date: today,
                          });
                        } else {
                          // Create new assignment with times
                          await assignPetsToRunMutation.mutateAsync({
                            runId: selectedRunId,
                            petIds: petId ? [petId] : [],
                            bookingIds: bookingId ? [bookingId] : [],
                            date: today,
                            startTime: adjustedStartTime || undefined,
                            endTime: adjustedEndTime || undefined,
                          });
                        }
                        toast.success('Run assigned successfully');
                        setAssignmentView('main'); // Go back to main view instead of closing
                      } catch (error) {
                        toast.error(error?.message || 'Failed to assign run');
                      }
                    }}
                  >
                    {(updateAssignmentMutation.isPending || assignPetsToRunMutation.isPending) ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}

            {/* Adjust Time View */}
            {assignmentView === 'adjustTime' && (
              <div className="p-4 space-y-4">
                {/* Back button header */}
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--bb-color-border-subtle)]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAssignmentView('main')}
                    className="p-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h3 className="font-semibold text-[var(--bb-color-text-primary)]">Adjust Time</h3>
                </div>

                {/* Current times */}
                <div className="p-3 rounded-lg bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]">
                  <p className="text-xs text-[var(--bb-color-text-muted)] mb-1">Current schedule:</p>
                  <p className="font-medium text-[var(--bb-color-text-primary)]">
                    {displayBooking.startTime ? formatTimeString(displayBooking.startTime) : '—'} → {displayBooking.endTime ? formatTimeString(displayBooking.endTime) : '—'}
                  </p>
                </div>

                {/* Time inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
                      Start Time
                    </label>
                    <select
                      value={adjustedStartTime}
                      onChange={(e) => setAdjustedStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--bb-color-bg-body)',
                        borderColor: 'var(--bb-color-border-subtle)',
                        color: 'var(--bb-color-text-primary)',
                      }}
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => (
                        <>
                          <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                            {formatTimeString(`${hour.toString().padStart(2, '0')}:00`)}
                          </option>
                          <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                            {formatTimeString(`${hour.toString().padStart(2, '0')}:30`)}
                          </option>
                        </>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
                      End Time
                    </label>
                    <select
                      value={adjustedEndTime}
                      onChange={(e) => setAdjustedEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        backgroundColor: 'var(--bb-color-bg-body)',
                        borderColor: 'var(--bb-color-border-subtle)',
                        color: 'var(--bb-color-text-primary)',
                      }}
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 15 }, (_, i) => i + 6).map((hour) => (
                        <>
                          <option key={`${hour}:00`} value={`${hour.toString().padStart(2, '0')}:00`}>
                            {formatTimeString(`${hour.toString().padStart(2, '0')}:00`)}
                          </option>
                          <option key={`${hour}:30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                            {formatTimeString(`${hour.toString().padStart(2, '0')}:30`)}
                          </option>
                        </>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick adjust buttons */}
                <div>
                  <p className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">Quick adjust end time:</p>
                  <div className="flex flex-wrap gap-2">
                    {['-1 hr', '-30 min', '+30 min', '+1 hr', '+2 hr'].map((label) => (
                      <Button
                        key={label}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          if (!adjustedEndTime) return;
                          const [h, m] = adjustedEndTime.split(':').map(Number);
                          let totalMinutes = h * 60 + m;
                          if (label === '-1 hr') totalMinutes -= 60;
                          if (label === '-30 min') totalMinutes -= 30;
                          if (label === '+30 min') totalMinutes += 30;
                          if (label === '+1 hr') totalMinutes += 60;
                          if (label === '+2 hr') totalMinutes += 120;
                          totalMinutes = Math.max(6 * 60, Math.min(20 * 60, totalMinutes)); // Clamp 6am-8pm
                          const newHour = Math.floor(totalMinutes / 60);
                          const newMin = totalMinutes % 60;
                          setAdjustedEndTime(`${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-[var(--bb-color-border-subtle)]">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setAssignmentView('main')}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={!adjustedStartTime || !adjustedEndTime || updateAssignmentMutation.isPending}
                    onClick={async () => {
                      const assignmentId = displayBooking.runAssignmentId;
                      if (!assignmentId) {
                        toast.error('No assignment ID found');
                        return;
                      }
                      try {
                        await updateAssignmentMutation.mutateAsync({
                          assignmentId,
                          startTime: adjustedStartTime,
                          endTime: adjustedEndTime,
                          date: new Date().toISOString().split('T')[0],
                        });
                        toast.success('Time adjusted successfully');
                        onClose(); // Close to refresh data
                      } catch (error) {
                        toast.error(error?.message || 'Failed to adjust time');
                      }
                    }}
                  >
                    {updateAssignmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== BOOKING TAB ===== */}
        {activeTab === 'booking' && (
          <>
            {/* Check In / Check Out Action Buttons - Prominent placement */}
            {(() => {
              const status = displayBooking.status;

              // Compare dates only (not times) - check if check-in is tomorrow or later
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const checkInDate = displayBooking.checkIn ? new Date(displayBooking.checkIn) : null;
              const checkInDateOnly = checkInDate ? new Date(checkInDate) : null;
              if (checkInDateOnly) checkInDateOnly.setHours(0, 0, 0, 0);
              const isFutureBooking = checkInDateOnly && checkInDateOnly > today;

              // Already checked out - show badge
              if (status === 'CHECKED_OUT') {
                return (
                  <div className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] border-b border-[var(--bb-color-border-subtle)]">
                    <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                      <CheckCircle className="w-5 h-5 text-[var(--bb-color-status-positive)]" />
                      <span className="text-sm font-medium text-[var(--bb-color-text-muted)]">
                        Checked Out
                      </span>
                    </div>
                  </div>
                );
              }

              // Cancelled - no buttons
              if (status === 'CANCELLED') {
                return null;
              }

              // Currently checked in - show check out button
              if (status === 'CHECKED_IN') {
                return (
                  <div className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] border-b border-[var(--bb-color-border-subtle)]">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-amber-500 hover:bg-amber-600"
                      onClick={handleCheckOut}
                      disabled={checkOutMutation.isPending}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  </div>
                );
              }

              // Future booking (tomorrow or later) - show scheduled state
              if (isFutureBooking) {
                return (
                  <div className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] border-b border-[var(--bb-color-border-subtle)]">
                    <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                      <Clock className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--bb-color-text-muted)]">
                        Scheduled for {tz.formatDate(checkInDate, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              }

              // Ready to check in (CONFIRMED or PENDING status, today or past)
              if (status === 'CONFIRMED' || status === 'PENDING') {
                return (
                  <div className="px-[var(--bb-space-4)] py-[var(--bb-space-3)] border-b border-[var(--bb-color-border-subtle)]">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
                    </Button>
                  </div>
                );
              }

              return null;
            })()}

            {/* Booking Details */}
            <InspectorSection title="Schedule" icon={Calendar}>
              <div className="grid grid-cols-2 gap-[var(--bb-space-4)]">
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
              </div>
              {/* Kennel Assignment - Inline Dropdown */}
              <div className="mt-[var(--bb-space-3)] pt-[var(--bb-space-3)] border-t border-[var(--bb-color-border-subtle)] relative" ref={kennelDropdownRef}>
                <InspectorField label="Assigned Kennel" icon={Home}>
                  <button
                    type="button"
                    onClick={() => setShowKennelDropdown(!showKennelDropdown)}
                    className={cn(
                      'flex items-center justify-between w-full px-2 py-1 -mx-2 rounded-md transition-colors',
                      'hover:bg-[var(--bb-color-bg-elevated)] cursor-pointer',
                      !displayBooking.kennel.name && 'text-[var(--bb-color-status-warning)]'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)]">
                        {fullKennelData?.name || 'Unassigned'}
                      </span>
                      {fullKennelData?.name && (fullKennelData?.building || fullKennelData?.floor) && (
                        <span className="text-xs text-[var(--bb-color-text-muted)]">
                          {[fullKennelData.building, fullKennelData.floor].filter(Boolean).join(' - ')}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform',
                      showKennelDropdown && 'rotate-180'
                    )} />
                  </button>
                </InspectorField>

                {/* Kennel Dropdown */}
                {showKennelDropdown && (
                  <div
                    className="absolute left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
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
            </InspectorSection>

            {/* Notes */}
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

            {/* Billing */}
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
          </>
        )}

        {/* Footer Actions */}
        <InspectorFooter>
          <div className="flex items-center justify-between w-full">
            {/* Left: Cancel booking (only on booking tab and if we have a valid ID) */}
            {activeTab === 'booking' && displayBooking.status !== 'CANCELLED' && displayBooking.status !== 'CHECKED_OUT' && hasValidBookingId && (
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
            {(activeTab === 'assignment' || displayBooking.status === 'CANCELLED' || displayBooking.status === 'CHECKED_OUT' || !hasValidBookingId) && <div />}

            {/* Right: Primary actions */}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {/* Booking tab actions only */}
              {activeTab === 'booking' && (
                <>
                  {/* Show Check In - will open create flow if no ID */}
                  {displayBooking.status === 'CONFIRMED' && hasValidBookingId && (
                    <Button
                      variant="primary"
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
                      {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
                    </Button>
                  )}
                  {/* Show Save Booking if ID is missing - opens create flow */}
                  {!hasValidBookingId && (
                    <Button
                      variant="primary"
                      onClick={() => openCreateBookingWithPrefill()}
                    >
                      <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
                      Save Booking
                    </Button>
                  )}
                  {displayBooking.status === 'CHECKED_IN' && hasValidBookingId && (
                    <Button
                      variant="primary"
                      onClick={handleCheckOut}
                      disabled={checkOutMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2)]" />
                      {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  )}
                  {onEdit && displayBooking.status !== 'CANCELLED' && hasValidBookingId && (
                    <Button variant="outline" onClick={onEdit}>
                      <Edit2 className="w-4 h-4 mr-[var(--bb-space-2)]" />
                      Edit
                    </Button>
                  )}
                </>
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

      {/* Quick Checkout Confirmation - shown if check-in was < 5 minutes ago */}
      <ConfirmDialog
        isOpen={showQuickCheckoutDialog}
        onClose={() => setShowQuickCheckoutDialog(false)}
        onConfirm={executeCheckOut}
        title="Quick Check Out"
        message={`${displayBooking.pet.name || 'This pet'} was just checked in less than 5 minutes ago. Are you sure you want to check them out?`}
        confirmText="Yes, Check Out"
        cancelText="Cancel"
        variant="warning"
        isLoading={checkOutMutation.isPending}
      />

      {/* End Early Confirmation */}
      <ConfirmDialog
        isOpen={showEndEarlyDialog}
        onClose={() => setShowEndEarlyDialog(false)}
        onConfirm={async () => {
          try {
            const runId = displayBooking.runId;
            const petId = displayBooking.pet?.recordId || displayBooking.pet?.id || displayBooking.petId;
            // Use runAssignmentId (the actual RunAssignment.record_id), not id (which is booking ID)
            const assignmentId = displayBooking.runAssignmentId || displayBooking.assignmentId;
            const date = displayBooking.assignedDate || new Date().toISOString().split('T')[0];

            if (!runId || !petId) {
              toast.error('Missing run or pet information');
              return;
            }

            await removeFromRunMutation.mutateAsync({
              runId,
              petIds: [petId],
              assignmentIds: assignmentId ? [assignmentId] : undefined,
              date,
            });

            toast.success(`${displayBooking.pet?.name || 'Pet'}'s run assignment ended`);
            setShowEndEarlyDialog(false);
            onClose?.();
          } catch (error) {
            console.error('[BookingDetail] End early failed:', error);
            toast.error(error?.message || 'Failed to end assignment');
          }
        }}
        title="End Assignment Early"
        message={`Are you sure you want to end ${displayBooking.pet?.name || 'this pet'}'s run assignment early? They were scheduled until ${displayBooking.endTime ? formatTimeString(displayBooking.endTime) : 'the end of their session'}.`}
        confirmText="Yes, End Now"
        cancelText="Keep Running"
        variant="warning"
        isLoading={removeFromRunMutation.isPending}
      />
    </>
  );
};

export default BookingDetailModal;
