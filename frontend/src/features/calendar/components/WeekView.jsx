import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, parseISO, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { useCalendarViewQuery, useOccupancyQuery, useReassignKennelMutation } from '../api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

const BookingCard = ({ booking, isDragging = false }) => {
  const petName = booking.pet?.name ?? booking.petName ?? 'Pet';
  const ownerName = booking.owner
    ? `${booking.owner.firstName} ${booking.owner.lastName}`.trim()
    : 'Owner';

  const statusColors = {
    PENDING: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    CONFIRMED: 'bg-blue-100 border-blue-300 text-blue-800',
    IN_PROGRESS: 'bg-green-100 border-green-300 text-green-800',
    CHECKED_IN: 'bg-green-100 border-green-300 text-green-800',
    CHECKED_OUT: 'bg-gray-100 border-gray-300 text-gray-800',
    COMPLETED: 'bg-gray-100 border-gray-300 text-gray-600',
    CANCELLED: 'bg-red-100 border-red-300 text-red-800',
  };

  const colorClass = statusColors[booking.status] || statusColors.PENDING;

  return (
    <div
      className={`rounded border-l-4 p-2 text-xs shadow-sm transition-shadow hover:shadow-md ${colorClass} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-semibold truncate">{petName}</div>
      <div className="text-xs opacity-75 truncate">{ownerName}</div>
      <div className="mt-1 text-xs">
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
      ? 'bg-gray-50'
      : utilizationPercent < 50
        ? 'bg-green-50'
        : utilizationPercent < 80
          ? 'bg-yellow-50'
          : utilizationPercent < 100
            ? 'bg-orange-50'
            : 'bg-red-50';

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
    <div className="rounded-lg border border-border bg-surface p-4 mb-4">
      <h3 className="font-semibold mb-3">Capacity Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{occupancy.summary.overallUtilization}%</div>
          <div className="text-sm text-muted">Overall Utilization</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{occupancy.summary.totalOccupied}</div>
          <div className="text-sm text-muted">Occupied</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{occupancy.summary.totalAvailable}</div>
          <div className="text-sm text-muted">Available</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{occupancy.summary.totalCapacity}</div>
          <div className="text-sm text-muted">Total Capacity</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-50 border"></div>
          <span>Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-50 border"></div>
          <span>&lt;50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-50 border"></div>
          <span>50-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-50 border"></div>
          <span>80-100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border"></div>
          <span>Full</span>
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
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
        Failed to load calendar data. Please try again.
      </div>
    );
  }

  const bookings = calendarQuery.data?.bookings || [];
  const activeBooking = activeId
    ? bookings.find((b) => b.segments?.some((s) => `booking-${s.recordId}` === activeId))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePreviousWeek}>
            ← Previous
          </Button>
          <Button variant="secondary" onClick={handleToday}>
            Today
          </Button>
          <Button variant="secondary" onClick={handleNextWeek}>
            Next →
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
      </div>

      <CapacityHeatmap occupancy={occupancyQuery.data} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-8 border border-border rounded-lg overflow-hidden bg-white">
              {/* Header row */}
              <div className="bg-surface border-r border-b p-2 font-semibold sticky left-0">Kennel</div>
              {days.map((day) => (
                <div key={day.toISOString()} className="bg-surface border-r border-b p-2 text-center">
                  <div className="font-semibold">{format(day, 'EEE')}</div>
                  <div className="text-sm text-muted">{format(day, 'MMM d')}</div>
                </div>
              ))}

              {/* Kennel rows */}
              {kennels.length === 0 ? (
                <div className="col-span-8 p-8 text-center text-muted">
                  No kennels with bookings found for this week. Add bookings or configure kennels to see them here.
                </div>
              ) : (
                kennels.map((kennel) => (
                  <div key={kennel.recordId} className="contents">
                    <div className="bg-surface border-r border-b p-2 font-medium sticky left-0">
                      <div>{kennel.name}</div>
                      <Badge variant="neutral" className="text-xs">
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
