import { useState, useMemo } from 'react';
import { 
  Users,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserCheck,
  UserX,
  Coffee,
  Home,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  MapPin,
  Star,
  Timer,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useUpcomingArrivalsQuery, useUpcomingDeparturesQuery } from '@/features/dashboard/api';
import { useStaffQuery } from '@/features/staff/api';
import toast from 'react-hot-toast';

/**
 * Two-Pane Operations Layout
 * Fixes: "Cumbersome time clock and scheduling" by showing arrivals + staff in one place
 * Left pane: Day's reservations/arrivals
 * Right pane: Staff schedule/time clock
 * Context stays visible while doing labor tasks
 */

const TwoPaneOpsLayout = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [paneRatio, setPaneRatio] = useState(50); // Percentage for left pane
  
  return (
    <div className="h-full flex gap-4">
      {/* Left Pane - Arrivals/Departures */}
      <div className="flex-1" style={{ flexBasis: `${paneRatio}%` }}>
        <ArrivalsPane selectedDate={selectedDate} />
      </div>

      {/* Resizer */}
      <div 
        className="w-1 bg-gray-300 dark:bg-surface-border cursor-col-resize hover:bg-primary-400 transition-colors"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startRatio = paneRatio;
          
          const handleMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const containerWidth = e.currentTarget.parentElement.offsetWidth;
            const deltaRatio = (deltaX / containerWidth) * 100;
            setPaneRatio(Math.max(30, Math.min(70, startRatio + deltaRatio)));
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />

      {/* Right Pane - Staff Schedule */}
      <div className="flex-1" style={{ flexBasis: `${100 - paneRatio}%` }}>
        <StaffSchedulePane 
          selectedDate={selectedDate} 
          selectedStaff={selectedStaff}
          onStaffSelect={setSelectedStaff}
        />
      </div>
    </div>
  );
};

// Left Pane - Arrivals/Departures
const ArrivalsPane = ({ selectedDate }) => {
  const [viewMode, setViewMode] = useState('timeline'); // timeline, list
  const [filterType, setFilterType] = useState('all'); // all, arrivals, departures
  
  // Fetch arrivals and departures for selected date
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const { data: arrivalsData = [], isLoading: arrivalsLoading } = useUpcomingArrivalsQuery(1);
  const { data: departuresData = [], isLoading: departuresLoading } = useUpcomingDeparturesQuery(1);

  // Transform API data to events format
  const events = useMemo(() => {
    const allEvents = [];
    
    // Process arrivals
    arrivalsData.forEach(item => {
      const checkIn = item.checkIn ? new Date(item.checkIn) : null;
      if (checkIn && checkIn.toISOString().split('T')[0] === selectedDateStr) {
        const timeStr = checkIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        allEvents.push({
          id: item.bookingId || item.recordId,
          time: timeStr,
          type: 'arrival',
          petName: item.pet?.name || item.petName || 'Unknown',
          ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : item.ownerName || 'Unknown',
          service: item.service?.name || 'Boarding',
          room: item.run || 'N/A',
          duration: item.checkOut ? `${Math.ceil((new Date(item.checkOut) - checkIn) / (1000 * 60 * 60 * 24))} nights` : 'N/A',
          status: item.status === 'CHECKED_IN' ? 'checked-in' : item.status === 'CONFIRMED' ? 'confirmed' : 'on-time',
          staffAssigned: null, // TODO: Get from booking
          rawData: item
        });
      }
    });
    
    // Process departures
    departuresData.forEach(item => {
      const checkOut = item.checkOut ? new Date(item.checkOut) : null;
      if (checkOut && checkOut.toISOString().split('T')[0] === selectedDateStr) {
        const timeStr = checkOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        allEvents.push({
          id: item.bookingId || item.recordId,
          time: timeStr,
          type: 'departure',
          petName: item.pet?.name || item.petName || 'Unknown',
          ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : item.ownerName || 'Unknown',
          service: item.service?.name || 'Boarding',
          room: item.run || 'N/A',
          balance: (item.balanceDueInCents || 0) / 100,
          status: item.status === 'CHECKED_OUT' ? 'completed' : 'ready',
          staffAssigned: null, // TODO: Get from booking
          rawData: item
        });
      }
    });
    
    // Sort by time
    return allEvents.sort((a, b) => {
      const timeA = parseInt(a.time.replace(/[^0-9]/g, ''));
      const timeB = parseInt(b.time.replace(/[^0-9]/g, ''));
      return timeA - timeB;
    });
  }, [arrivalsData, departuresData, selectedDateStr]);

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter(e => e.type === filterType.slice(0, -1)); // Remove 's' from 'arrivals'/'departures'
  }, [events, filterType]);

  const isLoading = arrivalsLoading || departuresLoading;

  const getTimelineHour = () => {
    const hours = [];
    for (let i = 6; i <= 20; i++) {
      hours.push(i);
    }
    return hours;
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Arrivals & Departures</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  viewMode === 'timeline' 
                    ? "bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary shadow-sm" 
                    : "text-gray-600 dark:text-text-secondary"
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  viewMode === 'list' 
                    ? "bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary shadow-sm" 
                    : "text-gray-600 dark:text-text-secondary"
                )}
              >
                List
              </button>
            </div>
            
            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-surface-border rounded-lg text-sm"
            >
              <option value="all">All Events</option>
              <option value="arrivals">Arrivals Only</option>
              <option value="departures">Departures Only</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-text-tertiary" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-text-secondary">{events.filter(e => e.type === 'arrival').length} Arrivals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-50 dark:bg-blue-950/20 rounded-full"></div>
                <span className="text-gray-600 dark:text-text-secondary">{events.filter(e => e.type === 'departure').length} Departures</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-warning-600" />
                <span className="text-gray-600 dark:text-text-secondary">{events.filter(e => e.status !== 'on-time' && e.status !== 'confirmed').length} Need Attention</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-text-tertiary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
            No {filterType === 'all' ? 'events' : filterType} scheduled for this date
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView events={filteredEvents} />
        ) : (
          <ListView events={filteredEvents} filterType={filterType} />
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t bg-gray-50 dark:bg-surface-secondary">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            {filteredEvents.length > 0 ? (
              <>Showing {filteredEvents.length} {filterType === 'all' ? 'events' : filterType}</>
            ) : (
              <>No events scheduled</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Activity className="h-3 w-3 mr-1" />
              Live Updates
            </Button>
            <Button variant="secondary" size="sm">
              Print Schedule
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Timeline View Component
const TimelineView = ({ events }) => {
  const hours = [];
  for (let i = 6; i <= 20; i++) {
    hours.push(i);
  }

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  return (
    <div className="relative">
      {/* Hour markers */}
      {hours.map(hour => (
        <div key={hour} className="flex items-start gap-4 h-20 border-b border-gray-100">
          <div className="w-16 text-sm text-gray-500 dark:text-text-secondary pt-2">
            {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
          </div>
          <div className="flex-1 relative">
            {/* Current time indicator */}
            {hour === currentHour && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-error-500 z-10"
                style={{ top: `${(currentMinute / 60) * 100}%` }}
              >
                <div className="absolute -left-1 -top-1 w-2 h-2 bg-error-500 rounded-full" />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Events positioned on timeline */}
      {events.map(event => {
        const [time, period] = event.time.split(' ');
        const [hourStr, minuteStr] = time.split(':');
        let hour = parseInt(hourStr);
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        const minute = parseInt(minuteStr);
        
        const topPosition = ((hour - 6) * 80) + ((minute / 60) * 80);
        
        return (
          <div
            key={event.id}
            className="absolute left-20 right-4"
            style={{ top: `${topPosition}px` }}
          >
            <EventCard event={event} />
          </div>
        );
      })}
    </div>
  );
};

// List View Component
const ListView = ({ events, filterType }) => {
  const filteredEvents = events.filter(event => 
    filterType === 'all' || event.type === filterType.slice(0, -1)
  );

  return (
    <div className="space-y-2">
      {filteredEvents.map(event => (
        <EventCard key={event.id} event={event} isListView />
      ))}
    </div>
  );
};

// Event Card Component
const EventCard = ({ event, isListView = false }) => {
  const isArrival = event.type === 'arrival';
  
  return (
    <div className={cn(
      "bg-white dark:bg-surface-primary border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
      isArrival ? "border-l-4 border-l-success-500" : "border-l-4 border-l-blue-500",
      !isListView && "max-w-sm"
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            isArrival ? "bg-[var(--bb-color-status-positive-soft)]" : "bg-[var(--bb-color-status-info-soft)]"
          )}>
            {isArrival ? (
              <UserCheck className="h-3 w-3 text-success-600" />
            ) : (
              <UserX className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-text-primary">{event.time}</p>
            <p className="text-xs text-gray-500 dark:text-text-secondary">{event.type}</p>
          </div>
        </div>
        
        {event.status === 'on-time' && (
          <Badge variant="success" className="text-xs">On Time</Badge>
        )}
        {event.status === 'ready' && (
          <Badge variant="secondary" className="text-xs">Ready</Badge>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-medium text-gray-900 dark:text-text-primary">{event.petName}</p>
        <p className="text-sm text-gray-600 dark:text-text-secondary">{event.ownerName}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-text-secondary">
          <span>{event.service}</span>
          <span>•</span>
          <span>{event.room}</span>
          {event.duration && (
            <>
              <span>•</span>
              <span>{event.duration}</span>
            </>
          )}
          {event.balance && (
            <>
              <span>•</span>
              <span className="font-medium text-gray-700 dark:text-text-primary">${event.balance}</span>
            </>
          )}
        </div>
      </div>

      {/* Staff Assignment */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {event.staffAssigned ? (
            <div className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3 text-gray-400 dark:text-text-tertiary" />
              <span className="text-gray-600 dark:text-text-secondary">Assigned to {event.staffAssigned}</span>
            </div>
          ) : (
            <Button variant="secondary" size="sm" className="h-6 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Assign Staff
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <PhoneCall className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Right Pane - Staff Schedule
const StaffSchedulePane = ({ selectedDate, selectedStaff, onStaffSelect }) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, timeline, list
  
  // Fetch staff data
  const { data: staffData = [], isLoading } = useStaffQuery();

  // Transform staff data to component format
  const staffMembers = useMemo(() => {
    return staffData.map(staff => ({
      id: staff.recordId || staff.id,
      name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || 'Unknown',
      role: staff.role || 'Staff',
      status: staff.status?.toLowerCase() || 'clocked-out', // Map from API status
      shift: staff.shift || 'N/A',
      clockIn: staff.clockInTime ? new Date(staff.clockInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
      totalHours: staff.totalHours || 0,
      assignedTasks: staff.assignedTasks || 0,
      completedTasks: staff.completedTasks || 0,
      currentLocation: staff.currentLocation || 'N/A',
      breaks: staff.breaks || [],
      rawData: staff
    }));
  }, [staffData]);

  const handleClockAction = async (staff, action) => {
    // TODO: Implement time clock mutations
    toast.info(`Time clock functionality will be implemented soon`);
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Staff Schedule</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              {isLoading ? 'Loading...' : `${staffMembers.filter(s => s.status === 'clocked-in').length} of ${staffMembers.length} on duty`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary">
              <Clock className="h-4 w-4 mr-2" />
              Time Clock
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-text-secondary">Total Hours</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
              {isLoading ? '-' : staffMembers.reduce((sum, s) => sum + (s.totalHours || 0), 0).toFixed(1)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-text-secondary">Labor Cost</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">$427</p>
          </div>
          <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-text-secondary">Productivity</p>
            <p className="text-lg font-semibold text-success-600">92%</p>
          </div>
          <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-2">
            <p className="text-xs text-gray-600 dark:text-text-secondary">On Break</p>
            <p className="text-lg font-semibold text-warning-600">1</p>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-text-tertiary" />
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
            No staff members found
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {staffMembers.map(staff => (
            <StaffCard 
              key={staff.id} 
              staff={staff}
              isSelected={selectedStaff?.id === staff.id}
              onClick={() => onStaffSelect(staff)}
              onClockAction={handleClockAction}
            />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Schedule Overview */}
      <div className="px-4 py-3 border-t bg-gray-50 dark:bg-surface-secondary">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-text-secondary">
            Next shift change: <span className="font-medium">3:00 PM (2 staff)</span>
          </span>
          <Button variant="secondary" size="sm">
            View Full Schedule
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Staff Card Component
const StaffCard = ({ staff, isSelected, onClick, onClockAction }) => {
  const statusConfig = {
    'clocked-in': { icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-50' },
    'on-break': { icon: Coffee, color: 'text-warning-600', bg: 'bg-warning-50' },
    'clocked-out': { icon: Home, color: 'text-gray-600 dark:text-text-secondary', bg: 'bg-gray-50 dark:bg-surface-secondary' }
  };

  const { icon: StatusIcon, color, bg } = statusConfig[staff.status];

  return (
    <div
      className={cn(
        "bg-white dark:bg-surface-primary border rounded-lg p-4 cursor-pointer transition-all",
        isSelected ? "border-primary-600 shadow-md" : "border-gray-200 dark:border-surface-border hover:border-gray-300",
        staff.status === 'clocked-out' && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bg)}>
            <StatusIcon className={cn("h-5 w-5", color)} />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-text-primary">{staff.name}</p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">{staff.role} • {staff.shift}</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {staff.status === 'clocked-in' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClockAction(staff, 'start-break');
                }}
              >
                <Coffee className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClockAction(staff, 'clock-out');
                }}
              >
                <UserX className="h-3 w-3" />
              </Button>
            </>
          )}
          {staff.status === 'on-break' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onClockAction(staff, 'end-break');
              }}
            >
              <UserCheck className="h-3 w-3" />
            </Button>
          )}
          {staff.status === 'clocked-out' && (
            <Button
              variant="primary"
              size="sm"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onClockAction(staff, 'clock-in');
              }}
            >
              Clock In
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-gray-500 dark:text-text-secondary">Hours</p>
          <p className="font-medium text-gray-900 dark:text-text-primary">{staff.totalHours}h</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-text-secondary">Tasks</p>
          <p className="font-medium text-gray-900 dark:text-text-primary">{staff.completedTasks}/{staff.assignedTasks}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-text-secondary">Location</p>
          <p className="font-medium text-gray-900 dark:text-text-primary truncate">{staff.currentLocation}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-text-secondary">Clock In</p>
          <p className="font-medium text-gray-900 dark:text-text-primary">{staff.clockIn || '-'}</p>
        </div>
      </div>

      {/* Progress Bar */}
      {staff.status !== 'clocked-out' && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-text-secondary">Task Progress</span>
            <span className="text-gray-900 dark:text-text-primary font-medium">
              {Math.round((staff.completedTasks / staff.assignedTasks) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all"
              style={{ width: `${(staff.completedTasks / staff.assignedTasks) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoPaneOpsLayout;


