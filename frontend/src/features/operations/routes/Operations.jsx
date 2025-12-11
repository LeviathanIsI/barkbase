import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isToday } from 'date-fns';
import {
  Users,
  Clock,
  Calendar,
  ChevronRight,
  Plus,
  UserCheck,
  UserX,
  Coffee,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Home,
  PawPrint,
  Pill,
  Scissors,
  Bell,
  ArrowUpRight,
  BarChart3,
  Loader2,
  Eye,
  List,
  Timer,
  Building,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpcomingArrivalsQuery, useUpcomingDeparturesQuery } from '@/features/dashboard/api';
import { useStaffQuery } from '@/features/staff/api';
import { useBookingsQuery } from '@/features/bookings/api';
import { useOverdueTasksQuery, useTodaysTasksQuery } from '@/features/tasks/api';
import { useKennels } from '@/features/kennels/api';
import { cn } from '@/lib/cn';

// KPI Tile Component
const KPITile = ({ icon: Icon, label, value, trend, trendType, onClick, iconBg, isLoading }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 bg-white dark:bg-surface-primary border border-border rounded-lg p-3 hover:border-primary/30 hover:shadow-sm transition-all text-left w-full"
  >
    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      {isLoading ? (
        <Skeleton className="h-6 w-12 mt-0.5" />
      ) : (
        <p className="text-xl font-semibold text-text">{value}</p>
      )}
    </div>
    {trend && !isLoading && (
      <div className={cn(
        'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
        trendType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        trendType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      )}>
        {trendType === 'positive' ? <TrendingUp className="h-3 w-3" /> : 
         trendType === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
        {trend}
      </div>
    )}
    <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
  </button>
);

// Module Header Component
const ModuleHeader = ({ title, subtitle, action, actionLabel, actionIcon: ActionIcon }) => (
  <div className="flex items-center justify-between mb-3">
    <div>
      <h3 className="font-semibold text-text">{title}</h3>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </div>
    {action && (
      <Button variant="ghost" size="sm" onClick={action}>
        {ActionIcon && <ActionIcon className="h-3.5 w-3.5 mr-1" />}
        {actionLabel}
      </Button>
    )}
  </div>
);

// Event Row Component
const EventRow = ({ type, petId, petName, ownerId, ownerName, time, status, onClick }) => (
  <div className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors text-left">
    <button
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
        type === 'arrival' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
      )}
    >
      {type === 'arrival' ? (
        <UserCheck className="h-4 w-4 text-green-600" />
      ) : (
        <UserX className="h-4 w-4 text-blue-600" />
      )}
    </button>
    <div className="flex-1 min-w-0">
      {petId ? (
        <Link
          to={`/pets/${petId}`}
          className="text-sm font-medium text-text truncate block hover:text-primary hover:underline transition-colors"
        >
          {petName}
        </Link>
      ) : (
        <p className="text-sm font-medium text-text truncate">{petName}</p>
      )}
      {ownerId ? (
        <Link
          to={`/owners/${ownerId}`}
          className="text-xs text-muted truncate block hover:text-primary hover:underline transition-colors"
        >
          {ownerName}
        </Link>
      ) : (
        <p className="text-xs text-muted truncate">{ownerName}</p>
      )}
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-xs font-medium text-text">{time}</p>
      {status && (
        <Badge
          variant={status === 'confirmed' ? 'info' : status === 'checked-in' ? 'success' : 'neutral'}
          size="sm"
        >
          {status}
        </Badge>
      )}
    </div>
  </div>
);

// Staff Row Component
const StaffRow = ({ name, role, status, clockIn, onClick }) => {
  const statusConfig = {
    'clocked-in': { label: 'On Duty', variant: 'success' },
    'on-break': { label: 'On Break', variant: 'warning' },
    'clocked-out': { label: 'Off', variant: 'neutral' },
  };
  const config = statusConfig[status] || statusConfig['clocked-out'];

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors text-left"
    >
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
        status === 'clocked-in' ? 'bg-green-100 dark:bg-green-900/30' :
        status === 'on-break' ? 'bg-amber-100 dark:bg-amber-900/30' :
        'bg-gray-100 dark:bg-gray-800'
      )}>
        {status === 'clocked-in' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
         status === 'on-break' ? <Coffee className="h-4 w-4 text-amber-600" /> :
         <Home className="h-4 w-4 text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{name}</p>
        <p className="text-xs text-muted truncate">{role}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {clockIn && <p className="text-xs text-muted">In: {clockIn}</p>}
        <Badge variant={config.variant} size="sm">{config.label}</Badge>
      </div>
    </button>
  );
};

// Alert Row Component
const AlertRow = ({ icon: Icon, label, count, variant, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors text-left"
  >
    <div className={cn(
      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
      variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
      variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
      'bg-green-100 dark:bg-green-900/30'
    )}>
      <Icon className={cn(
        'h-4 w-4',
        variant === 'danger' ? 'text-red-600' :
        variant === 'warning' ? 'text-amber-600' :
        'text-green-600'
      )} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-text">{label}</p>
    </div>
    <Badge variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'success'} size="sm">
      {count}
    </Badge>
  </button>
);

// Mini Bar Chart Component
const MiniBarChart = ({ data, maxValue }) => (
  <div className="flex items-end gap-1 h-16">
    {data.map((item, idx) => {
      const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
      return (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={cn(
              'w-full rounded-t transition-all',
              isToday(item.date) ? 'bg-primary' : 'bg-primary/40'
            )}
            style={{ height: `${Math.max(height, 4)}%` }}
            title={`${format(item.date, 'MMM d')}: ${item.value}`}
          />
          <span className="text-[10px] text-muted">{format(item.date, 'EEE')}</span>
        </div>
      );
    })}
  </div>
);

const Operations = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('timeline');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Week dates for forecasts
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  // Data fetching
  const { data: arrivalsData = [], isLoading: arrivalsLoading } = useUpcomingArrivalsQuery(7);
  const { data: departuresData = [], isLoading: departuresLoading } = useUpcomingDeparturesQuery(7);
  const { data: staffData = [], isLoading: staffLoading } = useStaffQuery();
  const { data: overdueTasks = [], isLoading: overdueLoading } = useOverdueTasksQuery();
  const { data: todaysTasks = [], isLoading: tasksLoading } = useTodaysTasksQuery();
  const { data: kennels = [], isLoading: kennelsLoading } = useKennels();

  // Week bookings for forecast
  const weekStartStr = weekDates[0].toISOString().split('T')[0];
  const weekEndStr = weekDates[6].toISOString().split('T')[0];
  const { data: weekBookings = [], isLoading: bookingsLoading } = useBookingsQuery({
    startDate: weekStartStr,
    endDate: weekEndStr,
  });

  const isLoading = arrivalsLoading || departuresLoading || staffLoading || overdueLoading || tasksLoading || kennelsLoading;

  // Process arrivals for today
  const todaysArrivals = useMemo(() => {
    return arrivalsData
      .filter(item => {
        const checkIn = item.checkIn ? new Date(item.checkIn) : null;
        return checkIn && checkIn.toISOString().split('T')[0] === todayStr;
      })
      .map(item => ({
        id: item.recordId,
        petId: item.pet?.recordId || item.petId,
        petName: item.pet?.name || 'Unknown',
        ownerId: item.owner?.recordId || item.ownerId,
        ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : 'Unknown',
        time: item.checkIn ? format(new Date(item.checkIn), 'h:mm a') : 'N/A',
        status: item.status?.toLowerCase().replace('_', '-') || 'confirmed',
      }));
  }, [arrivalsData, todayStr]);

  // Process departures for today
  const todaysDepartures = useMemo(() => {
    return departuresData
      .filter(item => {
        const checkOut = item.checkOut ? new Date(item.checkOut) : null;
        return checkOut && checkOut.toISOString().split('T')[0] === todayStr;
      })
      .map(item => ({
        id: item.recordId,
        petId: item.pet?.recordId || item.petId,
        petName: item.pet?.name || 'Unknown',
        ownerId: item.owner?.recordId || item.ownerId,
        ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : 'Unknown',
        time: item.checkOut ? format(new Date(item.checkOut), 'h:mm a') : 'N/A',
        status: item.status?.toLowerCase().replace('_', '-') || 'ready',
      }));
  }, [departuresData, todayStr]);

  // Process staff
  const staffMembers = useMemo(() => {
    const list = Array.isArray(staffData) ? staffData : (staffData?.data || []);
    return list.map(staff => ({
      id: staff.recordId,
      name: `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || 'Unknown',
      role: staff.role || 'Staff',
      status: staff.status?.toLowerCase() || 'clocked-out',
      clockIn: staff.clockInTime ? format(new Date(staff.clockInTime), 'h:mm a') : null,
    }));
  }, [staffData]);

  const staffOnDuty = staffMembers.filter(s => s.status === 'clocked-in').length;
  const staffOnBreak = staffMembers.filter(s => s.status === 'on-break').length;

  // Calculate occupancy
  const totalCapacity = kennels.reduce((sum, k) => sum + (k.capacity || 0), 0);
  const totalOccupied = kennels.reduce((sum, k) => sum + (k.occupied || 0), 0);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Process tasks
  const urgentTasks = todaysTasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
  const medicationTasks = todaysTasks.filter(t => t.type === 'MEDICATION');
  const groomingTasks = todaysTasks.filter(t => t.type === 'GROOMING' || t.type === 'EXERCISE');

  // Bookings by day for forecast
  const bookingsByDay = useMemo(() => {
    return weekDates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const count = weekBookings.filter(b => {
        const checkIn = b.checkIn ? new Date(b.checkIn).toISOString().split('T')[0] : null;
        const checkOut = b.checkOut ? new Date(b.checkOut).toISOString().split('T')[0] : null;
        return (checkIn && checkIn <= dateStr) && (checkOut && checkOut >= dateStr);
      }).length;
      return { date, value: count };
    });
  }, [weekDates, weekBookings]);

  const maxBookings = Math.max(...bookingsByDay.map(d => d.value), 1);

  // Utilization by day
  const utilizationByDay = useMemo(() => {
    return weekDates.map(date => {
      const dayBookings = bookingsByDay.find(b => b.date.getTime() === date.getTime())?.value || 0;
      const utilization = totalCapacity > 0 ? Math.round((dayBookings / totalCapacity) * 100) : 0;
      return { date, value: utilization };
    });
  }, [weekDates, bookingsByDay, totalCapacity]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li className="text-text font-medium">Operations Center</li>
            </ol>
          </nav>
          <h1 className="text-xl font-semibold text-text">Command Console</h1>
          <p className="text-sm text-muted mt-0.5">
            {format(today, 'EEEE, MMMM d, yyyy')} • High-level operational overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/bookings?action=new')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Top Row - KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          icon={UserCheck}
          label="Arrivals Today"
          value={todaysArrivals.length}
          trend={todaysArrivals.length > 0 ? `${todaysArrivals.filter(a => a.status === 'confirmed').length} confirmed` : null}
          trendType="neutral"
          iconBg="bg-green-500"
          onClick={() => navigate('/bookings?filter=arrivals')}
          isLoading={arrivalsLoading}
        />
        <KPITile
          icon={UserX}
          label="Departures Today"
          value={todaysDepartures.length}
          trend={todaysDepartures.length > 0 ? 'On schedule' : null}
          trendType="positive"
          iconBg="bg-blue-500"
          onClick={() => navigate('/bookings?filter=departures')}
          isLoading={departuresLoading}
        />
        <KPITile
          icon={Building}
          label="Occupancy"
          value={`${occupancyPercent}%`}
          trend={`${totalOccupied}/${totalCapacity}`}
          trendType={occupancyPercent > 90 ? 'negative' : occupancyPercent > 70 ? 'neutral' : 'positive'}
          iconBg="bg-purple-500"
          onClick={() => navigate('/kennels')}
          isLoading={kennelsLoading}
        />
        <KPITile
          icon={Users}
          label="Staff On Duty"
          value={staffOnDuty}
          trend={staffOnBreak > 0 ? `${staffOnBreak} on break` : `${staffMembers.length} total`}
          trendType="neutral"
          iconBg="bg-amber-500"
          onClick={() => navigate('/staff')}
          isLoading={staffLoading}
        />
      </div>

      {/* Mid Row - Three Main Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* (A) Arrivals & Departures Summary */}
        <Card className="p-4">
          <ModuleHeader
            title="Arrivals & Departures"
            subtitle="Today's schedule"
            action={() => navigate('/schedule')}
            actionLabel="Full Schedule"
            actionIcon={ArrowUpRight}
          />

          {/* View Toggle */}
          <div className="flex items-center gap-1 mb-3 p-1 bg-surface rounded-lg">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex-1 px-2 py-1 text-xs font-medium rounded transition-colors',
                viewMode === 'timeline' ? 'bg-white dark:bg-surface-primary shadow-sm text-text' : 'text-muted'
              )}
            >
              <Timer className="h-3 w-3 inline mr-1" />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex-1 px-2 py-1 text-xs font-medium rounded transition-colors',
                viewMode === 'list' ? 'bg-white dark:bg-surface-primary shadow-sm text-text' : 'text-muted'
              )}
            >
              <List className="h-3 w-3 inline mr-1" />
              List
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-xs mb-3 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted">{todaysArrivals.length} arrivals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted">{todaysDepartures.length} departures</span>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-1 max-h-[240px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))
            ) : [...todaysArrivals.slice(0, 3), ...todaysDepartures.slice(0, 3)].length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                No arrivals or departures today
              </div>
            ) : (
              [...todaysArrivals.slice(0, 3).map(a => ({ ...a, type: 'arrival' })),
               ...todaysDepartures.slice(0, 3).map(d => ({ ...d, type: 'departure' }))]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(event => (
                  <EventRow
                    key={event.id}
                    type={event.type}
                    petId={event.petId}
                    petName={event.petName}
                    ownerId={event.ownerId}
                    ownerName={event.ownerName}
                    time={event.time}
                    status={event.status}
                    onClick={() => navigate(`/bookings/${event.id}`)}
                  />
                ))
            )}
          </div>

          {(todaysArrivals.length + todaysDepartures.length) > 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/schedule')}
            >
              View all {todaysArrivals.length + todaysDepartures.length} events
            </Button>
          )}
        </Card>

        {/* (B) Staff Schedule + Time Clock */}
        <Card className="p-4">
          <ModuleHeader
            title="Staff & Time Clock"
            subtitle={`${staffOnDuty} on duty • ${staffOnBreak} on break`}
            action={() => navigate('/staff')}
            actionLabel="Manage"
            actionIcon={ArrowUpRight}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2 mb-3 pb-3 border-b border-border">
            <div className="text-center">
              <p className="text-lg font-semibold text-text">{staffOnDuty}</p>
              <p className="text-[10px] text-muted">On Duty</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-amber-600">{staffOnBreak}</p>
              <p className="text-[10px] text-muted">On Break</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text">
                {staffMembers.reduce((sum, s) => sum + (s.status === 'clocked-in' ? 8 : 0), 0)}h
              </p>
              <p className="text-[10px] text-muted">Hours</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">92%</p>
              <p className="text-[10px] text-muted">Productivity</p>
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {staffLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))
            ) : staffMembers.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                No staff members found
              </div>
            ) : (
              staffMembers
                .sort((a, b) => {
                  const order = { 'clocked-in': 0, 'on-break': 1, 'clocked-out': 2 };
                  return order[a.status] - order[b.status];
                })
                .slice(0, 5)
                .map(staff => (
                  <StaffRow
                    key={staff.id}
                    name={staff.name}
                    role={staff.role}
                    status={staff.status}
                    clockIn={staff.clockIn}
                    onClick={() => navigate('/staff')}
                  />
                ))
            )}
          </div>

          {/* Shift Changes */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted">
              <Clock className="h-3 w-3 inline mr-1" />
              Next shift change: <span className="font-medium text-text">3:00 PM (2 staff)</span>
            </p>
          </div>
        </Card>

        {/* (C) Tasks & Alerts */}
        <Card className="p-4">
          <ModuleHeader
            title="Tasks & Alerts"
            subtitle={`${overdueTasks.length} overdue • ${todaysTasks.length} total today`}
            action={() => navigate('/tasks')}
            actionLabel="View All"
            actionIcon={ArrowUpRight}
          />

          {/* Alerts List */}
          <div className="space-y-1">
            <AlertRow
              icon={AlertTriangle}
              label="Overdue tasks"
              count={overdueTasks.length}
              variant={overdueTasks.length > 0 ? 'danger' : 'success'}
              onClick={() => navigate('/tasks?filter=overdue')}
            />
            <AlertRow
              icon={Pill}
              label="Medication reminders"
              count={medicationTasks.length}
              variant={medicationTasks.length > 2 ? 'warning' : 'success'}
              onClick={() => navigate('/tasks?type=MEDICATION')}
            />
            <AlertRow
              icon={Scissors}
              label="Grooming / Exercise"
              count={groomingTasks.length}
              variant="success"
              onClick={() => navigate('/tasks?type=GROOMING')}
            />
            <AlertRow
              icon={Building}
              label="Capacity alerts"
              count={occupancyPercent > 90 ? 1 : 0}
              variant={occupancyPercent > 90 ? 'warning' : 'success'}
              onClick={() => navigate('/kennels')}
            />
            <AlertRow
              icon={Bell}
              label="Urgent tasks"
              count={urgentTasks.length}
              variant={urgentTasks.length > 0 ? 'danger' : 'success'}
              onClick={() => navigate('/tasks?priority=URGENT')}
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-3 border-t border-border flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate('/tasks?action=new')}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate('/tasks?filter=overdue')}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Review
            </Button>
          </div>
        </Card>
      </div>

      {/* Bottom Row - Wide Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* (A) Facility Utilization Overview */}
        <Card className="p-4">
          <ModuleHeader
            title="Facility Utilization"
            subtitle="Next 7 days forecast"
            action={() => navigate('/kennels')}
            actionLabel="Manage Kennels"
            actionIcon={ArrowUpRight}
          />

          {/* Service Filter Pills */}
          <div className="flex items-center gap-2 mb-4">
            {['All Services', 'Boarding', 'Daycare', 'Grooming'].map((filter, idx) => (
              <button
                key={filter}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full transition-colors',
                  idx === 0 ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-text'
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Chart */}
          {bookingsLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <MiniBarChart data={utilizationByDay} maxValue={100} />
          )}

          {/* Summary */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-sm">
            <div>
              <span className="text-muted">Available spots today: </span>
              <span className="font-medium text-text">{totalCapacity - totalOccupied}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="h-2 w-6 rounded bg-primary" />
              <span className="text-muted">Today</span>
              <div className="h-2 w-6 rounded bg-primary/40 ml-2" />
              <span className="text-muted">Projected</span>
            </div>
          </div>
        </Card>

        {/* (B) Upcoming Bookings Load */}
        <Card className="p-4">
          <ModuleHeader
            title="Upcoming Bookings"
            subtitle="7-day forecast"
            action={() => navigate('/bookings')}
            actionLabel="View All"
            actionIcon={ArrowUpRight}
          />

          {/* Chart */}
          {bookingsLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <MiniBarChart data={bookingsByDay} maxValue={maxBookings} />
          )}

          {/* Breakdown by Service */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-semibold text-text">
                {weekBookings.filter(b => b.service?.name?.toLowerCase().includes('board')).length}
              </p>
              <p className="text-[10px] text-muted">Boarding</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text">
                {weekBookings.filter(b => b.service?.name?.toLowerCase().includes('daycare')).length}
              </p>
              <p className="text-[10px] text-muted">Daycare</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text">
                {weekBookings.filter(b => b.service?.name?.toLowerCase().includes('groom')).length}
              </p>
              <p className="text-[10px] text-muted">Grooming</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text">{weekBookings.length}</p>
              <p className="text-[10px] text-muted">Total</p>
            </div>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-2 mt-3 text-xs">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-muted">
              <span className="font-medium text-green-600">+12%</span> vs last week
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Operations;
