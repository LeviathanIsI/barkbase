import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { useCalendarViewQuery, useOccupancyQuery, useReassignKennelMutation } from '../api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';

const BookingCard = ({ booking, isDragging = false }) => {
  const petName = booking.pet?.name ?? booking.petName ?? 'Pet';
  const ownerName = booking.owner
    ? `${booking.owner.firstName} ${booking.owner.lastName}`.trim()
    : 'Owner';

  const statusColors = {
    PENDING: 'bg-yellow-50 dark:bg-surface-primary border-l-yellow-500 text-yellow-800 dark:text-yellow-200',
    CONFIRMED: 'bg-blue-50 dark:bg-surface-primary border-l-blue-500 text-blue-800 dark:text-blue-200',
    IN_PROGRESS: 'bg-green-50 dark:bg-surface-primary border-l-green-500 text-green-800 dark:text-green-200',
    CHECKED_IN: 'bg-green-50 dark:bg-surface-primary border-l-green-500 text-green-800 dark:text-green-200',
    CHECKED_OUT: 'bg-gray-50 dark:bg-surface-secondary border-l-gray-500 text-gray-800 dark:text-text-primary',
    COMPLETED: 'bg-gray-50 dark:bg-surface-secondary border-l-gray-500 text-gray-600 dark:text-text-secondary',
    CANCELLED: 'bg-red-50 dark:bg-surface-primary border-l-red-500 text-red-800 dark:text-red-200',
  };

  const colorClass = statusColors[booking.status] || statusColors.PENDING;

  return (
    <div
      className={`rounded-lg border-l-4 p-3 text-sm shadow-sm transition-all duration-200 hover:shadow-md ${colorClass} ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      <div className="font-semibold text-gray-900 dark:text-text-primary truncate">{petName}</div>
      <div className="text-xs text-gray-600 dark:text-text-secondary truncate">{ownerName}</div>
      <div className="mt-2 text-xs font-medium text-gray-900 dark:text-text-primary">
        {format(parseISO(booking.checkIn), 'HH:mm')} - {format(parseISO(booking.checkOut), 'HH:mm')}
      </div>
    </div>
  );
};

const DraggableBooking = ({ booking, segmentId }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ recordId: `booking-${segmentId}`,
    data: { booking, segmentId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="mb-2 cursor-move">
      <BookingCard booking={booking} isDragging={isDragging} />
    </div>
  );
};

const KennelColumn = ({ kennel, day, bookings, occupancy }) => {
  const { isOver, setNodeRef } = useDroppable({ recordId: `kennel-${kennel.recordId}-${format(day, 'yyyy-MM-dd')}`,
    data: { kennelId: kennel.recordId, date: day },
  });

  const dayBookings = bookings.filter((booking) => {
    const segments = booking.segments || [];
    return segments.some((seg) => {
      if (seg.kennelId !== kennel.recordId) return false;
      const segStart = parseISO(seg.startDate);
      const segEnd = parseISO(seg.endDate);
      return isSameDay(segStart, day) || (segStart <= day && segEnd >= day);
    });
  });

  const kennelOccupancy = occupancy?.kennels?.find((k) => k.kennel.recordId === kennel.recordId);
  const utilizationPercent = kennelOccupancy?.utilizationPercent ?? 0;

  const heatmapColor =
    utilizationPercent === 0
      ? 'bg-gray-50 dark:bg-surface-secondary'
      : utilizationPercent < 50
        ? 'bg-green-50 dark:bg-surface-primary'
        : utilizationPercent < 80
          ? 'bg-yellow-50 dark:bg-surface-primary'
          : utilizationPercent < 100
            ? 'bg-orange-50 dark:bg-surface-primary'
            : 'bg-red-50 dark:bg-surface-primary';

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] border-r border-b p-2 ${heatmapColor} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      {dayBookings.map((booking) => {
        const segment = booking.segments?.find((seg) => seg.kennelId === kennel.recordId);
        return segment ? <DraggableBooking key={segment.recordId} booking={booking} segmentId={segment.recordId} /> : null;
      })}
    </div>
  );
};

const CapacityHeatmap = ({ occupancy }) => {
  if (!occupancy) return null;

  return (
    <div className="bg-white dark:bg-surface-primary rounded-lg border border-gray-300 dark:border-surface-border p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Capacity Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary-600">{occupancy.summary.overallUtilization}%</div>
          <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">Overall Utilization</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-text-primary">{occupancy.summary.totalOccupied}</div>
          <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">Occupied</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-success-600">{occupancy.summary.totalAvailable}</div>
          <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">Available</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-text-primary">{occupancy.summary.totalCapacity}</div>
          <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">Total Capacity</div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary"></div>
          <span className="text-gray-600 dark:text-text-secondary">Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-surface-border bg-green-50 dark:bg-surface-primary"></div>
          <span className="text-gray-600 dark:text-text-secondary">&lt;50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-surface-border bg-yellow-50 dark:bg-surface-primary"></div>
          <span className="text-gray-600 dark:text-text-secondary">50-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-surface-border bg-orange-50 dark:bg-surface-primary"></div>
          <span className="text-gray-600 dark:text-text-secondary">80-100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-surface-border bg-red-50 dark:bg-surface-primary"></div>
          <span className="text-gray-600 dark:text-text-secondary">Full</span>
        </div>
      </div>
    </div>
  );
};

const WeekView = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeId, setActiveId] = useState(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const calendarQuery = useCalendarViewQuery({
    from: startOfDay(weekStart).toISOString(),
    to: endOfDay(weekEnd).toISOString(),
  });

  const occupancyQuery = useOccupancyQuery({
    from: startOfDay(weekStart).toISOString(),
    to: endOfDay(weekEnd).toISOString(),
  });

  const reassignMutation = useReassignKennelMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const kennels = useMemo(() => {
    const bookings = calendarQuery.data?.bookings || [];
    const kennelMap = new Map();

    bookings.forEach((booking) => {
      booking.segments?.forEach((segment) => {
        if (segment.kennel && !kennelMap.has(segment.kennel.recordId)) {
          kennelMap.set(segment.kennel.recordId, segment.kennel);
        }
      });
    });

    return Array.from(kennelMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [calendarQuery.data]);

  const handleDragStart = (event) => {
    setActiveId(event.active.recordId);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    const { segmentId, booking } = activeData;
    const { kennelId, date } = overData;

    // If dropped on the same kennel and same day, do nothing
    const segment = booking.segments?.find((s) => s.recordId === segmentId);
    if (segment && segment.kennelId === kennelId && isSameDay(parseISO(segment.startDate), date)) {
      return;
    }

    try {
      await reassignMutation.mutateAsync({
        segmentId,
        kennelId,
        startDate: startOfDay(date).toISOString(),
        endDate: endOfDay(date).toISOString(),
      });
      toast.success('Booking reassigned successfully');
    } catch (error) {
      toast.error(error?.message ?? 'Failed to reassign booking');
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  if (calendarQuery.isLoading || occupancyQuery.isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (calendarQuery.isError || occupancyQuery.isError) {
    return (
      <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">Failed to load calendar data</div>
        <div className="text-sm text-red-500">Please try again or contact support if the issue persists.</div>
      </div>
    );
  }

  const bookings = calendarQuery.data?.bookings || [];
  const activeBooking = activeId
    ? bookings.find((b) => b.segments?.some((s) => `booking-${s.recordId}` === activeId))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            ← Previous
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            Next →
          </Button>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
      </div>

      <CapacityHeatmap occupancy={occupancyQuery.data} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-8 border border-gray-300 dark:border-surface-border rounded-lg overflow-hidden bg-white dark:bg-surface-primary shadow-sm">
              {/* Header row */}
              <div className="bg-gray-100 dark:bg-gray-700 border-r border-gray-300 dark:border-surface-border p-4 font-semibold text-gray-900 dark:text-text-primary sticky left-0">Kennel</div>
              {days.map((day) => (
                <div key={day.toISOString()} className="bg-gray-100 dark:bg-gray-700 border-r border-gray-300 dark:border-surface-border p-4 text-center">
                  <div className="font-semibold text-gray-900 dark:text-text-primary">{format(day, 'EEE')}</div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">{format(day, 'MMM d')}</div>
                </div>
              ))}

              {/* Kennel rows */}
              {kennels.length === 0 ? (
                <div className="col-span-8 p-12 text-center">
                  <div className="text-gray-600 dark:text-text-secondary mb-2">No kennels with bookings found for this week</div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">Add bookings or configure kennels to see them here.</div>
                </div>
              ) : (
                kennels.map((kennel) => (
                  <div key={kennel.recordId} className="contents">
                    <div className="bg-gray-100 dark:bg-gray-700 border-r border-gray-300 dark:border-surface-border p-4 font-medium text-gray-900 dark:text-text-primary sticky left-0">
                      <div className="font-semibold">{kennel.name}</div>
                      <Badge variant="neutral" className="text-xs mt-1">
                        {kennel.type}
                      </Badge>
                    </div>
                    {days.map((day) => (
                      <KennelColumn
                        key={`${kennel.recordId}-${day.toISOString()}`}
                        kennel={kennel}
                        day={day}
                        bookings={bookings}
                        occupancy={occupancyQuery.data}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId && activeBooking ? <BookingCard booking={activeBooking} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default WeekView;
