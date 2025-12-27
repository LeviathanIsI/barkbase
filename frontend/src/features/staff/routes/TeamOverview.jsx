/**
 * Staff / Team Module - Enterprise Workforce Management
 * Modeled after Deputy, WhenIWork, Homebase, BambooHR,  Teams
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  AlertCircle,
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
  Repeat2,
  Info,
  RotateCcw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import SlidePanel from '@/components/ui/SlidePanel';
import Modal from '@/components/ui/Modal';
import StyledSelect from '@/components/ui/StyledSelect';
import CreatableSelect from '@/components/ui/CreatableSelect';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import { useStaffQuery } from '../../settings/api';
import {
  useDepartments,
  useAddDepartment,
} from '../api';
import { useStaffRoles, useAddStaffRole } from '@/features/roles/api';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { useStaffRoleOptions, useDefaultRole, getRoleColor } from '@/lib/useStaffRoles';

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
          <MessageSquare className="h-3 w-3 mr-1" />
          Message
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

// Format next shift time as "Today 2:00 PM", "Tomorrow 9:00 AM", "Mon 8:00 AM", etc.
const formatNextShift = (date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = addDays(today, 1);
  const shiftDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = format(date, 'h:mm a');

  if (shiftDay.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  }
  if (shiftDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${timeStr}`;
  }
  // Within this week, show day name
  const daysAhead = Math.floor((shiftDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAhead <= 6) {
    return `${format(date, 'EEE')} ${timeStr}`;
  }
  // Further out, show date
  return `${format(date, 'MMM d')} ${timeStr}`;
};

const OverviewTab = ({ staff, stats, onViewProfile, onAddStaff }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [upcomingShifts, setUpcomingShifts] = useState({});

  // Fetch upcoming shifts to compute "Next:" for each staff member
  useEffect(() => {
    const fetchUpcomingShifts = async () => {
      try {
        const shiftsApi = await import('@/features/schedule/api/shifts');
        const today = format(new Date(), 'yyyy-MM-dd');
        const endDate = format(addDays(new Date(), 14), 'yyyy-MM-dd'); // Look ahead 2 weeks
        const response = await shiftsApi.getShifts({ startDate: today, endDate });
        const shifts = response?.data || [];

        // Group by staffId and find the earliest upcoming shift for each
        const nextShiftMap = {};
        const now = new Date();

        shifts.forEach(shift => {
          const staffId = shift.staffId || shift.staff_id;
          const startTime = new Date(shift.startTime || shift.start_time);

          if (startTime > now) {
            if (!nextShiftMap[staffId] || startTime < new Date(nextShiftMap[staffId].startTime)) {
              nextShiftMap[staffId] = {
                startTime: shift.startTime || shift.start_time,
                formatted: formatNextShift(startTime),
              };
            }
          }
        });

        setUpcomingShifts(nextShiftMap);
      } catch (error) {
        console.warn('[OverviewTab] Failed to fetch upcoming shifts:', error?.message);
      }
    };

    if (staff.length > 0) {
      fetchUpcomingShifts();
    }
  }, [staff]);

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
    {
      icon: Users,
      label: 'Total Staff',
      value: stats.totalStaff,
      subtitle: stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'Total count',
      trend: stats.newThisMonth > 0 ? `+${stats.newThisMonth}` : null,
      trendType: stats.newThisMonth > 0 ? 'positive' : null,
    },
    { icon: CheckCircle, label: 'Active', value: stats.loggedIn || 0, subtitle: 'Logged in now' },
    { icon: Briefcase, label: 'Roles', value: stats.roles, subtitle: 'Defined roles' },
    { icon: Target, label: 'Avg Tasks', value: stats.avgTasksPerStaff || 0, subtitle: 'Per staff today' },
    { icon: Clock, label: 'Clocked In', value: stats.clockedIn || 0, subtitle: 'Working now' },
    { icon: Calendar, label: 'On Schedule', value: stats.scheduled || 0, subtitle: 'Today' },
    { icon: Coffee, label: 'On PTO', value: stats.onPto || 0, subtitle: 'Time off' },
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
          <div className="min-w-[130px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'clocked-in', label: 'Clocked In' },
              ]}
              value={statusFilter}
              onChange={(opt) => setStatusFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div className="min-w-[130px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Roles' },
                ...roles.map(role => ({ value: role, label: role }))
              ]}
              value={roleFilter}
              onChange={(opt) => setRoleFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </>
      }>
        <span className="text-sm text-muted">{filteredStaff.length} staff</span>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
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
          {filteredStaff.map((member, i) => {
            const staffId = member.id || member.recordId;
            const nextShift = upcomingShifts[staffId]?.formatted;
            return (
              <StaffCard
                key={staffId || i}
                member={{
                  ...member,
                  status: member.isActive === false ? 'off' : (member.status || 'scheduled'),
                  nextShift: nextShift || null, // null hides the field entirely if no upcoming shift
                }}
                onViewProfile={onViewProfile}
                onAssignTask={() => {}}
                onMessage={() => {}}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ═══════════════════════════════════════════════════════════════════════════

// Helper function to convert hex color to Tailwind-compatible style object
const hexToRgba = (hex, alpha = 0.9) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Get role color style for shift blocks (uses dynamic colors from tenant config)
const getRoleColorStyle = (roles, roleNameOrId) => {
  const color = getRoleColor(roles, roleNameOrId);
  return {
    backgroundColor: hexToRgba(color, 0.9),
    borderColor: hexToRgba(color, 0.7),
  };
};

// Fallback static colors (kept for backwards compatibility)
const ROLE_COLORS = {
  'Kennel Tech': 'bg-blue-500/90 border-blue-400',
  'Groomer': 'bg-purple-500/90 border-purple-400',
  'Manager': 'bg-orange-500/90 border-orange-400',
  'Trainer': 'bg-emerald-500/90 border-emerald-400',
  'default': 'bg-slate-500/90 border-slate-400',
};

// Override reason options for editing auto-generated shifts
const OVERRIDE_REASONS = [
  { value: 'time_change', label: 'Time adjustment' },
  { value: 'pto', label: 'PTO / Vacation' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'swap', label: 'Shift swap' },
  { value: 'training', label: 'Training' },
  { value: 'day_off', label: 'Day off' },
  { value: 'other', label: 'Other' },
];

// Visual styles for different shift states
const SHIFT_STATE_STYLES = {
  autoGenerated: 'border-dashed border-2',      // Untouched auto-generated
  override: 'border-solid border-2',             // Edited override
  overridePto: 'bg-amber-500/90 border-amber-400',
  overrideSick: 'bg-orange-500/90 border-orange-400',
  overrideDayOff: 'bg-slate-400/60 border-slate-300',
  manual: 'border-solid',                        // Manually created
};

// Format time for display (24h to 12h format)
const formatShiftTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'p' : 'a';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
};

const ScheduleTab = ({ staff }) => {
  // Get dynamic staff roles from tenant configuration
  const { data: staffRoles } = useStaffRoles();
  const roleOptions = useStaffRoleOptions();

  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showWeekScheduleModal, setShowWeekScheduleModal] = useState(false);
  const [selectedStaffForWeek, setSelectedStaffForWeek] = useState(null);
  const [showDefaultScheduleModal, setShowDefaultScheduleModal] = useState(false);
  const [editingDefaultSchedule, setEditingDefaultSchedule] = useState(null);
  const [defaultSchedules, setDefaultSchedules] = useState([]);

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

  // Day name mapping for default schedules
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Transform API data or use staff list with empty shifts
  // Also merge with default schedules for auto-generation
  const shifts = useMemo(() => {
    // Helper to get default schedule shift for a staff member on a specific day
    const getDefaultShift = (staffId, dayIndex, date) => {
      const defaultSchedule = defaultSchedules.find(ds => ds.staffId === staffId);
      if (!defaultSchedule) return null;

      // Check if effective date has passed
      if (defaultSchedule.effectiveFrom) {
        const effectiveDate = new Date(defaultSchedule.effectiveFrom);
        if (date < effectiveDate) return null;
      }

      const dayKey = DAY_KEYS[dayIndex];
      const daySchedule = defaultSchedule.schedule?.[dayKey];
      if (!daySchedule) return null;

      return {
        start: daySchedule.start,
        end: daySchedule.end,
        role: daySchedule.role,
        source: 'default',
        isOverride: false,
        overrideReason: null,
        originalStart: daySchedule.start,
        originalEnd: daySchedule.end,
        defaultScheduleId: defaultSchedule.id,
        staffName: defaultSchedule.staffName,
      };
    };

    if (weeklyData?.staff) {
      return weeklyData.staff.map((s) => ({
        staffId: s.id,
        staffName: s.name,
        role: s.role || 'Kennel Tech',
        shifts: weekDays.map((day) => {
          const dayIndex = day.getDay();
          const dayShifts = s.shifts?.[dayIndex] || [];

          if (dayShifts.length > 0) {
            // Use existing shift from API (could be manual or override)
            const shift = dayShifts[0];
            return {
              date: day,
              start: shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : null,
              end: shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : null,
              type: shift.status === 'CONFIRMED' ? 'confirmed' : 'scheduled',
              shiftId: shift.id,
              role: shift.role || s.role || 'Kennel Tech',
              // Override fields from API
              source: shift.source || 'manual',
              isOverride: shift.isOverride || false,
              overrideReason: shift.overrideReason || null,
              originalStart: shift.originalStartTime || null,
              originalEnd: shift.originalEndTime || null,
              notes: shift.notes || '',
            };
          }

          // No manual shift - check for default schedule
          const defaultShift = getDefaultShift(s.id, dayIndex, day);
          if (defaultShift) {
            return {
              date: day,
              ...defaultShift,
              type: 'auto-generated',
            };
          }

          // No shift at all
          return { date: day, start: null, end: null, type: 'off', role: null, source: null };
        }),
      }));
    }

    // Fallback to staff list - merge with default schedules
    return staff.slice(0, 10).map((s) => {
      const staffId = s.id || s.recordId;
      return {
        staffId,
        staffName: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
        role: s.role || s.position || 'Kennel Tech',
        shifts: weekDays.map((day) => {
          const dayIndex = day.getDay();

          // Check for default schedule
          const defaultShift = getDefaultShift(staffId, dayIndex, day);
          if (defaultShift) {
            return {
              date: day,
              ...defaultShift,
              type: 'auto-generated',
            };
          }

          return {
            date: day,
            start: null,
            end: null,
            type: 'off',
            role: null,
            source: null,
          };
        }),
      };
    });
  }, [weeklyData, staff, weekDays, defaultSchedules]);

  // Filter shifts by role
  const filteredShifts = useMemo(() => {
    if (roleFilter === 'all') return shifts;
    return shifts.filter(s => s.role === roleFilter);
  }, [shifts, roleFilter]);

  // Calculate coverage for each day (minimum needed = 2 staff for adequate coverage)
  const coverage = useMemo(() => {
    const minNeeded = Math.max(2, Math.ceil(shifts.length * 0.5)); // At least 50% or 2 staff
    return weekDays.map((day, dayIndex) => {
      const shiftsOnDay = shifts.filter(s => s.shifts[dayIndex]?.start).length;
      const ratio = minNeeded > 0 ? shiftsOnDay / minNeeded : 0;
      // Coverage thresholds based on meeting minimum requirements
      let status = 'red';
      if (ratio >= 1) status = 'green';
      else if (ratio >= 0.5) status = 'yellow';
      return {
        count: shiftsOnDay,
        needed: minNeeded,
        ratio,
        status,
        dayName: format(day, 'EEEE'),
      };
    });
  }, [shifts, weekDays]);

  // Check for conflicts (overtime warning)
  const getStaffWeeklyHours = (staffShifts) => {
    return staffShifts.reduce((total, shift) => {
      if (!shift.start || !shift.end) return total;
      const [startH, startM] = shift.start.split(':').map(Number);
      const [endH, endM] = shift.end.split(':').map(Number);
      const hours = (endH + endM / 60) - (startH + startM / 60);
      return total + (hours > 0 ? hours : 0);
    }, 0);
  };

  const handleAddShift = (staffId, date) => {
    setSelectedCell({ staffId, date });
    setEditingShift(null);
    setShowAddShiftModal(true);
  };

  const handleEditShift = (staffId, shift) => {
    setSelectedCell({ staffId, date: shift.date });
    setEditingShift(shift);
    setShowAddShiftModal(true);
  };

  const handleOpenWeekSchedule = (staffRow) => {
    setSelectedStaffForWeek({
      staffId: staffRow.staffId,
      staffName: staffRow.staffName,
      role: staffRow.role,
      shifts: staffRow.shifts,
    });
    setShowWeekScheduleModal(true);
  };

  // Default Schedule handlers
  const handleAddDefaultSchedule = () => {
    setEditingDefaultSchedule(null);
    setShowDefaultScheduleModal(true);
  };

  const handleEditDefaultSchedule = (schedule) => {
    setEditingDefaultSchedule(schedule);
    setShowDefaultScheduleModal(true);
  };

  const handleDeleteDefaultSchedule = (scheduleId) => {
    if (confirm('Are you sure you want to delete this default schedule?')) {
      setDefaultSchedules(prev => prev.filter(s => s.id !== scheduleId));
    }
  };

  const handleSaveDefaultSchedule = (data) => {
    if (editingDefaultSchedule) {
      // Update existing
      setDefaultSchedules(prev => prev.map(s =>
        s.id === editingDefaultSchedule.id ? { ...s, ...data } : s
      ));
    } else {
      // Add new
      setDefaultSchedules(prev => [...prev, {
        id: `default-${Date.now()}`,
        ...data,
      }]);
    }
    setShowDefaultScheduleModal(false);
  };

  const handleApplyDefaultToWeek = async (defaultSchedule) => {
    // Apply the default schedule to the current week
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      for (let i = 0; i < 7; i++) {
        const daySchedule = defaultSchedule.schedule[days[i]];
        if (daySchedule) {
          const targetDate = weekDays[i];
          await shiftsApi.createShift({
            staffId: defaultSchedule.staffId,
            startTime: `${format(targetDate, 'yyyy-MM-dd')}T${daySchedule.start}:00`,
            endTime: `${format(targetDate, 'yyyy-MM-dd')}T${daySchedule.end}:00`,
            role: daySchedule.role,
            source: 'default',
          });
        }
      }

      // Refetch schedule
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      alert('Default schedule applied to current week');
    } catch (error) {
      console.error('Failed to apply default schedule:', error);
      alert('Failed to apply default schedule');
    }
  };

  const handleSaveWeekSchedule = async (weekData) => {
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');

      // Process each day
      for (const dayData of weekData) {
        const dateStr = format(dayData.date, 'yyyy-MM-dd');

        if (dayData.isOff) {
          // Delete existing shift if marked as off
          if (dayData.existingShiftId) {
            await shiftsApi.deleteShift(dayData.existingShiftId);
          }
        } else if (dayData.startTime && dayData.endTime) {
          if (dayData.existingShiftId) {
            // Update existing shift
            await shiftsApi.updateShift(dayData.existingShiftId, {
              startTime: `${dateStr}T${dayData.startTime}:00`,
              endTime: `${dateStr}T${dayData.endTime}:00`,
              role: dayData.role,
            });
          } else {
            // Create new shift
            await shiftsApi.createShift({
              staffId: selectedStaffForWeek.staffId,
              startTime: `${dateStr}T${dayData.startTime}:00`,
              endTime: `${dateStr}T${dayData.endTime}:00`,
              role: dayData.role,
            });
          }
        }
      }

      // Refetch schedule
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      setShowWeekScheduleModal(false);
    } catch (error) {
      console.error('Failed to save week schedule:', error);
      alert('Failed to save week schedule');
    }
  };

  const handleCreateShift = async (data, addAnother = false) => {
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      const shiftData = {
        staffId: data.staffId || selectedCell.staffId,
        startTime: `${format(selectedCell.date, 'yyyy-MM-dd')}T${data.startTime}:00`,
        endTime: `${format(selectedCell.date, 'yyyy-MM-dd')}T${data.endTime}:00`,
        role: data.role,
        notes: data.notes,
        // Override fields for shifts created from defaults
        source: data.source || 'manual',
        isOverride: data.isOverride || false,
        overrideReason: data.overrideReason || null,
        originalStartTime: data.originalStart || null,
        originalEndTime: data.originalEnd || null,
      };

      if (data.shiftId) {
        // Update existing shift
        await shiftsApi.updateShift(data.shiftId, shiftData);
      } else {
        // Create new shift
        await shiftsApi.createShift(shiftData);
      }

      // Refetch
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      // Only close modal if not adding another
      if (!addAnother) {
        setShowAddShiftModal(false);
      }
    } catch (error) {
      console.error('Failed to create/update shift:', error);
      alert('Failed to save shift');
    }
  };

  // Revert an overridden shift back to the default schedule
  const handleRevertShift = async (shift) => {
    try {
      if (shift.shiftId) {
        const shiftsApi = await import('@/features/schedule/api/shifts');
        // Delete the override record - shift will regenerate from default
        await shiftsApi.deleteShift(shift.shiftId);
      }
      // Refetch to show the regenerated default shift
      const shiftsApi = await import('@/features/schedule/api/shifts');
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      setShowAddShiftModal(false);
    } catch (error) {
      console.error('Failed to revert shift:', error);
      alert('Failed to revert shift');
    }
  };

  const handleCloneWeek = async () => {
    setIsCloning(true);
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      const prevWeekStart = format(addDays(selectedWeek, -7), 'yyyy-MM-dd');
      await shiftsApi.cloneWeek(prevWeekStart, weekStartStr);
      // Refetch current week
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      alert('Week cloned successfully');
    } catch (error) {
      console.error('Failed to clone week:', error);
      alert('Failed to clone week. The API endpoint may not be implemented yet.');
    } finally {
      setIsCloning(false);
    }
  };

  const handlePublishSchedule = async () => {
    setIsPublishing(true);
    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      await shiftsApi.publishSchedule(weekStartStr);
      // Refetch to update status
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
      alert('Schedule published successfully');
    } catch (error) {
      console.error('Failed to publish schedule:', error);
      alert('Failed to publish schedule. The API endpoint may not be implemented yet.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Native drag-drop handlers
  const handleDragStart = (e, staffId, shift, dayIndex) => {
    setDraggedShift({ staffId, shift, dayIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ staffId, shift, dayIndex }));
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e, targetStaffId, targetDayIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ staffId: targetStaffId, dayIndex: targetDayIndex });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e, targetStaffId, targetDayIndex) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedShift) return;

    const { staffId: sourceStaffId, shift, dayIndex: sourceDayIndex } = draggedShift;

    // Don't do anything if dropped on same cell
    if (sourceStaffId === targetStaffId && sourceDayIndex === targetDayIndex) {
      setDraggedShift(null);
      return;
    }

    try {
      const shiftsApi = await import('@/features/schedule/api/shifts');
      const targetDate = weekDays[targetDayIndex];

      // Update shift with new staff/date
      if (shift.shiftId) {
        await shiftsApi.updateShift(shift.shiftId, {
          staffId: targetStaffId,
          startTime: `${format(targetDate, 'yyyy-MM-dd')}T${shift.start}:00`,
          endTime: `${format(targetDate, 'yyyy-MM-dd')}T${shift.end}:00`,
        });
      } else {
        // Create new shift at target
        await shiftsApi.createShift({
          staffId: targetStaffId,
          startTime: `${format(targetDate, 'yyyy-MM-dd')}T${shift.start}:00`,
          endTime: `${format(targetDate, 'yyyy-MM-dd')}T${shift.end}:00`,
          role: shift.role,
        });
      }

      // Refetch
      const response = await shiftsApi.getWeeklySchedule(weekStartStr);
      setWeeklyData(response);
    } catch (error) {
      console.error('Failed to move shift:', error);
      alert('Failed to move shift');
    }

    setDraggedShift(null);
  };

  return (
    <div className="space-y-4">
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
        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Roles</option>
            {staffRoles.map((role) => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleCloneWeek} disabled={isCloning}>
            {isCloning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Clone Week
          </Button>
          <Button variant="outline" size="sm" onClick={handlePublishSchedule} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Publish Schedule
          </Button>
        </div>
      </div>

      {/* Coverage Bar */}
      <div className="bg-surface rounded-lg border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted">Daily Coverage</span>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Fully Staffed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Minimal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Understaffed</span>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1">
          <div className="col-span-1" /> {/* Empty for staff column alignment */}
          {coverage.map((cov, i) => (
            <div
              key={i}
              className="flex flex-col items-center group relative cursor-help"
              title={`${cov.dayName}: ${cov.count} staff scheduled / ${cov.needed} needed`}
            >
              <div className={`h-2.5 w-full rounded-full transition-all ${
                cov.status === 'green' ? 'bg-green-500' :
                cov.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
              } group-hover:brightness-110`} />
              <span className="text-[10px] text-muted mt-1">
                {cov.count} / {cov.needed}
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                  {cov.dayName}: {cov.count} staff / {cov.needed} needed
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="font-medium">Roles:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Kennel Tech</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-purple-500" />
          <span>Groomer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-500" />
          <span>Manager</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span>Trainer</span>
        </div>
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Grid Header */}
          <div className="grid grid-cols-8 border-b border-border bg-surface-alt/30">
            <div className="p-3 text-xs font-medium text-muted border-r border-border">
              Staff Member
            </div>
            {weekDays.map((day, i) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div
                  key={i}
                  className={`p-3 text-center border-r border-border last:border-r-0 ${
                    isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted'}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-text'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          {filteredShifts.map((staffRow) => {
            const weeklyHours = getStaffWeeklyHours(staffRow.shifts);
            const hasOvertime = weeklyHours > 40;

            return (
              <div
                key={staffRow.staffId}
                className="grid grid-cols-8 border-b border-border last:border-b-0 hover:bg-surface-alt/20 transition-colors"
              >
                {/* Staff Name Column */}
                <div className="p-3 border-r border-border flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text truncate">
                      {staffRow.staffName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{staffRow.role}</span>
                      <button
                        onClick={() => handleOpenWeekSchedule(staffRow)}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                        title="Schedule entire week"
                      >
                        <Calendar className="h-3 w-3" />
                        <span>Schedule Week</span>
                      </button>
                    </div>
                  </div>
                  {hasOvertime && (
                    <div className="text-amber-500" title={`${weeklyHours.toFixed(1)}h - Overtime warning`}>
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Day Cells */}
                {staffRow.shifts.map((shift, dayIndex) => {
                  const isDropTarget = dragOverCell?.staffId === staffRow.staffId &&
                                      dragOverCell?.dayIndex === dayIndex;
                  const hasShift = shift.start && shift.end;

                  // Determine shift visual state
                  const isAutoGenerated = shift.source === 'default' && !shift.isOverride;
                  const isOverride = shift.source === 'default' && shift.isOverride;
                  const isPto = shift.overrideReason === 'pto';
                  const isSick = shift.overrideReason === 'sick';
                  const isDayOff = shift.overrideReason === 'day_off';

                  // Get dynamic color from configured roles (or fallback)
                  const roleColorStyle = getRoleColorStyle(staffRoles, shift.role);

                  // Override colors for special states
                  let overrideColorClass = '';
                  if (isPto) overrideColorClass = SHIFT_STATE_STYLES.overridePto;
                  else if (isSick) overrideColorClass = SHIFT_STATE_STYLES.overrideSick;
                  else if (isDayOff) overrideColorClass = SHIFT_STATE_STYLES.overrideDayOff;

                  // Border style
                  const borderStyle = isAutoGenerated
                    ? 'border-dashed border-2 border-white/50'
                    : 'border-solid border';

                  return (
                    <div
                      key={dayIndex}
                      className={`relative min-h-[60px] p-1.5 border-r border-border last:border-r-0
                        transition-all group cursor-pointer
                        ${isDropTarget ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}
                        ${!hasShift ? 'hover:bg-surface-alt/40' : ''}
                      `}
                      onClick={() => !hasShift && handleAddShift(staffRow.staffId, shift.date)}
                      onDragOver={(e) => handleDragOver(e, staffRow.staffId, dayIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, staffRow.staffId, dayIndex)}
                    >
                      {hasShift ? (
                        /* Shift Block */
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, staffRow.staffId, shift, dayIndex)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditShift(staffRow.staffId, shift);
                          }}
                          style={overrideColorClass ? {} : roleColorStyle}
                          className={`h-full rounded-md px-2 py-1.5 text-white
                            cursor-grab active:cursor-grabbing ${borderStyle}
                            ${overrideColorClass}
                            hover:brightness-110 transition-all shadow-sm
                            flex flex-col justify-center relative`}
                        >
                          {/* Status indicator badge */}
                          {isAutoGenerated && (
                            <div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-white/90 rounded-full flex items-center justify-center shadow-sm"
                              title="Auto-generated from default schedule"
                            >
                              <Repeat2 className="h-2.5 w-2.5 text-slate-600" />
                            </div>
                          )}
                          {isOverride && !isPto && !isSick && !isDayOff && (
                            <div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm"
                              title="Edited override"
                            >
                              <Edit3 className="h-2 w-2 text-white" />
                            </div>
                          )}

                          {/* Time display */}
                          <div className="text-xs font-semibold leading-tight">
                            {formatShiftTime(shift.start)} - {formatShiftTime(shift.end)}
                          </div>

                          {/* Role or override label */}
                          <div className="text-[10px] opacity-90 truncate font-medium">
                            {isPto ? 'PTO' : isSick ? 'Sick' : isDayOff ? 'Off' : (shift.role || staffRow.role)}
                          </div>
                        </div>
                      ) : (
                        /* Empty Cell - Show + on hover */
                        <div className="h-full flex items-center justify-center">
                          <Plus className="h-5 w-5 text-muted/0 group-hover:text-muted/60 transition-colors" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Default Schedules Section */}
      <div className="mt-8 bg-surface rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt/30">
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Default Schedules
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Staff with recurring weekly schedules auto-populate unless overridden
            </p>
          </div>
          <Button size="sm" onClick={handleAddDefaultSchedule}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Default
          </Button>
        </div>

        {defaultSchedules.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-muted/40 mx-auto mb-3" />
            <p className="text-sm text-muted">No default schedules configured</p>
            <p className="text-xs text-muted/70 mt-1">
              Add a default schedule to automatically populate shifts each week
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleAddDefaultSchedule}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Default Schedule
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-alt/20">
                  <th className="text-left text-xs font-medium text-muted p-3 w-48">Staff Member</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Sun</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Mon</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Tue</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Wed</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Thu</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Fri</th>
                  <th className="text-center text-xs font-medium text-muted p-2 w-20">Sat</th>
                  <th className="text-right text-xs font-medium text-muted p-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {defaultSchedules.map((schedule) => {
                  const staffMember = staff.find(s => (s.id || s.recordId) === schedule.staffId);
                  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

                  return (
                    <tr key={schedule.id} className="border-b border-border last:border-b-0 hover:bg-surface-alt/20">
                      <td className="p-3">
                        <div className="text-sm font-medium text-text">
                          {staffMember?.name || schedule.staffName || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted uppercase">
                          {schedule.defaultRole || staffMember?.role || 'Staff'}
                        </div>
                      </td>
                      {days.map((day) => {
                        const daySchedule = schedule.schedule?.[day];
                        return (
                          <td key={day} className="p-2 text-center">
                            {daySchedule ? (
                              <div className="text-xs">
                                <div className="font-medium text-text">
                                  {formatShiftTime(daySchedule.start)}-{formatShiftTime(daySchedule.end)}
                                </div>
                                <div className="text-muted text-[10px] uppercase">
                                  {daySchedule.role?.substring(0, 3) || ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted/50">OFF</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleApplyDefaultToWeek(schedule)}
                            className="p-1.5 text-muted hover:text-primary transition-colors"
                            title="Apply to current week"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditDefaultSchedule(schedule)}
                            className="p-1.5 text-muted hover:text-primary transition-colors"
                            title="Edit default schedule"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDefaultSchedule(schedule.id)}
                            className="p-1.5 text-muted hover:text-red-500 transition-colors"
                            title="Delete default schedule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Shift Modal */}
      <Modal
        open={showAddShiftModal}
        onClose={() => setShowAddShiftModal(false)}
        title={editingShift ? 'Edit Shift' : 'Add Shift'}
        size="sm"
      >
        <AddShiftForm
          staff={staff}
          selectedStaffId={selectedCell?.staffId}
          selectedDate={selectedCell?.date}
          editingShift={editingShift}
          onSubmit={handleCreateShift}
          onCancel={() => setShowAddShiftModal(false)}
          onRevert={handleRevertShift}
          existingWeeklyHours={
            selectedCell?.staffId
              ? getStaffWeeklyHours(shifts.find(s => s.staffId === selectedCell.staffId)?.shifts || [])
              : 0
          }
        />
      </Modal>

      {/* Week Schedule Modal */}
      <Modal
        open={showWeekScheduleModal}
        onClose={() => setShowWeekScheduleModal(false)}
        title={`Schedule Week for ${selectedStaffForWeek?.staffName || 'Staff'}`}
        size="full"
      >
        {selectedStaffForWeek && (
          <WeekScheduleForm
            staffName={selectedStaffForWeek.staffName}
            defaultRole={selectedStaffForWeek.role}
            weekDays={weekDays}
            existingShifts={selectedStaffForWeek.shifts}
            onSubmit={handleSaveWeekSchedule}
            onCancel={() => setShowWeekScheduleModal(false)}
          />
        )}
      </Modal>

      {/* Default Schedule Modal */}
      <Modal
        open={showDefaultScheduleModal}
        onClose={() => setShowDefaultScheduleModal(false)}
        title={editingDefaultSchedule ? 'Edit Default Schedule' : 'Add Default Schedule'}
        size="xl"
      >
        <DefaultScheduleForm
          staff={staff}
          existingSchedules={defaultSchedules}
          editingSchedule={editingDefaultSchedule}
          onSubmit={handleSaveDefaultSchedule}
          onCancel={() => setShowDefaultScheduleModal(false)}
        />
      </Modal>
    </div>
  );
};

// Shift template presets for quick-select
const SHIFT_PRESETS = [
  { id: 'morning', label: 'Morning', start: '06:00', end: '14:00', role: 'Kennel Tech' },
  { id: 'day', label: 'Day', start: '09:00', end: '17:00', role: 'Kennel Tech' },
  { id: 'evening', label: 'Evening', start: '14:00', end: '22:00', role: 'Kennel Tech' },
  { id: 'weekend', label: 'Weekend', start: '07:00', end: '19:00', role: 'Kennel Tech' },
];

// Add/Edit Shift Form Component
const AddShiftForm = ({ staff, selectedStaffId, selectedDate, editingShift, onSubmit, onCancel, onRevert, existingWeeklyHours = 0 }) => {
  const isEditing = !!editingShift;

  // Check if this is an auto-generated shift from defaults
  const isFromDefault = editingShift?.source === 'default';
  const isOverride = editingShift?.isOverride === true;
  const canRevert = isFromDefault && isOverride;

  // Find staff name for the banner
  const selectedStaffData = staff.find(s => (s.id || s.recordId) === (selectedStaffId || editingShift?.staffId));
  const staffName = selectedStaffData?.name || selectedStaffData?.email || 'this staff member';

  const [formData, setFormData] = useState({
    staffId: selectedStaffId || '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: editingShift?.start || '09:00',
    endTime: editingShift?.end || '17:00',
    role: editingShift?.role || '',
    notes: editingShift?.notes || '',
    shiftId: editingShift?.shiftId || null,
    // Override fields
    source: editingShift?.source || 'manual',
    isOverride: editingShift?.isOverride || false,
    overrideReason: editingShift?.overrideReason || '',
    originalStart: editingShift?.originalStart || editingShift?.start || null,
    originalEnd: editingShift?.originalEnd || editingShift?.end || null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Track if form has been modified from original (for auto-generated shifts)
  const hasChanges = useMemo(() => {
    if (!isFromDefault || isOverride) return false;
    return formData.startTime !== editingShift?.start ||
           formData.endTime !== editingShift?.end ||
           (formData.role && formData.role !== editingShift?.role);
  }, [formData, editingShift, isFromDefault, isOverride]);

  // Calculate shift duration
  const shiftDuration = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return 0;
    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    let hours = (endH + endM / 60) - (startH + startM / 60);
    if (hours < 0) hours += 24; // Handle overnight shifts
    return hours;
  }, [formData.startTime, formData.endTime]);

  // Check for warnings
  const isLongShift = shiftDuration > 10;
  const wouldCauseOvertime = existingWeeklyHours + shiftDuration > 40;

  const handleSubmit = async (e, addAnother = false) => {
    e.preventDefault();
    if (!formData.staffId || !formData.startTime || !formData.endTime) {
      alert('Please fill in all required fields');
      return;
    }

    // If editing an auto-generated shift with changes, require override reason
    if (isFromDefault && (hasChanges || isOverride) && !formData.overrideReason) {
      alert('Please select a reason for the change');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build submit data with override fields if applicable
      const submitData = {
        ...formData,
        // If this is a modification to an auto-generated shift, mark as override
        isOverride: isFromDefault ? true : false,
        source: isFromDefault ? 'default' : 'manual',
      };

      await onSubmit(submitData, addAnother);
      if (addAnother) {
        // Reset form for next entry but keep staff and date
        setFormData(prev => ({
          ...prev,
          startTime: '09:00',
          endTime: '17:00',
          role: '',
          notes: '',
          shiftId: null,
          overrideReason: '',
        }));
        setSelectedPreset(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply preset to form
  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setFormData(prev => ({
      ...prev,
      startTime: preset.start,
      endTime: preset.end,
      role: preset.role,
    }));
  };

  // Role dropdown options (dynamic from tenant config)
  const roleOptions = useStaffRoleOptions();
  const defaultRole = useDefaultRole();
  const defaultRoleName = defaultRole?.name || 'Kennel Tech';

  // Set default role if not editing and no role selected
  useEffect(() => {
    if (!isEditing && !formData.role) {
      setFormData(prev => ({ ...prev, role: defaultRoleName }));
    }
  }, [isEditing, defaultRoleName]);

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
      {/* Auto-generated shift info banner */}
      {isFromDefault && isEditing && (
        <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium">
              This shift is auto-generated from {staffName}'s default schedule.
            </p>
            <p className="text-blue-300/70 mt-1">
              Changes will only apply to this date ({selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'today'}).
            </p>
          </div>
        </div>
      )}

      {/* Quick Templates */}
      {!isEditing && (
        <div>
          <label className="block text-xs font-medium text-muted mb-2">Quick Select</label>
          <div className="flex gap-2 flex-wrap">
            {SHIFT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all
                  ${selectedPreset === preset.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-alt border-border text-text hover:border-primary/50'
                  }`}
              >
                {preset.label} ({formatShiftTime(preset.start)}-{formatShiftTime(preset.end)})
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Staff Member *</label>
        <StyledSelect
          options={staff.map(s => ({
            value: s.id || s.recordId,
            label: s.name || s.email || 'Staff'
          }))}
          value={formData.staffId}
          onChange={(opt) => setFormData({ ...formData, staffId: opt?.value || '' })}
          placeholder="Select staff..."
          isDisabled={isEditing}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text mb-1">Date *</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={isEditing}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-text">Shift Time *</label>
          {shiftDuration > 0 && (
            <span className={`text-xs font-medium ${isLongShift ? 'text-amber-500' : 'text-muted'}`}>
              {shiftDuration.toFixed(1)} hours
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => { setFormData({ ...formData, startTime: e.target.value }); setSelectedPreset(null); }}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => { setFormData({ ...formData, endTime: e.target.value }); setSelectedPreset(null); }}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Warnings */}
      {(isLongShift || wouldCauseOvertime) && (
        <div className="space-y-1">
          {isLongShift && (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Long shift: {shiftDuration.toFixed(1)} hours exceeds 10 hour guideline</span>
            </div>
          )}
          {wouldCauseOvertime && (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Overtime: This would bring weekly total to {(existingWeeklyHours + shiftDuration).toFixed(1)}h (over 40h)</span>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Role</label>
        <StyledSelect
          options={roleOptions}
          value={formData.role}
          onChange={(opt) => { setFormData({ ...formData, role: opt?.value || '' }); setSelectedPreset(null); }}
          placeholder="Select role..."
          isClearable
        />
      </div>

      {/* Override Reason - Required when modifying auto-generated shifts */}
      {isFromDefault && isEditing && (
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Reason for Change {(hasChanges || isOverride) && <span className="text-red-400">*</span>}
          </label>
          <select
            value={formData.overrideReason}
            onChange={(e) => setFormData({ ...formData, overrideReason: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select reason...</option>
            {OVERRIDE_REASONS.map(reason => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Optional notes..."
          rows={2}
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* Footer with Cancel, Revert, and Save buttons */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {/* Revert to Default button - only show for overridden shifts */}
        {canRevert && onRevert && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (confirm('Revert this shift to the default schedule? Your changes will be lost.')) {
                onRevert(editingShift);
              }
            }}
            className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Revert to Default
          </Button>
        )}
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
          >
            Save & Add Another
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isEditing ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {isFromDefault && isEditing ? 'Save Override' : (isEditing ? 'Update Shift' : 'Add Shift')}
        </Button>
      </div>
    </form>
  );
};

// Week schedule templates
const WEEK_TEMPLATES = [
  { id: 'standard', label: 'Standard (M-F 9-5)', days: [false, true, true, true, true, true, false], start: '09:00', end: '17:00' },
  { id: 'full', label: 'Full Week', days: [true, true, true, true, true, true, true], start: '09:00', end: '17:00' },
  { id: 'weekends', label: 'Weekends Only', days: [true, false, false, false, false, false, true], start: '08:00', end: '18:00' },
  { id: 'early', label: 'Early Shift (M-F)', days: [false, true, true, true, true, true, false], start: '06:00', end: '14:00' },
  { id: 'late', label: 'Late Shift (M-F)', days: [false, true, true, true, true, true, false], start: '14:00', end: '22:00' },
];

// Week Schedule Form Component
const WeekScheduleForm = ({ staffName, defaultRole, weekDays: initialWeekDays, existingShifts, onSubmit, onCancel, onWeekChange }) => {
  // Role dropdown options (dynamic from tenant config) - must be before useState that uses it
  const roleOptions = useStaffRoleOptions();
  const tenantDefaultRole = useDefaultRole();
  const defaultRoleFallback = defaultRole || tenantDefaultRole?.name || 'Kennel Tech';

  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekDays[0]);
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Initialize schedule from existing shifts
  const [schedule, setSchedule] = useState(() =>
    weekDays.map((day, i) => {
      const existing = existingShifts?.[i];
      const hasShift = existing?.start && existing?.end;
      return {
        date: day,
        isOff: !hasShift,
        startTime: existing?.start || '09:00',
        endTime: existing?.end || '17:00',
        role: existing?.role || defaultRoleFallback,
        existingShiftId: existing?.shiftId || null,
      };
    })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update schedule when week changes
  const handleWeekChange = (direction) => {
    const newWeekStart = addDays(currentWeekStart, direction * 7);
    setCurrentWeekStart(newWeekStart);
    // Reset schedule for new week (no existing data)
    const newWeekDays = Array.from({ length: 7 }, (_, i) => addDays(newWeekStart, i));
    setSchedule(newWeekDays.map((day) => ({
      date: day,
      isOff: true,
      startTime: '09:00',
      endTime: '17:00',
      role: defaultRoleFallback,
      existingShiftId: null,
    })));
    // Notify parent if callback provided
    if (onWeekChange) onWeekChange(newWeekStart);
  };

  const goToToday = () => {
    const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    setCurrentWeekStart(todayWeekStart);
    const newWeekDays = Array.from({ length: 7 }, (_, i) => addDays(todayWeekStart, i));
    setSchedule(newWeekDays.map((day) => ({
      date: day,
      isOff: true,
      startTime: '09:00',
      endTime: '17:00',
      role: defaultRole || 'Kennel Tech',
      existingShiftId: null,
    })));
    if (onWeekChange) onWeekChange(todayWeekStart);
  };

  // Calculate total hours
  const totalHours = useMemo(() => {
    return schedule.reduce((total, day) => {
      if (day.isOff) return total;
      const [startH, startM] = day.startTime.split(':').map(Number);
      const [endH, endM] = day.endTime.split(':').map(Number);
      let hours = (endH + endM / 60) - (startH + startM / 60);
      if (hours < 0) hours += 24;
      return total + hours;
    }, 0);
  }, [schedule]);

  const hasOvertime = totalHours > 40;

  // Update a single day
  const updateDay = (index, updates) => {
    setSchedule(prev => prev.map((day, i) =>
      i === index ? { ...day, ...updates } : day
    ));
  };

  // Apply template
  const applyTemplate = (template) => {
    setSchedule(prev => prev.map((day, i) => ({
      ...day,
      isOff: !template.days[i],
      startTime: template.start,
      endTime: template.end,
    })));
  };

  // Apply to all - copies first configured day's settings to ALL days
  const applyToAll = () => {
    const firstActive = schedule.find(d => !d.isOff);
    if (!firstActive) return;
    setSchedule(prev => prev.map(day => ({
      ...day,
      isOff: false,
      startTime: firstActive.startTime,
      endTime: firstActive.endTime,
      role: firstActive.role,
    })));
  };

  // Clear all
  const clearAll = () => {
    setSchedule(prev => prev.map(day => ({
      ...day,
      isOff: true,
      startTime: '09:00',
      endTime: '17:00',
    })));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(schedule);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={() => handleWeekChange(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium text-text min-w-[280px] text-center">
          {format(weekDays[0], 'MMMM d')} - {format(weekDays[6], 'MMMM d, yyyy')}
        </span>
        <Button variant="outline" size="sm" onClick={() => handleWeekChange(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Quick Fill Options */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-alt/50 rounded-xl border border-border/50">
        <span className="text-sm font-medium text-muted">Templates:</span>
        <select
          onChange={(e) => {
            const template = WEEK_TEMPLATES.find(t => t.id === e.target.value);
            if (template) applyTemplate(template);
          }}
          className="h-9 px-3 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          defaultValue=""
        >
          <option value="" disabled>Select template...</option>
          {WEEK_TEMPLATES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={applyToAll}>
          Apply to All
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll}>
          Clear All
        </Button>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-7 gap-4">
        {schedule.map((day, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl border-2 transition-all ${
              day.isOff
                ? 'bg-surface-alt/30 border-border/50'
                : 'bg-surface border-primary/30'
            }`}
          >
            {/* Day Header */}
            <div className="text-center mb-4">
              <div className="text-sm font-medium text-muted">{format(day.date, 'EEEE')}</div>
              <div className="text-2xl font-bold text-text">{format(day.date, 'd')}</div>
            </div>

            {/* Off Checkbox */}
            <label className="flex items-center gap-2 mb-4 cursor-pointer p-2 rounded-lg hover:bg-surface-alt/50 transition-colors">
              <input
                type="checkbox"
                checked={day.isOff}
                onChange={(e) => updateDay(i, { isOff: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
              />
              <span className="text-sm text-muted font-medium">Day Off</span>
            </label>

            {/* Time & Role Inputs */}
            <div className={`space-y-3 ${day.isOff ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Start Time</label>
                <input
                  type="time"
                  value={day.startTime}
                  onChange={(e) => updateDay(i, { startTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={day.isOff}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">End Time</label>
                <input
                  type="time"
                  value={day.endTime}
                  onChange={(e) => updateDay(i, { endTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={day.isOff}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Role</label>
                <select
                  value={day.role}
                  onChange={(e) => updateDay(i, { role: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={day.isOff}
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <span className={`text-lg font-semibold ${hasOvertime ? 'text-amber-500' : 'text-text'}`}>
            Total: {totalHours.toFixed(1)} hours
          </span>
          {hasOvertime && (
            <span className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Overtime: {(totalHours - 40).toFixed(1)}h over 40
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
            Save Week
          </Button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT SCHEDULE FORM (for recurring weekly schedules)
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SCHEDULE_TEMPLATES = [
  { id: 'mf-9-5', label: 'M-F 9-5', days: [false, true, true, true, true, true, false], start: '09:00', end: '17:00' },
  { id: 'mf-8-4', label: 'M-F 8-4', days: [false, true, true, true, true, true, false], start: '08:00', end: '16:00' },
  { id: 'tue-sat', label: 'Tue-Sat', days: [false, false, true, true, true, true, true], start: '09:00', end: '17:00' },
  { id: 'weekends', label: 'Weekends Only', days: [true, false, false, false, false, false, true], start: '08:00', end: '18:00' },
];

const DefaultScheduleForm = ({ staff, existingSchedules, editingSchedule, onSubmit, onCancel }) => {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Filter out staff who already have default schedules (unless editing that schedule)
  const availableStaff = staff.filter(s => {
    if (editingSchedule && editingSchedule.staffId === (s.id || s.email)) return true;
    return !existingSchedules.some(ds => ds.staffId === (s.id || s.email));
  });

  // Role dropdown options (dynamic from tenant config)
  const roleOptions = useStaffRoleOptions();
  const defaultRole = useDefaultRole();
  const defaultRoleName = defaultRole?.name || 'Kennel Tech';

  // Initialize form state
  const getInitialDays = () => {
    if (editingSchedule) {
      return DAY_KEYS.map((key, idx) => {
        const dayData = editingSchedule.schedule?.[key];
        return {
          name: DAY_NAMES[idx],
          key,
          isWorking: !!dayData,
          startTime: dayData?.start || '09:00',
          endTime: dayData?.end || '17:00',
          role: dayData?.role || defaultRoleName,
        };
      });
    }
    return DAY_KEYS.map((key, idx) => ({
      name: DAY_NAMES[idx],
      key,
      isWorking: idx >= 1 && idx <= 5, // Default M-F
      startTime: '09:00',
      endTime: '17:00',
      role: defaultRoleName,
    }));
  };

  const [selectedStaffId, setSelectedStaffId] = useState(
    editingSchedule?.staffId || (availableStaff[0]?.id || availableStaff[0]?.email || '')
  );
  const [days, setDays] = useState(getInitialDays);
  const [effectiveDate, setEffectiveDate] = useState(
    editingSchedule?.effectiveFrom || format(new Date(), 'yyyy-MM-dd')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateDay = (index, updates) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const applyTemplate = (template) => {
    setDays(prev => prev.map((d, i) => ({
      ...d,
      isWorking: template.days[i],
      startTime: template.start,
      endTime: template.end,
    })));
  };

  // Calculate total weekly hours
  const totalHours = useMemo(() => {
    return days.reduce((sum, d) => {
      if (!d.isWorking) return sum;
      const [startH, startM] = d.startTime.split(':').map(Number);
      const [endH, endM] = d.endTime.split(':').map(Number);
      let hours = (endH + endM / 60) - (startH + startM / 60);
      if (hours < 0) hours += 24;
      return sum + hours;
    }, 0);
  }, [days]);

  const hasOvertime = totalHours > 40;

  const handleSubmit = async () => {
    if (!selectedStaffId) {
      alert('Please select a staff member');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build schedule object
      const schedule = {};
      days.forEach(d => {
        if (d.isWorking) {
          schedule[d.key] = {
            start: d.startTime,
            end: d.endTime,
            role: d.role,
          };
        }
      });

      const selectedStaffData = staff.find(s => (s.id || s.email) === selectedStaffId);

      await onSubmit({
        staffId: selectedStaffId,
        staffName: selectedStaffData?.name || selectedStaffData?.email || 'Unknown',
        role: days.find(d => d.isWorking)?.role || defaultRoleName,
        schedule,
        effectiveFrom: effectiveDate,
      });
    } catch (error) {
      console.error('Failed to save default schedule:', error);
      alert('Failed to save default schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Selection */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Select Staff Member</label>
        {availableStaff.length === 0 ? (
          <p className="text-sm text-muted italic">All staff members already have default schedules</p>
        ) : (
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={!!editingSchedule}
          >
            <option value="">Select a staff member...</option>
            {availableStaff.map(s => (
              <option key={s.id || s.email} value={s.id || s.email}>
                {s.name || s.email} {s.role ? `(${s.role})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Quick Templates */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Quick Templates</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SCHEDULE_TEMPLATES.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg hover:bg-surface-alt hover:border-primary/50 transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Grid */}
      <div>
        <label className="block text-sm font-medium text-text mb-3">Weekly Schedule</label>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Day</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider w-24">Working</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">Start</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">End</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((day, i) => (
                <tr key={day.key} className={`${day.isWorking ? 'bg-surface' : 'bg-surface-alt/50'}`}>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${day.isWorking ? 'text-text' : 'text-muted'}`}>
                      {day.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={day.isWorking}
                      onChange={(e) => updateDay(i, { isWorking: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDay(i, { startTime: e.target.value })}
                      disabled={!day.isWorking}
                      className={`px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${!day.isWorking ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDay(i, { endTime: e.target.value })}
                      disabled={!day.isWorking}
                      className={`px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${!day.isWorking ? 'opacity-40' : ''}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={day.role}
                      onChange={(e) => updateDay(i, { role: e.target.value })}
                      disabled={!day.isWorking}
                      className={`px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${!day.isWorking ? 'opacity-40' : ''}`}
                    >
                      {roleOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Hours Display */}
      <div className="flex items-center gap-4">
        <span className={`text-sm font-semibold ${hasOvertime ? 'text-amber-500' : 'text-text'}`}>
          Weekly Total: {totalHours.toFixed(1)} hours
        </span>
        {hasOvertime && (
          <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
            <AlertCircle className="h-3.5 w-3.5" />
            {(totalHours - 40).toFixed(1)}h overtime
          </span>
        )}
      </div>

      {/* Effective Date */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">Effective From</label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <p className="mt-1 text-xs text-muted">When should this default schedule start being applied?</p>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !selectedStaffId}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              {editingSchedule ? 'Update Default Schedule' : 'Save Default Schedule'}
            </>
          )}
        </Button>
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
              <div className="min-w-[160px]">
                <StyledSelect
                  options={[
                    { value: 'all', label: 'All Staff' },
                    ...staff.map((s, i) => ({ value: s.name || s.email, label: s.name || s.email }))
                  ]}
                  value={selectedStaff}
                  onChange={(opt) => setSelectedStaff(opt?.value || 'all')}
                  isClearable={false}
                  isSearchable={true}
                />
              </div>
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
            <div className="min-w-[120px]">
              <StyledSelect
                options={[
                  { value: 'this-week', label: 'This Week' },
                  { value: 'last-week', label: 'Last Week' },
                ]}
                value="this-week"
                onChange={() => {}}
                isClearable={false}
                isSearchable={false}
              />
            </div>
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
    department: '',
    permissions: [],
    availability: {},
    wage: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        permissions: [],
        availability: {},
        wage: '',
      });
    }
  }, [isOpen]);

  // Fetch roles and departments from API
  const { data: staffRoles, isLoading: rolesLoading } = useStaffRoles();
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
  const addStaffRole = useAddStaffRole();
  const addDepartment = useAddDepartment();

  // Convert to options format for CreatableSelect (simple array like kennel types)
  const roleOptions = (staffRoles || []).map(r => ({ value: r, label: r }));
  const departmentOptions = (departmentsData || []).map(d => ({ value: d, label: d }));

  // Handle creating new role
  const handleCreateRole = useCallback(async (newRoleName) => {
    const result = await addStaffRole.mutateAsync(newRoleName);
    return result; // Returns { value, label } for immediate selection
  }, [addStaffRole]);

  // Handle creating new department
  const handleCreateDepartment = useCallback(async (newDeptName) => {
    const result = await addDepartment.mutateAsync(newDeptName);
    return result;
  }, [addDepartment]);

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
            <CreatableSelect
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              onCreate={handleCreateRole}
              options={roleOptions}
              placeholder="Select or add role..."
              isLoading={rolesLoading}
              menuPortalTarget={document.body}
              required
            />
            <CreatableSelect
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              onCreate={handleCreateDepartment}
              options={departmentOptions}
              placeholder="Select or add department..."
              isLoading={departmentsLoading}
              menuPortalTarget={document.body}
            />
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
              <StyledSelect
                options={[
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'salary', label: 'Salary' },
                ]}
                value="hourly"
                onChange={() => {}}
                isClearable={false}
                isSearchable={false}
              />
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Real-time stats from APIs
  const [realStats, setRealStats] = useState({
    loggedIn: 0,
    clockedIn: 0,
    scheduled: 0,
    avgTasksPerStaff: 0,
    newThisMonth: 0,
  });

  // Handle ?tab=timeclock from topbar link
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'timeclock') {
      setActiveTab('timeclock');
    }
  }, [searchParams]);

  // Fetch staff data
  const { data: staffData, isLoading } = useStaffQuery();

  // Fetch real stats from APIs
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');

        // Fetch in parallel
        const [timeClockApi, shiftsApi, tasksApi] = await Promise.all([
          import('../api-timeclock'),
          import('@/features/schedule/api/shifts'),
          import('@/features/tasks/api').then(m => ({ useTasksQuery: m.useTasksQuery })).catch(() => null),
        ]);

        // Get active time entries (clocked in)
        let clockedIn = 0;
        try {
          const timeResponse = await timeClockApi.getTimeEntries({ status: 'active' });
          const entries = timeResponse?.data || [];
          clockedIn = entries.filter(e => e.clockInTime && !e.clockOutTime).length;
        } catch (e) {
          console.warn('[stats] Failed to fetch time entries:', e?.message);
        }

        // Get today's shifts (on schedule)
        let scheduled = 0;
        try {
          const shiftsResponse = await shiftsApi.getShifts({ startDate: today, endDate: today });
          const shifts = shiftsResponse?.data || [];
          // Count unique staff members scheduled today
          const scheduledStaffIds = new Set(shifts.map(s => s.staffId || s.staff_id));
          scheduled = scheduledStaffIds.size;
        } catch (e) {
          console.warn('[stats] Failed to fetch shifts:', e?.message);
        }

        // Calculate avg tasks per staff (from tasks due today)
        let avgTasksPerStaff = 0;
        try {
          const tasksResponse = await apiClient.get('/api/v1/tasks', { params: { startDate: today, endDate: today } });
          const tasks = tasksResponse?.data?.tasks || tasksResponse?.data || [];
          const taskArray = Array.isArray(tasks) ? tasks : [];
          if (staffData?.length > 0 && taskArray.length > 0) {
            avgTasksPerStaff = Math.round((taskArray.length / staffData.length) * 10) / 10;
          }
        } catch (e) {
          console.warn('[stats] Failed to fetch tasks:', e?.message);
        }

        // Calculate new staff this month
        let newThisMonth = 0;
        if (staffData?.length > 0) {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          newThisMonth = staffData.filter(s => {
            const createdAt = s.createdAt || s.created_at;
            return createdAt && new Date(createdAt) >= monthStart;
          }).length;
        }

        // Get logged in users (active sessions in last 30 min)
        let loggedIn = 0;
        try {
          const sessionResponse = await apiClient.get('/api/v1/auth/sessions/active-count');
          loggedIn = sessionResponse?.data?.activeCount || 0;
        } catch (e) {
          console.warn('[stats] Failed to fetch active sessions:', e?.message);
        }

        setRealStats({ loggedIn, clockedIn, scheduled, avgTasksPerStaff, newThisMonth });
      } catch (error) {
        console.warn('[stats] Failed to fetch real stats:', error?.message);
      }
    };

    if (staffData?.length > 0) {
      fetchRealStats();
    }
  }, [staffData]);

  // Process staff data
  const { staff, stats, hasStaff } = useMemo(() => {
    if (!staffData || isLoading) {
      return {
        staff: [],
        stats: { totalStaff: 0, loggedIn: 0, roles: 0, avgTasksPerStaff: 0, clockedIn: 0, scheduled: 0, onPto: 0, newThisMonth: 0 },
        hasStaff: false,
      };
    }

    const staffArray = staffData || [];
    const roles = [...new Set(staffArray.map(s => s.role || s.title).filter(Boolean))].length;

    return {
      staff: staffArray,
      stats: {
        totalStaff: staffArray.length,
        loggedIn: realStats.loggedIn,
        roles: roles || 0,
        avgTasksPerStaff: realStats.avgTasksPerStaff,
        clockedIn: realStats.clockedIn,
        scheduled: realStats.scheduled,
        onPto: 0, // TODO: implement when PTO tracking exists
        newThisMonth: realStats.newThisMonth,
      },
      hasStaff: staffArray.length > 0,
    };
  }, [staffData, isLoading, realStats]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Users },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'tasks', label: 'Tasks', icon: Target },
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
              <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
                <li><span>Administration</span></li>
                <li><ChevronRight className="h-3 w-3" /></li>
                <li className="text-[color:var(--bb-color-text-primary)] font-medium">Team</li>
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
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Administration</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Team</li>
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
