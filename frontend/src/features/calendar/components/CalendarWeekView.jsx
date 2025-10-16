import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Home, Scissors, Pill } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useKennels } from '@/features/kennels/api';
import { useBookingsQuery } from '@/features/bookings/api';

const CalendarWeekView = ({ currentDate, onDateChange, onBookingClick, filters }) => {
  const [currentWeek, setCurrentWeek] = useState(currentDate);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch real data
  const { data: kennelsData, isLoading: kennelsLoading } = useKennels();
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery({
    from: format(weekStart, 'yyyy-MM-dd'),
    to: format(weekEnd, 'yyyy-MM-dd')
  });

  const kennels = kennelsData || [];
  const bookings = bookingsData?.data || [];

  const isLoading = kennelsLoading || bookingsLoading;

  const getBookingsForDayAndKennel = (day, kennelId) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return bookings.filter(booking => {
      const checkInDate = format(new Date(booking.checkIn), 'yyyy-MM-dd');
      const checkOutDate = format(new Date(booking.checkOut), 'yyyy-MM-dd');
      // Check if this booking overlaps with the day and is assigned to this kennel
      const assignedToKennel = booking.segments?.some(seg => seg.kennelId === kennelId);
      return assignedToKennel && checkInDate <= dayStr && checkOutDate >= dayStr;
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-96" />
      </Card>
    );
  }

  const getServiceIcon = (service) => {
    switch (service) {
      case 'boarding': return Home;
      case 'daycare': return Calendar;
      case 'grooming': return Scissors;
      default: return Home;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'checked-in': return 'bg-green-100 border-green-300 text-green-800';
      case 'checked-out': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getCapacityPercentage = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(booking => {
      const checkInDate = format(new Date(booking.checkIn), 'yyyy-MM-dd');
      const checkOutDate = format(new Date(booking.checkOut), 'yyyy-MM-dd');
      return checkInDate <= dayStr && checkOutDate >= dayStr;
    });
    return Math.round((dayBookings.length / 5) * 100); // 5 kennels total
  };

  const handlePreviousWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onDateChange(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onDateChange(newWeek);
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
    onDateChange(new Date());
  };

  return (
    <Card className="p-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button variant="secondary" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>All Services</span>
          <span>•</span>
          <span>All Kennels</span>
          <span>•</span>
          <span>Show: Bookings</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-8 border border-gray-200 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="bg-gray-50 border-r border-gray-200 p-4 font-semibold text-gray-900">
              Kennel
            </div>
            {days.map((day) => {
              const capacityPercent = getCapacityPercentage(day);
              const isHigh = capacityPercent >= 90;
              const isCritical = capacityPercent >= 95;

              return (
                <div key={day.toISOString()} className="bg-gray-50 border-r border-gray-200 p-4 text-center">
                  <div className="font-semibold text-gray-900">{format(day, 'EEE')}</div>
                  <div className="text-sm text-gray-600 mt-1">{format(day, 'MMM d')}</div>
                  <div className="text-xs text-gray-500 mt-1">{capacityPercent}%</div>
                  {isHigh && (
                    <div className={`text-xs mt-1 ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                      {isCritical ? '🔥' : '⚠️'}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Kennel Rows */}
            {kennels.map((kennel) => (
              <div key={kennel.id} className="contents">
                {/* Kennel Header */}
                <div className="bg-gray-50 border-r border-gray-200 p-4 font-medium text-gray-900 border-t">
                  <div className="font-semibold">{kennel.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{kennel.size}</div>
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const dayBookings = getBookingsForDayAndKennel(day, kennel.id);
                  const capacityPercent = getCapacityPercentage(day);
                  const isFull = capacityPercent >= 100;

                  return (
                    <div
                      key={`${kennel.id}-${day.toISOString()}`}
                      className={`min-h-[120px] border-r border-t border-gray-200 p-2 ${
                        isFull ? 'bg-red-50' : capacityPercent >= 90 ? 'bg-orange-50' : 'bg-white'
                      }`}
                    >
                      {dayBookings.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          {!isFull && (
                            <Button size="sm" variant="ghost" className="text-xs opacity-50">
                              + Add
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {dayBookings.map((booking) => {
                            const ServiceIcon = getServiceIcon(booking.service);
                            const isCheckInDay = booking.startDate === format(day, 'yyyy-MM-dd');
                            const isCheckOutDay = booking.endDate === format(day, 'yyyy-MM-dd');

                            return (
                              <div
                                key={booking.id}
                                onClick={() => onBookingClick(booking)}
                                className={`rounded border p-2 text-xs cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(booking.status)}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1">
                                    <ServiceIcon className="w-3 h-3" />
                                    <span className="font-medium">{booking.pet.name}</span>
                                  </div>
                                  {booking.medication && <Pill className="w-3 h-3 text-orange-600" />}
                                </div>
                                <div className="text-xs opacity-75">{booking.owner.name}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  {isCheckInDay && <span className="text-xs">🔴</span>}
                                  {isCheckOutDay && <span className="text-xs">🟡</span>}
                                  <span className="text-xs">{format(day, 'HH:mm')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-blue-600" />
          <span>Boarding</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          <span>Daycare</span>
        </div>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-purple-600" />
          <span>Grooming</span>
        </div>
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-orange-600" />
          <span>Medication Required</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-500">🔴</span>
          <span>Check-in Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-500">🟡</span>
          <span>Check-out Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500">🟢</span>
          <span>Mid-stay</span>
        </div>
      </div>
    </Card>
  );
};

export default CalendarWeekView;
