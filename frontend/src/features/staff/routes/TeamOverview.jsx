/**
 * Staff / Team Module - Enterprise Workforce Management
 * Modeled after Deputy, WhenIWork, Homebase, BambooHR, HubSpot Teams
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, startOfWeek } from 'date-fns';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  Star,
  MessageSquare,
  BarChart3,
  Smartphone,
  Target,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MoreHorizontal,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  Eye,
  Send,
  Play,
  Pause,
  LogIn,
  LogOut,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Briefcase,
  Shield,
  Award,
  Activity,
  PieChart,
  FileText,
  Settings,
  X,
  Check,
  ArrowRight,
  Loader2,
  Coffee,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import SlidePanel from '@/components/ui/SlidePanel';
import Modal from '@/components/ui/Modal';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import { useStaffQuery } from '../../settings/api';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// KPI Tile
const KPITile = ({ icon: Icon, label, value, subtitle, trend, trendType, onClick }) => (
  <button
    onClick={onClick}
    className="text-left bg-white dark:bg-surface-primary border border-border rounded-lg p-3 transition-all hover:shadow-sm hover:border-primary/20 w-full"
  >
    <div className="flex items-start justify-between mb-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted" />}
        <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
          trendType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          trendType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {trendType === 'positive' ? <TrendingUp className="h-3 w-3" /> : 
           trendType === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
          {trend}
        </div>
      )}
    </div>
    <p className="text-xl font-bold text-text">{value}</p>
    {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
  </button>
);

// Filter Toolbar
const FilterToolbar = ({ searchTerm, onSearchChange, filters, children }) => (
  <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3 mb-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {filters}
      <div className="ml-auto flex items-center gap-2">
        {children}
      </div>
    </div>
  </div>
);

// Staff Card (Grid View)
const StaffCard = ({ member, onViewProfile, onAssignTask, onMessage }) => {
  const initials = member.name 
    ? member.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : member.email?.[0]?.toUpperCase() || '?';

  const statusConfig = {
    'clocked-in': { label: 'Clocked In', variant: 'success', icon: CheckCircle },
    'scheduled': { label: 'Scheduled', variant: 'info', icon: Calendar },
    'on-break': { label: 'On Break', variant: 'warning', icon: Coffee },
    'off': { label: 'Off Today', variant: 'neutral', icon: XCircle },
    'pto': { label: 'PTO', variant: 'accent', icon: Calendar },
  };

  const status = statusConfig[member.status] || statusConfig.off;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/20 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text truncate">
              {member.name || member.email || 'Staff Member'}
            </h4>
            <p className="text-xs text-muted truncate">{member.role || member.title || 'Staff'}</p>
          </div>
        </div>
        <button className="p-1 text-muted hover:text-text rounded">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Status */}
      <div className="mb-3">
        <Badge variant={status.variant} size="sm" className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </div>

      {/* Contact */}
      <div className="space-y-1.5 mb-3 text-xs text-muted">
        {member.email && (
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span>{member.phone}</span>
          </div>
        )}
      </div>

      {/* Next Shift */}
      {member.nextShift && (
        <div className="text-xs text-muted mb-3 py-2 px-2 bg-surface rounded">
          <span className="font-medium">Next:</span> {member.nextShift}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onViewProfile(member)}>
          Profile
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onAssignTask(member)}>
          Task
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onMessage(member)}>
          <MessageSquare className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Empty State
const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="text-center py-12">
    <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
      <Icon className="h-8 w-8 text-muted" />
    </div>
    <h3 className="font-medium text-text mb-1">{title}</h3>
    <p className="text-sm text-muted mb-4 max-w-sm mx-auto">{subtitle}</p>
    {action}
  </div>
);

// Section Header
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Progress Bar
const ProgressBar = ({ value, max = 100, color = 'primary', showLabel = true }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-medium text-text w-10 text-right">{value}%</span>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = ({ staff, stats, onViewProfile, onAddStaff }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Get unique roles
  const roles = useMemo(() => {
    return [...new Set(staff.map(s => s.role || s.title).filter(Boolean))];
  }, [staff]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const name = member.name || '';
      const email = member.email || '';
      const role = member.role || member.title || '';

      const matchesSearch = !searchTerm ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && member.isActive !== false) ||
        (statusFilter === 'inactive' && member.isActive === false) ||
        (statusFilter === 'clocked-in' && member.status === 'clocked-in');

      const matchesRole = roleFilter === 'all' || (role.toLowerCase() === roleFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [staff, searchTerm, statusFilter, roleFilter]);

  const kpis = [
    { icon: Users, label: 'Total Staff', value: stats.totalStaff, subtitle: '+2 this month', trend: '+2', trendType: 'positive' },
    { icon: CheckCircle, label: 'Active', value: stats.activeMembers, subtitle: 'On duty' },
    { icon: Briefcase, label: 'Roles', value: stats.roles, subtitle: 'Defined roles' },
    { icon: Target, label: 'Avg Tasks', value: stats.avgTasksPerStaff || 0, subtitle: 'Per staff/day' },
    { icon: Clock, label: 'Clocked In', value: stats.clockedIn || 0, subtitle: 'Working now' },
    { icon: Calendar, label: 'On Schedule', value: stats.scheduled || 0, subtitle: 'Today' },
    { icon: Coffee, label: 'On PTO', value: stats.onPto || 0, subtitle: 'Time off' },
    { icon: Percent, label: 'Utilization', value: `${stats.utilization || 0}%`, subtitle: 'Efficiency' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Grid - 2 rows × 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <KPITile key={i} {...kpi} />
        ))}
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar searchTerm={searchTerm} onSearchChange={setSearchTerm} filters={
        <>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="clocked-in">Clocked In</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </>
      }>
        <span className="text-sm text-muted">{filteredStaff.length} staff</span>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
        <Button size="sm" onClick={onAddStaff}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add Staff
        </Button>
      </FilterToolbar>

      {/* Staff Directory Grid - 3 columns */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members found"
          subtitle={staff.length === 0 ? "Add your first team member to get started" : "Try adjusting your filters"}
          action={staff.length === 0 && <Button onClick={onAddStaff}><UserPlus className="h-4 w-4 mr-1.5" />Add Staff</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member, i) => (
            <StaffCard
              key={member.id || member.recordId || i}
              member={{
                ...member,
                status: member.isActive === false ? 'off' : (member.status || 'scheduled'),
                nextShift: member.nextShift || 'Tomorrow 8:00 AM',
              }}
              onViewProfile={onViewProfile}
              onAssignTask={() => {}}
              onMessage={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ═══════════════════════════════════════════════════════════════════════════

const ScheduleTab = ({ staff }) => {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i));
  const weekStartStr = format(weekDays[0], 'yyyy-MM-dd');

  // Fetch weekly schedule from API
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const { getWeeklySchedule } = await import('../api-timeclock');
        // Use shifts API module
        const shiftsApi = await import('@/features/schedule/api/shifts');
        const response = await shiftsApi.getWeeklySchedule(weekStartStr);
        setWeeklyData(response);
      } catch (error) {
        console.error('Failed to fetch weekly schedule:', error);
        // Fall back to showing staff without shifts
        setWeeklyData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [weekStartStr]);

  // Transform API data or use staff list with empty shifts
  const shifts = useMemo(() => {
    if (weeklyData?.staff) {
      return weeklyData.staff.map((s) => ({
        staffId: s.id,
        staffName: s.name,
        shifts: weekDays.map((day) => {
          const dayIndex = day.getDay();
          const dayShifts = s.shifts?.[dayIndex] || [];
          if (dayShifts.length === 0) {
            return { date: day, start: null, end: null, type: 'off' };
          }
          const shift = dayShifts[0]; // Take first shift
          return {
            date: day,
            start: shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : null,
            end: shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : null,
            type: shift.status === 'CONFIRMED' ? 'confirmed' : 'scheduled',
            shiftId: shift.id,
          };
        }),
      }));
    }
    // Fallback to staff list with no shifts
    return staff.slice(0, 10).map((s) => ({
      staffId: s.id || s.recordId,
      staffName: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
      shifts: weekDays.map((day) => ({
        date: day,
        start: null,
        end: null,
        type: 'off',
      })),
    }));
  }, [weeklyData, staff, weekDays]);

  const handleAddShift = (staffId, date) => {
    setSelectedCell({ staffId, date });
    setShowAddShiftModal(true);
  };

  const handleCreateShift = async (data) => {
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      await shiftsApi.createShift({
        staffId: selectedCell.staffId,
        startTime: `${format(selectedCell.date, 'yyyy-MM-dd')}T${data.startTime}:00`,
        endTime: `${format(selectedCell.date, 'yyyy-MM-dd')}T${data.endTime}:00`,
        role: data.role,
        notes: data.notes,
      });
      setShowAddShiftModal(false);
      // Refetch
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
    } catch (error) {
      console.error('Failed to create shift:', error);
      alert('Failed to create shift');
    }
  };

  return (
    <div className="space-y-5">
      {/* Schedule Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text min-w-[180px] text-center">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
            Today
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Clone Week</Button>
          <Button variant="outline" size="sm">Publish Schedule</Button>
          <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Shift</Button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide w-40">Staff</th>
                {weekDays.map((day, i) => (
                  <th key={i} className={cn(
                    'px-3 py-3 text-center text-xs font-medium uppercase tracking-wide',
                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/10 text-primary' : 'text-muted'
                  )}>
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-lg font-semibold">{format(day, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                        {row.staffName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <span className="text-sm font-medium text-text truncate">{row.staffName}</span>
                    </div>
                  </td>
                  {row.shifts.map((shift, si) => (
                    <td key={si} className="px-2 py-2">
                      {shift.type === 'off' || !shift.start ? (
                        <div 
                          className="text-center text-xs text-muted cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded py-2 transition-colors"
                          onClick={() => handleAddShift(row.staffId, shift.date)}
                        >
                          <Plus className="h-3 w-3 mx-auto opacity-0 group-hover:opacity-100" />
                          <span className="group-hover:hidden">Off</span>
                        </div>
                      ) : shift.type === 'pto' ? (
                        <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded px-2 py-1.5 text-xs text-center">
                          PTO
                        </div>
                      ) : (
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded px-2 py-1.5 text-xs text-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                          {shift.start} - {shift.end}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span>PTO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Clocked In</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-gray-300 dark:bg-gray-600" />
          <span>Off</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TASKS TAB (Staff-Filtered)
// ═══════════════════════════════════════════════════════════════════════════

const TasksTab = ({ staff }) => {
  const [selectedStaff, setSelectedStaff] = useState('all');

  // Mock task data
  const tasks = [
    { id: 1, title: 'Morning feeding rounds', assignee: staff[0]?.name || 'Staff', status: 'overdue', priority: 'high', due: '8:00 AM' },
    { id: 2, title: 'Clean Run A1-A5', assignee: staff[1]?.name || 'Staff', status: 'in-progress', priority: 'medium', due: '10:00 AM' },
    { id: 3, title: 'Medication for Max', assignee: staff[0]?.name || 'Staff', status: 'pending', priority: 'high', due: '12:00 PM' },
    { id: 4, title: 'Grooming appointment', assignee: staff[2]?.name || 'Staff', status: 'completed', priority: 'low', due: '2:00 PM' },
  ];

  const workloadData = staff.slice(0, 4).map(s => ({
    name: s.name || s.email || 'Staff',
    tasks: Math.floor(Math.random() * 8) + 2,
    completed: Math.floor(Math.random() * 5),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Summary & Charts */}
        <div className="space-y-4">
          {/* Workload Balance */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
            <SectionHeader icon={PieChart} title="Workload Balance" subtitle="Tasks per staff" />
            <div className="space-y-3">
              {workloadData.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text">{s.name}</span>
                    <span className="text-muted">{s.completed}/{s.tasks}</span>
                  </div>
                  <ProgressBar value={(s.completed / s.tasks) * 100} color={s.completed === s.tasks ? 'success' : 'primary'} showLabel={false} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <KPITile icon={AlertTriangle} label="Overdue" value="2" subtitle="Need attention" />
            <KPITile icon={Clock} label="Pending" value="5" subtitle="Today" />
            <KPITile icon={CheckCircle} label="Completed" value="12" subtitle="Today" />
            <KPITile icon={Target} label="Avg/Staff" value="4.5" subtitle="Tasks" />
          </div>
        </div>

        {/* Right: Task List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none"
              >
                <option value="all">All Staff</option>
                {staff.map((s, i) => (
                  <option key={i} value={s.name || s.email}>{s.name || s.email}</option>
                ))}
              </select>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Assign Task</Button>
            </div>
            <div className="divide-y divide-border">
              {tasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-surface/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={task.status === 'completed'} readOnly className="mt-1 rounded" />
                      <div>
                        <p className={cn('text-sm font-medium', task.status === 'completed' ? 'line-through text-muted' : 'text-text')}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                          <span>{task.assignee}</span>
                          <span>•</span>
                          <span>Due {task.due}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={task.status === 'overdue' ? 'danger' : task.status === 'completed' ? 'success' : task.status === 'in-progress' ? 'info' : 'warning'}
                        size="sm"
                      >
                        {task.status}
                      </Badge>
                      <Badge
                        variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                        size="sm"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TIME CLOCK TAB
// ═══════════════════════════════════════════════════════════════════════════

const TimeClockTab = ({ staff }) => {
  // Mock time clock data
  const clockedIn = staff.slice(0, 3).map((s, i) => ({
    ...s,
    clockedInAt: `${7 + i}:${i * 15}0 AM`,
    duration: `${5 - i}h ${30 - i * 10}m`,
    status: i === 1 ? 'on-break' : 'working',
  }));

  const timesheets = staff.slice(0, 5).map((s, i) => ({
    name: s.name || s.email,
    mon: 8,
    tue: 7.5,
    wed: 8,
    thu: i === 2 ? 0 : 8,
    fri: 7,
    sat: i < 2 ? 4 : 0,
    sun: 0,
    total: i === 2 ? 30.5 : 42.5,
  }));

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <LogIn className="h-4 w-4 mr-2" />
          Clock In
        </Button>
        <Button variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Clock Out
        </Button>
        <Button variant="outline" size="sm">
          <Coffee className="h-4 w-4 mr-2" />
          Start Break
        </Button>
        <div className="ml-auto">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Timesheets
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Currently Clocked In */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Clock} title="Currently Clocked In" subtitle={`${clockedIn.length} staff`} />
          <div className="space-y-3">
            {clockedIn.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    s.status === 'on-break' ? 'bg-amber-500' : 'bg-green-500'
                  )} />
                  <div>
                    <p className="text-sm font-medium text-text">{s.name || s.email}</p>
                    <p className="text-xs text-muted">Since {s.clockedInAt}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text">{s.duration}</p>
                  <p className="text-xs text-muted">{s.status === 'on-break' ? 'On break' : 'Working'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timesheets Table */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <SectionHeader icon={FileText} title="Weekly Timesheets" />
            <select className="px-3 py-1.5 text-sm bg-surface border-0 rounded-lg">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Staff</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Mon</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Tue</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Wed</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Thu</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Fri</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Sat</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Sun</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-sm font-medium text-text">{row.name}</td>
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                      <td key={day} className={cn('px-3 py-2 text-center text-sm', row[day] === 0 ? 'text-muted' : 'text-text')}>
                        {row[day] || '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm font-semibold text-text">{row.total}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS TAB
// ═══════════════════════════════════════════════════════════════════════════

const ReviewsTab = ({ staff }) => {
  const metrics = staff.slice(0, 4).map((s, i) => ({
    name: s.name || s.email,
    attendance: 95 - i * 5,
    taskCompletion: 92 - i * 3,
    satisfaction: 4.5 - i * 0.3,
    punctuality: 90 - i * 8,
  }));

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPITile icon={CheckCircle} label="Avg Attendance" value="94%" trend="+2%" trendType="positive" />
        <KPITile icon={Target} label="Task Completion" value="89%" trend="-1%" trendType="negative" />
        <KPITile icon={Star} label="Avg Rating" value="4.3" subtitle="Out of 5" />
        <KPITile icon={Clock} label="Punctuality" value="91%" trend="+3%" trendType="positive" />
      </div>

      {/* Performance Table */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <SectionHeader icon={Award} title="30-Day Performance" />
          <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Review</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Staff</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Attendance</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Task Completion</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Rating</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">Punctuality</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-text">{m.name}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={m.attendance >= 90 ? 'success' : m.attendance >= 80 ? 'warning' : 'danger'} size="sm">
                      {m.attendance}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={m.taskCompletion >= 90 ? 'success' : m.taskCompletion >= 80 ? 'warning' : 'danger'} size="sm">
                      {m.taskCompletion}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-sm text-text">{m.satisfaction.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={m.punctuality >= 90 ? 'success' : m.punctuality >= 80 ? 'warning' : 'danger'} size="sm">
                      {m.punctuality}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES TAB
// ═══════════════════════════════════════════════════════════════════════════

const MessagesTab = ({ staff }) => {
  const conversations = staff.slice(0, 4).map((s, i) => ({
    id: i,
    name: s.name || s.email,
    lastMessage: ['See you tomorrow!', 'Thanks for covering my shift', 'Meeting at 3pm?', 'Done with feeding rounds'][i],
    time: ['2m', '15m', '1h', '3h'][i],
    unread: i === 0 ? 2 : 0,
  }));

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Message</Button>
        <Button variant="outline" size="sm"><Send className="h-3.5 w-3.5 mr-1.5" />Staff Broadcast</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Conversation List */}
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="divide-y divide-border">
            {conversations.map(conv => (
              <button key={conv.id} className="w-full p-3 text-left hover:bg-surface/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {conv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">{conv.name}</span>
                      <span className="text-xs text-muted">{conv.time}</span>
                    </div>
                    <p className="text-xs text-muted truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="h-5 w-5 flex items-center justify-center rounded-full bg-primary text-white text-xs">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Area */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-primary border border-border rounded-lg flex flex-col h-[400px]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                {conversations[0]?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{conversations[0]?.name}</p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-surface rounded-lg px-3 py-2 max-w-[70%]">
                  <p className="text-sm text-text">Hey, can you cover my shift tomorrow?</p>
                  <p className="text-xs text-muted mt-1">10:30 AM</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-white rounded-lg px-3 py-2 max-w-[70%]">
                  <p className="text-sm">Sure, no problem! What time?</p>
                  <p className="text-xs opacity-70 mt-1">10:32 AM</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-surface rounded-lg px-3 py-2 max-w-[70%]">
                  <p className="text-sm text-text">8 AM to 2 PM. Thanks so much!</p>
                  <p className="text-xs text-muted mt-1">10:35 AM</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none"
              />
              <Button size="sm"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════

const AnalyticsTab = ({ staff, stats }) => {
  const metrics = [
    { icon: Percent, label: 'Utilization', value: '78%', trend: '+5%', trendType: 'positive', subtitle: 'This month' },
    { icon: Clock, label: 'Shift Adherence', value: '94%', trend: '+2%', trendType: 'positive', subtitle: 'On-time rate' },
    { icon: Zap, label: 'Efficiency', value: '87%', subtitle: 'Task completion' },
    { icon: Target, label: 'Avg Tasks/Shift', value: '6.2', trend: '+0.5', trendType: 'positive' },
    { icon: Calendar, label: 'PTO Usage', value: '12 days', subtitle: 'Team total' },
    { icon: Clock, label: 'Total Hours', value: '342h', subtitle: 'This week' },
    { icon: DollarSign, label: 'Labor Cost', value: '$8,550', subtitle: 'This week' },
    { icon: TrendingUp, label: 'Productivity', value: '+12%', trend: 'vs last month', trendType: 'positive' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((kpi, i) => (
          <KPITile key={i} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={BarChart3} title="Hours by Staff" subtitle="This week" />
          <div className="space-y-3 mt-4">
            {staff.slice(0, 4).map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-text">{s.name || s.email}</span>
                  <span className="text-muted">{40 - i * 5}h</span>
                </div>
                <ProgressBar value={(40 - i * 5) / 45 * 100} color="primary" showLabel={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
          <SectionHeader icon={Activity} title="Attendance Trends" subtitle="Last 30 days" />
          <div className="h-40 bg-surface/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-muted mx-auto mb-2" />
              <p className="text-xs text-muted">Attendance chart</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD STAFF WIZARD
// ═══════════════════════════════════════════════════════════════════════════

const AddStaffWizard = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    permissions: [],
    availability: {},
    wage: '',
  });

  const steps = [
    { num: 1, title: 'Basic Info', icon: Users },
    { num: 2, title: 'Contact', icon: Mail },
    { num: 3, title: 'Role', icon: Briefcase },
    { num: 4, title: 'Permissions', icon: Shield },
    { num: 5, title: 'Availability', icon: Calendar },
    { num: 6, title: 'Compensation', icon: DollarSign },
  ];

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
    else {
      onComplete(formData);
      onClose();
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Add Staff Member" className="max-w-2xl">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
              step === s.num ? 'bg-primary/10 text-primary' :
              step > s.num ? 'text-green-600' : 'text-muted'
            )}>
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium',
                step === s.num ? 'bg-primary text-white' :
                step > s.num ? 'bg-green-500 text-white' : 'bg-surface'
              )}>
                {step > s.num ? <Check className="h-3 w-3" /> : s.num}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.title}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[200px]">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Job Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Kennel Attendant"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select a role...</option>
                <option value="manager">Manager</option>
                <option value="attendant">Kennel Attendant</option>
                <option value="groomer">Groomer</option>
                <option value="trainer">Trainer</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Department</label>
              <select className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select department...</option>
                <option value="operations">Operations</option>
                <option value="grooming">Grooming</option>
                <option value="training">Training</option>
                <option value="admin">Administration</option>
              </select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted mb-3">Select permissions for this staff member:</p>
            {['View bookings', 'Manage bookings', 'View pets', 'Manage pets', 'View payments', 'Manage staff', 'Admin access'].map(perm => (
              <label key={perm} className="flex items-center gap-3 py-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-sm text-text">{perm}</span>
              </label>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-muted mb-3">Set default working hours:</p>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <div key={day} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-24">
                  <input type="checkbox" defaultChecked={day !== 'Sunday'} className="rounded border-border" />
                  <span className="text-sm text-text">{day.slice(0, 3)}</span>
                </label>
                <input type="time" defaultValue="08:00" className="px-2 py-1 bg-surface border border-border rounded text-sm" />
                <span className="text-muted">to</span>
                <input type="time" defaultValue="17:00" className="px-2 py-1 bg-surface border border-border rounded text-sm" />
              </div>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Pay Type</label>
              <select className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Hourly Rate / Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  value={formData.wage}
                  onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
                  placeholder="15.00"
                  className="w-full pl-7 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
        <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
          {step > 1 ? 'Back' : 'Cancel'}
        </Button>
        <Button onClick={handleNext}>
          {step < 6 ? 'Next' : 'Add Staff Member'}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TeamOverview = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Fetch staff data
  const { data: staffData, isLoading } = useStaffQuery();

  // Process staff data
  const { staff, stats, hasStaff } = useMemo(() => {
    if (!staffData || isLoading) {
      return {
        staff: [],
        stats: { totalStaff: 0, activeMembers: 0, roles: 0, avgTasksPerStaff: 0, clockedIn: 0, scheduled: 0, onPto: 0, utilization: 0 },
        hasStaff: false,
      };
    }

    const staffArray = staffData || [];
    const activeMembers = staffArray.filter(s => s.isActive !== false).length;
    const roles = [...new Set(staffArray.map(s => s.role || s.title).filter(Boolean))].length;

    return {
      staff: staffArray,
      stats: {
        totalStaff: staffArray.length,
        activeMembers,
        roles: roles || 1,
        avgTasksPerStaff: 4,
        clockedIn: Math.min(activeMembers, 3),
        scheduled: Math.min(activeMembers, 4),
        onPto: 0,
        utilization: 78,
      },
      hasStaff: staffArray.length > 0,
    };
  }, [staffData, isLoading]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Users },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'tasks', label: 'Tasks', icon: Target },
    { key: 'timeclock', label: 'Time Clock', icon: Clock },
    { key: 'reviews', label: 'Reviews', icon: Star },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleViewProfile = (member) => {
    setSelectedStaff(member);
  };

  const handleAddStaffComplete = (data) => {
    setShowAddStaff(false);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab staff={staff} stats={stats} onViewProfile={handleViewProfile} onAddStaff={() => setShowAddStaff(true)} />;
      case 'schedule':
        return <ScheduleTab staff={staff} />;
      case 'tasks':
        return <TasksTab staff={staff} />;
      case 'timeclock':
        return <TimeClockTab staff={staff} />;
      case 'reviews':
        return <ReviewsTab staff={staff} />;
      case 'messages':
        return <MessagesTab staff={staff} />;
      case 'analytics':
        return <AnalyticsTab staff={staff} stats={stats} />;
      default:
        return <OverviewTab staff={staff} stats={stats} onViewProfile={handleViewProfile} onAddStaff={() => setShowAddStaff(true)} />;
    }
  };

  // Empty state for no staff
  if (!hasStaff && !isLoading) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <nav className="mb-1">
              <ol className="flex items-center gap-1 text-xs text-muted">
                <li><Link to="/" className="hover:text-primary">Administration</Link></li>
                <li><ChevronRight className="h-3 w-3" /></li>
                <li className="text-text font-medium">Team</li>
              </ol>
            </nav>
            <h1 className="text-lg font-semibold text-text">Team Management</h1>
            <p className="text-xs text-muted mt-0.5">Build and manage your team</p>
          </div>
          <Button size="sm" onClick={() => setShowAddStaff(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Staff
          </Button>
        </div>

        <EmptyState
          icon={Users}
          title="No staff members yet"
          subtitle="Add your first team member to enable scheduling, task assignment, time tracking, and performance analytics."
          action={
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowAddStaff(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add First Staff Member
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-1.5" />
                Bulk Import
              </Button>
            </div>
          }
        />

        <AddStaffWizard isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} onComplete={handleAddStaffComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/" className="hover:text-primary">Administration</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Team</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Team Management</h1>
          <p className="text-xs text-muted mt-0.5">Manage staff, schedules, and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowAddStaff(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <LoadingState label="Loading team…" variant="skeleton" />
      ) : (
        renderTab()
      )}

      {/* Add Staff Wizard */}
      <AddStaffWizard isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} onComplete={handleAddStaffComplete} />
    </div>
  );
};

export default TeamOverview;
