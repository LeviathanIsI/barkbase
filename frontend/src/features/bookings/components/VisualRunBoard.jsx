import { useState, useRef, useMemo } from 'react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Info,
  AlertCircle,
  Clock,
  User,
  PawPrint,
  MoreVertical,
  Move,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  PhoneCall,
  MessageSquare,
  DollarSign,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';
import StyledSelect from '@/components/ui/StyledSelect';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useRunTemplatesQuery } from '@/features/daycare/api-templates';
import { useBookingsQuery } from '../api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';

/**
 * Visual Run Board / Calendar
 * Fixes "can't look at availability easily (like an open calendar)" problem
 * Resource-style view: rows = runs/rooms, columns = days
 * Drag & drop to extend stays or move between rooms
 */

const VisualRunBoard = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // week, day, month
  const [filterByService, setFilterByService] = useState('all'); // all, boarding, daycare
  const [searchTerm, setSearchTerm] = useState('');
  const tz = useTimezoneUtils();

  const scrollContainerRef = useRef(null);

  // Generate week dates
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);
  const weekStart = weekDates[0].toISOString().split('T')[0];
  const weekEnd = weekDates[6].toISOString().split('T')[0];

  // Fetch run templates and bookings
  const { data: runTemplates = [], isLoading: runsLoading } = useRunTemplatesQuery();
  const { data: apiBookings = [], isLoading: bookingsLoading } = useBookingsQuery({
    startDate: weekStart,
    endDate: weekEnd
  });
  
  // Transform run templates to runs
  const runs = useMemo(() => {
    return runTemplates.map(template => ({
      id: template.recordId,
      name: template.name,
      type: 'standard', // Could be derived from template properties
      capacity: template.maxCapacity || 1,
      floor: '1',
      template
    }));
  }, [runTemplates]);

  // Transform bookings for display
  const bookings = useMemo(() => {
    return apiBookings
      .filter(booking => {
        // Filter by service if needed
        if (filterByService !== 'all') {
          const serviceName = booking.service?.name || '';
          if (filterByService === 'boarding' && !serviceName.toLowerCase().includes('boarding')) return false;
          if (filterByService === 'daycare' && !serviceName.toLowerCase().includes('daycare')) return false;
        }
        
        // Filter by search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const petName = booking.pet?.name || booking.pets?.[0]?.name || '';
          const ownerName = booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : '';
          if (!petName.toLowerCase().includes(searchLower) && 
              !ownerName.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        
        return true;
      })
      .map(booking => {
        const checkIn = booking.checkIn ? new Date(booking.checkIn) : null;
        const checkOut = booking.checkOut ? new Date(booking.checkOut) : null;
        
        // Determine which days this booking spans
        let startDayIndex = -1;
        let endDayIndex = -1;
        
        if (checkIn && checkOut) {
          weekDates.forEach((day, index) => {
            const dayStr = day.toISOString().split('T')[0];
            const checkInStr = checkIn.toISOString().split('T')[0];
            const checkOutStr = checkOut.toISOString().split('T')[0];
            
            if (startDayIndex === -1 && dayStr >= checkInStr) {
              startDayIndex = index;
            }
            if (dayStr <= checkOutStr) {
              endDayIndex = index;
            }
          });
        }

        const statusColors = {
          'PENDING': 'bg-gray-100 dark:bg-surface-secondary border-gray-300 dark:border-surface-border text-gray-900 dark:text-text-primary',
          'CONFIRMED': 'bg-blue-100 dark:bg-surface-secondary border-blue-300 text-blue-900 dark:text-blue-100',
          'CHECKED_IN': 'bg-green-100 dark:bg-surface-secondary border-green-300 text-green-900 dark:text-green-100',
          'CHECKED_OUT': 'bg-gray-100 dark:bg-surface-secondary border-gray-200 dark:border-surface-border text-gray-600 dark:text-text-secondary',
          'CANCELLED': 'bg-red-50 dark:bg-surface-primary border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300'
        };

        return {
          id: booking.recordId,
          runId: booking.runTemplateId || booking.runTemplate?.recordId,
          petName: booking.pet?.name || booking.pets?.[0]?.name || 'Unknown',
          ownerName: booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : 'Unknown',
          startDate: checkIn,
          endDate: checkOut,
          startDayIndex,
          endDayIndex,
          service: booking.service?.name || 'Boarding',
          status: booking.status || 'PENDING',
          alerts: [], // TODO: Extract from booking notes/warnings
          color: statusColors[booking.status] || statusColors['PENDING'],
          booking // Keep full booking object
        };
      });
  }, [apiBookings, filterByService, searchTerm, weekDates]);

  const isLoading = runsLoading || bookingsLoading;

  // Create update mutation - we'll pass bookingId in the handler
  const queryClient = useQueryClient();
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, updates }) => {
      const res = await apiClient.put(`/api/v1/bookings/${bookingId}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // Calculate booking position and width
  const getBookingStyle = (booking) => {
    if (booking.startDayIndex === -1 || booking.endDayIndex === -1) {
      return { display: 'none' };
    }
    const startCol = booking.startDayIndex + 2; // +2 for run label column
    const span = booking.endDayIndex - booking.startDayIndex + 1;
    return {
      gridColumnStart: startCol,
      gridColumnEnd: `span ${span}`,
    };
  };

  // Handle drag & drop for booking changes
  const handleDragStart = (e, booking) => {
    e.dataTransfer.setData('bookingId', booking.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetRunId, targetDate) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('bookingId');
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) return;

    try {
      const updates = {};
      
      // If run changed, update runTemplateId
      if (targetRunId && targetRunId !== booking.runId) {
        updates.runTemplateId = targetRunId;
      }
      
      // If date changed, update check-in date
      if (targetDate) {
        const newCheckIn = new Date(targetDate);
        newCheckIn.setHours(0, 0, 0, 0);
        
        // Calculate new check-out based on original duration
        if (booking.startDate && booking.endDate) {
          const duration = (booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24);
          const newCheckOut = new Date(newCheckIn);
          newCheckOut.setDate(newCheckOut.getDate() + duration);
          updates.checkOut = newCheckOut.toISOString().split('T')[0];
        }
        
        updates.checkIn = newCheckIn.toISOString().split('T')[0];
      }

      if (Object.keys(updates).length > 0) {
        await updateBookingMutation.mutateAsync({ bookingId, updates });
        toast.success('Booking updated successfully');
        setSelectedBooking(null); // Clear selection after update
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(error.message || 'Failed to update booking');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">Run Board</h2>
          
          {/* View Mode Toggles */}
          <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
            {['Day', 'Week', 'Month'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode.toLowerCase())}
                className={cn(
                  "px-3 py-1 rounded text-sm font-medium transition-all",
                  viewMode === mode.toLowerCase()
                    ? "bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary shadow-sm"
                    : "text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary dark:text-text-primary"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const prev = new Date(currentWeek);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeek(prev);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentWeek(new Date())}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = new Date(currentWeek);
                next.setDate(next.getDate() + 7);
                setCurrentWeek(next);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-600 dark:text-text-secondary">
            {tz.formatShortDate(weekDates[0])} - {tz.formatShortDate(weekDates[6])}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="min-w-[150px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Services' },
                { value: 'boarding', label: 'Boarding Only' },
                { value: 'daycare', label: 'Daycare Only' },
              ]}
              value={filterByService}
              onChange={(opt) => setFilterByService(opt?.value || 'all')}
              isClearable={false}
              isSearchable
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-text-tertiary" />
              <input
              type="text"
              placeholder="Search pet or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-300 dark:border-surface-border rounded-lg text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 bg-white dark:bg-surface-primary w-48"
            />
          </div>

          {/* Add Booking */}
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Capacity Summary Bar */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDates.map((date, idx) => {
          // Calculate actual occupancy for this date
          const dateStr = date.toISOString().split('T')[0];
          const dateBookings = bookings.filter(b => {
            if (!b.startDate || !b.endDate) return false;
            const startStr = b.startDate.toISOString().split('T')[0];
            const endStr = b.endDate.toISOString().split('T')[0];
            return dateStr >= startStr && dateStr <= endStr;
          });
          const totalCapacity = runs.reduce((sum, run) => sum + (run.capacity || 1), 0);
          const occupancy = totalCapacity > 0 
            ? Math.round((dateBookings.length / totalCapacity) * 100) 
            : 0;
          return (
            <div key={idx} className="text-center">
              <div className={cn(
                "text-xs font-medium mb-1",
                occupancy > 85 ? "text-error-600" : 
                occupancy > 70 ? "text-warning-600" : "text-success-600"
              )}>
                {occupancy}% Full
              </div>
              <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-1.5">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    occupancy > 85 ? "bg-error-600" : 
                    occupancy > 70 ? "bg-warning-600" : "bg-success-600"
                  )}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Calendar Grid */}
      <Card className="flex-1 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-auto"
        >
          <div className="min-w-[1000px]">
            {/* Header Row - Days */}
            <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-px bg-gray-200 dark:bg-surface-border sticky top-0 z-10">
              <div className="bg-gray-50 dark:bg-surface-secondary p-3 font-medium text-sm text-gray-700 dark:text-text-primary">
                Run/Room
              </div>
              {weekDates.map((date, idx) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 text-center",
                      isToday ? "bg-primary-50 dark:bg-primary-900/40 border-2 border-primary-500/0 dark:border-primary-500/50" : "bg-gray-50 dark:bg-surface-secondary"
                    )}
                  >
                    <div className="text-xs text-gray-500 dark:text-text-secondary">
                      {tz.formatDate(date, { weekday: 'short' })}
                    </div>
                    <div className={cn(
                      "text-lg font-medium",
                      isToday ? "text-primary-600 dark:text-primary-400" : "text-gray-900 dark:text-text-primary"
                    )}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Run Rows */}
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-text-tertiary mx-auto" />
              </div>
            ) : runs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-text-secondary">
                No run templates configured. Please add run templates in Settings.
              </div>
            ) : (
              <div className="relative">
                {runs.map((run, runIdx) => {
                const runBookings = bookings.filter(b => b.runId === run.id);
                
                return (
                  <div
                    key={run.id}
                    className="grid grid-cols-[120px_repeat(7,1fr)] gap-px bg-gray-200 dark:bg-surface-border h-20"
                  >
                    {/* Run Label */}
                    <div className={cn(
                      "bg-white dark:bg-surface-primary p-3 flex items-center justify-between",
                      runIdx === 0 && "border-t border-gray-200 dark:border-surface-border"
                    )}>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-text-primary">{run.name}</div>
                        <div className="text-xs text-gray-500 dark:text-text-secondary">
                          {run.type} • Cap: {run.capacity}
                        </div>
                      </div>
                    </div>

                    {/* Day Cells */}
                    {weekDates.map((date, dateIdx) => (
                      <div
                        key={dateIdx}
                        className={cn(
                          "bg-white dark:bg-surface-primary relative",
                          date.toDateString() === new Date().toDateString() && "bg-primary-50/30",
                          runIdx === 0 && "border-t border-gray-200 dark:border-surface-border"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, run.id, date)}
                      />
                    ))}

                    {/* Bookings - Positioned absolutely over cells */}
                    {runBookings.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-px h-full">
                          <div /> {/* Spacer for run label */}
                          {runBookings.map(booking => {
                            const style = getBookingStyle(booking);
                            if (style.display === 'none') return null;
                            
                            return (
                              <div
                                key={booking.id}
                                className={cn(
                                  "pointer-events-auto cursor-move",
                                  booking.color
                                )}
                                style={style}
                              >
                                <BookingBlock
                                  booking={booking}
                                  onSelect={() => setSelectedBooking(booking)}
                                  onDragStart={handleDragStart}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Selected Booking Quick Actions */}
      {selectedBooking && (
        <BookingQuickActions 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

// Individual Booking Block Component
const BookingBlock = ({ booking, onSelect, onDragStart }) => {
  return (
    <div
      className={cn(
        "h-full mx-1 my-1 rounded border p-1.5 text-xs cursor-move",
        "hover:shadow-md transition-shadow",
        booking.status === 'checked-in' && "border-l-4",
        booking.alerts.length > 0 && "ring-2 ring-warning-400 ring-opacity-50"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, booking)}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{booking.petName}</p>
          <p className="text-[10px] opacity-75 truncate">{booking.ownerName}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {booking.alerts.includes('medication') && (
            <div className="w-4 h-4 bg-warning-500 text-white rounded flex items-center justify-center">
              <span className="text-[10px]">M</span>
            </div>
          )}
          {booking.alerts.includes('aggressive') && (
            <AlertCircle className="h-3 w-3 text-error-600" />
          )}
        </div>
      </div>
      {booking.status === 'checked-in' && (
        <div className="flex items-center gap-1 mt-0.5">
          <CheckCircle className="h-3 w-3 text-success-600" />
          <span className="text-[10px] text-success-600">Checked In</span>
        </div>
      )}
    </div>
  );
};

// Quick Actions Drawer for Selected Booking
const BookingQuickActions = ({ booking, onClose }) => {
  const actions = [
    { icon: CheckCircle, label: 'Check In', color: 'text-success-600' },
    { icon: XCircle, label: 'Check Out', color: 'text-gray-600 dark:text-text-secondary' },
    { icon: Move, label: 'Change Room', color: 'text-blue-600 dark:text-blue-400' },
    { icon: Edit2, label: 'Edit Booking', color: 'text-gray-600 dark:text-text-secondary' },
    { icon: PhoneCall, label: 'Call Owner', color: 'text-gray-600 dark:text-text-secondary' },
    { icon: MessageSquare, label: 'Send Message', color: 'text-gray-600 dark:text-text-secondary' },
    { icon: DollarSign, label: 'Process Payment', color: 'text-gray-600 dark:text-text-secondary' },
    { icon: Trash2, label: 'Cancel', color: 'text-error-600' },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-primary rounded-lg shadow-xl border border-gray-200 dark:border-surface-border p-4 z-20">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900 dark:text-text-primary">{booking.petName}</p>
          <p className="text-sm text-gray-600 dark:text-text-secondary">{booking.ownerName} • {booking.service}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className={cn("flex-col h-auto py-2", action.color)}
            >
              <Icon className="h-4 w-4 mb-1" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default VisualRunBoard;


