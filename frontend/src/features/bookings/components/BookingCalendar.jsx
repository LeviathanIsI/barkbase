import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfDay, startOfWeek, addDays, subDays } from 'date-fns';
import { DndContext, useDroppable, useDraggable } from '@dnd-kit/core';
import { CalendarCheck2, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import Modal from '@/components/ui/Modal';
import { useBookingsQuery, updateBooking } from '../api';
import CheckInModal from './CheckInModal';
import CheckOutModal from './CheckOutModal';
import QuickCheckIn from './QuickCheckIn';
import WaitlistManager from './WaitlistManager';
import { useKennelAvailability } from '@/features/kennels/api';
import { cn } from '@/lib/cn';
import { useBookingStore } from '@/stores/booking';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { getSocket } from '@/lib/socket';
import { useTerminology } from '@/lib/terminology';

const fallbackKennels = [
  { recordId: 'deluxe-1', name: 'Deluxe Suite 1', type: 'suite' },
  { recordId: 'deluxe-2', name: 'Deluxe Suite 2', type: 'suite' },
  { recordId: 'standard-1', name: 'Standard Kennel 1', type: 'kennel' },
  { recordId: 'standard-2', name: 'Standard Kennel 2', type: 'kennel' },
  { recordId: 'daycare-1', name: 'Daycare Pod A', type: 'daycare' },
];

const statusVariant = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CHECKED_IN: 'success',
  CHECKED_OUT: 'neutral',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
};


const BookingCard = ({ booking, onCheckIn, onCheckOut }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ recordId: booking.recordId,
    data: { bookingId: booking.recordId },
  });

  const transformStyle = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;

  const handleCheckInClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onCheckIn?.(booking);
  };

  const handleCheckOutClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onCheckOut?.(booking);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transformStyle,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="cursor-grab rounded-lg border border-border/70 bg-surface p-4 shadow-sm active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">{booking.petName}</p>
          <p className="text-xs text-muted">{booking.ownerName}</p>
        </div>
        <Badge variant={statusVariant[booking.status] ?? 'neutral'}>{booking.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarCheck2 className="h-3.5 w-3.5" />
          {format(parseISO(booking.dateRange.start), 'MMM d')} – {format(parseISO(booking.dateRange.end), 'MMM d')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Deposit: ${booking.deposit}
        </span>
      </div>
      {booking.services?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {booking.services.map((service) => (
            <Badge key={service} variant="info" className="capitalize">
              {service}
            </Badge>
          ))}
        </div>
      ) : null}
      {booking.specialInstructions && (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <FileText className="mt-0.5 h-3.5 w-3.5" />
          {booking.specialInstructions}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {['CONFIRMED', 'PENDING'].includes(booking.status) ? (
          <Button type="button" size="sm" onClick={handleCheckInClick}>
            Check In
          </Button>
        ) : null}
        {['CHECKED_IN', 'IN_PROGRESS'].includes(booking.status) ? (
          <Button type="button" size="sm" variant="outline" onClick={handleCheckOutClick}>
            Check Out
          </Button>
        ) : null}
      </div>
    </div>
  );
};

const KennelColumn = ({ kennel, date, bookings, onNavigate, onCheckIn, onCheckOut, terminology }) => {
  const { setNodeRef, isOver } = useDroppable({ recordId: `slot-${kennel.recordId}-${format(date, 'yyyy-MM-dd')}`,
    data: { kennelId: kennel.recordId, date },
  });

  return (
    <div className="flex min-w-[18rem] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">
            {terminology?.getDisplayName(kennel.type, kennel.name, kennel.number) || kennel.name}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted">{format(date, 'EEE, MMM d')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.(kennel.recordId)}>
          Details
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[12rem] flex-col gap-3 rounded-lg border border-dashed border-border/70 bg-surface/80 p-3 transition-colors',
          isOver && 'border-primary bg-primary/10',
        )}
      >
        {bookings.length === 0 ? (
          <p className="text-center text-xs text-muted">Drop bookings here</p>
        ) : (
          bookings.map((booking) => (
            <BookingCard
              key={booking.recordId}
              booking={booking}
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
            />
          ))
        )}
      </div>
    </div>
  );
};

const DayPicker = lazy(() => import('react-day-picker').then((mod) => ({ default: mod.DayPicker })));

const BookingCalendar = () => {
  const bookingsQuery = useBookingsQuery();
  const kennelQuery = useKennelAvailability();
  const bookings = useBookingStore((state) => state.bookings);
  const setBookings = useBookingStore((state) => state.setBookings);
  const setWaitlist = useBookingStore((state) => state.setWaitlist);
  const moveBooking = useBookingStore((state) => state.moveBooking);
  const [selectedCheckInBooking, setSelectedCheckInBooking] = useState(null);
  const [selectedCheckOutBooking, setSelectedCheckOutBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const kennels = kennelQuery.data ?? fallbackKennels;
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const terminology = useTerminology();

  useEffect(() => {
    import('react-day-picker/dist/style.css');
  }, []);


  const normaliseBooking = (booking) => ({
    ...booking,
    petName: booking.pet?.name ?? booking.pets?.[0]?.name ?? booking.petName,
    ownerName: booking.owner ? `${booking.owner.firstName} ${booking.owner.lastName}` : booking.ownerName,
    dateRange: { start: booking.checkIn, end: booking.checkOut },
    kennelId:
      booking.kennelId ??
      booking.segments?.[0]?.kennelId ??
      booking.segments?.[0]?.kennel?.recordId ?? null,
    kennelName: booking.kennelName ?? booking.segments?.[0]?.kennel?.name ?? '',
  });

  useEffect(() => {
    if (bookingsQuery.data) {
      const normalised = bookingsQuery.data.map(normaliseBooking);
      setBookings(normalised);
      setWaitlist(normalised.filter((booking) => booking.status === 'PENDING'));
    }
  }, [bookingsQuery.data, setBookings, setWaitlist]);

  useEffect(() => {
    const socket = getSocket();

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(tenantKey) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.occupancy(tenantKey) });
    };

    const events = ['booking:created', 'booking:updated', 'booking:deleted', 'booking:checked-in', 'booking:checked-out', 'booking:update', 'booking:remove'];
    events.forEach((eventName) => socket.on(eventName, refresh));

    return () => {
      events.forEach((eventName) => socket.off(eventName, refresh));
    };
  }, [queryClient, tenantKey]);

  const visibleRange = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const boardBookings = useMemo(() => bookings.filter((booking) => booking.status !== 'PENDING'), [bookings]);

  const grouped = useMemo(() => {
    return visibleRange.map((date) => {
      const isoDate = format(date, 'yyyy-MM-dd');
      return {
        date,
        isoDate,
        kennels: kennels.map((kennel) => ({
          kennel,
          bookings: boardBookings.filter((booking) => {
            if (booking.segments?.length) {
              return booking.segments.some((segment) => {
                const segmentStart = startOfDay(parseISO(segment.startDate));
                const segmentEnd = startOfDay(parseISO(segment.endDate));
                return segment.kennelId === kennel.recordId && segmentStart <= date && date < segmentEnd;
              });
            }
            const start = startOfDay(parseISO(booking.dateRange.start));
            const end = startOfDay(parseISO(booking.dateRange.end));
            return start <= date && date < end && booking.kennelId === kennel.recordId;
          }),
        })),
      };
    });
  }, [boardBookings, kennels, visibleRange]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    const bookingId = active?.recordId;
    const dropData = over.data?.current;
    if (!bookingId || !dropData) return;

    const booking = useBookingStore.getState().bookings.find((item) => item.recordId === bookingId);
    if (!booking) return;

    const dropDate = dropData.date;
    const kennelId = dropData.kennelId ?? booking.kennelId;
    const currentStart = parseISO(booking.dateRange.start);
    const currentEnd = parseISO(booking.dateRange.end);
    const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 0);

    const newStart = new Date(dropDate);
    newStart.setHours(
      currentStart.getHours(),
      currentStart.getMinutes(),
      currentStart.getSeconds(),
      currentStart.getMilliseconds(),
    );
    const newEnd = new Date(newStart.getTime() + durationMs);

    const newRange = {
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    };

    const snapshot = bookings.map((item) => ({
      ...item,
      segments: item.segments ? item.segments.map((segment) => ({ ...segment })) : [],
    }));

    const payload = {
      status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
      checkIn: newRange.start,
      checkOut: newRange.end,
      segments: [
        {
          kennelId,
          startDate: newRange.start,
          endDate: newRange.end,
          status: 'CONFIRMED',
        },
      ],
    };

    moveBooking({ bookingId, targetKennelId: kennelId, targetDate: newRange, status: payload.status });
    const interimState = useBookingStore.getState();
    interimState.setWaitlist(interimState.bookings.filter((item) => item.status === 'PENDING'));

    try {
      const updated = await updateBooking(bookingId, payload);
      if (updated) {
        const normalised = normaliseBooking(updated);
        useBookingStore.getState().upsertBooking(normalised);
        const nextState = useBookingStore.getState();
        nextState.setWaitlist(nextState.bookings.filter((item) => item.status === 'PENDING'));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    } catch (error) {
      setBookings(snapshot);
      setWaitlist(snapshot.filter((item) => item.status === 'PENDING'));
      toast.error(error.message ?? 'Could not move booking. Reverting.');
    }
  };

  return (
    <>
      {/* Quick Check-In and Waitlist - ABOVE the board */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuickCheckIn />
        <WaitlistManager />
      </div>

      {/* Bookings Board - Full width with simple date navigation */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-text">Bookings Board</h3>
              <p className="text-sm text-muted">Drag & drop to adjust kennel assignments and split stays.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate((date) => subDays(date, 1))}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setCalendarPickerOpen(true)}
                className="min-w-[180px] cursor-pointer text-center text-sm font-medium text-text transition-colors hover:text-primary"
              >
                {format(selectedDate, 'MMMM d, yyyy')}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate((date) => addDays(date, 1))}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="ml-2"
              >
                Today
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex w-full snap-x gap-4 overflow-x-auto pb-2">
          <DndContext onDragEnd={handleDragEnd}>
            {grouped.map(({ date, kennels: kennelEntries }) => (
              <div key={format(date, 'yyyy-MM-dd')} className="flex min-w-[18rem] flex-col gap-4">
                {kennelEntries.map(({ kennel, bookings: laneBookings }) => (
                  <KennelColumn
                    key={`${kennel.recordId}-${format(date, 'yyyy-MM-dd')}`}
                    kennel={kennel}
                    date={date}
                    bookings={laneBookings}
                    onCheckIn={setSelectedCheckInBooking}
                    onCheckOut={setSelectedCheckOutBooking}
                    terminology={terminology}
                  />
                ))}
              </div>
            ))}
          </DndContext>
        </div>
      </Card>

      <CheckInModal
        booking={selectedCheckInBooking}
        open={Boolean(selectedCheckInBooking)}
        onClose={() => setSelectedCheckInBooking(null)}
      />
      <CheckOutModal
        booking={selectedCheckOutBooking}
        open={Boolean(selectedCheckOutBooking)}
        onClose={() => setSelectedCheckOutBooking(null)}
      />
      <Modal
        open={calendarPickerOpen}
        onClose={() => setCalendarPickerOpen(false)}
        title="Select Date"
      >
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                setCalendarPickerOpen(false);
              }
            }}
            weekStartsOn={1}
            className="mx-auto"
          />
        </Suspense>
      </Modal>
    </>
  );
};

export default BookingCalendar;
