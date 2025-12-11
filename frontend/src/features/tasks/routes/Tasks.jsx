import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
// Replaced with LoadingState (mascot) for page-level loading
import LoadingState from '@/components/ui/LoadingState';
import {
  CheckCircle,
  Circle,
  Plus,
  AlertTriangle,
  Calendar,
  X,
  Clock,
  User,
  PawPrint,
  MoreHorizontal,
  Edit,
  MessageSquare,
  UserPlus,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  Filter,
  Utensils,
  Pill,
  Scissors,
  Activity,
  Stethoscope,
  ClipboardList,
  Loader2,
  CheckCircle2,
  PartyPopper,
  TrendingUp,
  BarChart3,
  Users,
  Zap,
} from 'lucide-react';
import { format, isToday, isTomorrow, isAfter, isBefore, addDays, startOfDay, endOfDay } from 'date-fns';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, useCreateTaskMutation, useTasksQuery } from '../api';
import { usePetsQuery } from '@/features/pets/api';
import { useStaffQuery } from '@/features/staff/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Stat Card Component - Matching Schedule/Run Assignment style
const StatCard = ({ icon: Icon, label, value, variant = 'primary', tooltip }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className={cn('relative flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}
      title={tooltip}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">{value}</p>
      </div>
    </div>
  );
};

// Task type configurations
const TASK_TYPES = {
  FEEDING: { label: 'Feeding', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  MEDICATION: { label: 'Medication', icon: Pill, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  GROOMING: { label: 'Grooming', icon: Scissors, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  EXERCISE: { label: 'Exercise', icon: Activity, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  CHECKUP: { label: 'Checkup', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
};

// Priority configurations
const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', variant: 'danger' },
  HIGH: { label: 'High', variant: 'warning' },
  NORMAL: { label: 'Normal', variant: 'info' },
  LOW: { label: 'Low', variant: 'neutral' },
};

// Sort options
const SORT_OPTIONS = [
  { value: 'dueTime', label: 'Due Time' },
  { value: 'priority', label: 'Priority' },
  { value: 'category', label: 'Category' },
  { value: 'assignedStaff', label: 'Assigned Staff' },
];

// Time bucket component
const TimeBucket = ({ title, count, isExpanded, onToggle, children, variant = 'default' }) => {
  const variantStyles = {
    overdue: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10',
    dueNow: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10',
    default: 'border-border bg-transparent',
  };

  return (
    <div className={cn('rounded-lg border', variantStyles[variant])}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted" />
          )}
          <span className="font-medium text-text">{title}</span>
          <Badge variant={variant === 'overdue' ? 'danger' : variant === 'dueNow' ? 'warning' : 'neutral'} size="sm">
            {count}
          </Badge>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Task Card component
const TaskCard = ({ 
  task, 
  onComplete, 
  isCompleting,
  pets,
  staff,
}) => {
  const [showActions, setShowActions] = useState(false);
  const typeConfig = TASK_TYPES[task.type] || { label: task.type, icon: ClipboardList, color: 'text-gray-500', bg: 'bg-gray-100' };
  const TypeIcon = typeConfig.icon;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.NORMAL;
  
  const isCompleted = !!task.completedAt;
  const isOverdue = task.isOverdue;
  const isDueSoon = !isOverdue && !isCompleted && task.scheduledFor && 
    new Date(task.scheduledFor).getTime() - Date.now() < 60 * 60 * 1000; // Within 1 hour

  // Get related pet info
  const relatedPet = useMemo(() => {
    if (task.relatedType === 'PET' && task.relatedId && pets?.pets) {
      return pets.pets.find(p => (p.id || p.recordId) === task.relatedId);
    }
    return null;
  }, [task.relatedType, task.relatedId, pets]);

  // Get assigned staff info
  const assignedStaff = useMemo(() => {
    if (task.assignedTo && staff) {
      const staffList = Array.isArray(staff) ? staff : (staff?.data || []);
      return staffList.find(s => (s.id || s.recordId) === task.assignedTo);
    }
    return null;
  }, [task.assignedTo, staff]);

  const getStatusBadge = () => {
    if (isCompleted) return <Badge variant="success" size="sm">Completed</Badge>;
    if (isOverdue) return <Badge variant="danger" size="sm">Overdue</Badge>;
    if (isDueSoon) return <Badge variant="warning" size="sm">Due Soon</Badge>;
    return null;
  };

  return (
    <div
      className={cn(
        'group bg-white dark:bg-surface-primary border rounded-lg p-4 transition-all duration-200',
        isCompleted ? 'opacity-60 border-border' : 'border-border hover:border-primary/30 hover:shadow-sm',
        isOverdue && !isCompleted && 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => !isCompleted && onComplete(task.id)}
          disabled={isCompleted || isCompleting}
          className={cn(
            'mt-0.5 transition-colors',
            isCompleted ? 'text-green-500' : 'text-muted hover:text-primary'
          )}
        >
          {isCompleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Task Icon */}
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', typeConfig.bg)}>
          <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Row: Title + Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-text',
              isCompleted && 'line-through text-muted'
            )}>
              {typeConfig.label}
            </h3>
            <Badge variant={priorityConfig.variant} size="sm">{priorityConfig.label}</Badge>
            {getStatusBadge()}
          </div>

          {/* Notes */}
          {task.notes && (
            <p className={cn(
              'text-sm mb-2',
              isCompleted ? 'text-muted line-through' : 'text-text'
            )}>
              {task.notes}
            </p>
          )}

          {/* Middle Row: Due time, Assigned, Pet, Service type */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            {/* Due Time */}
            <div className="flex items-center gap-1.5">
              <Clock className={cn('h-3.5 w-3.5', isOverdue && !isCompleted ? 'text-red-500' : '')} />
              <span className={cn(isOverdue && !isCompleted ? 'text-red-600 dark:text-red-400 font-medium' : '')}>
                {task.scheduledFor ? format(new Date(task.scheduledFor), 'MMM d, h:mm a') : 'No due time'}
              </span>
            </div>

            {/* Assigned Staff */}
            {assignedStaff && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{assignedStaff.firstName} {assignedStaff.lastName}</span>
              </div>
            )}

            {/* Related Pet */}
            {relatedPet && (
              <Link
                to={`/pets/${relatedPet.id || relatedPet.recordId}`}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <PawPrint className="h-3 w-3 text-primary" />
                </div>
                <span className="hover:underline">{relatedPet.name}</span>
              </Link>
            )}

            {/* Completed Time */}
            {isCompleted && task.completedAt && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Done {format(new Date(task.completedAt), 'h:mm a')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title="Edit task"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title="Add comment"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title="Reassign"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Today's Summary Sidebar Card - Compact horizontal layout
const TodaysSummary = ({ categoryCounts, taskTypes }) => {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Today's Summary</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(taskTypes).map(([key, config]) => {
          const count = categoryCounts[key] || 0;
          const Icon = config.icon;

          return (
            <div
              key={key}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg', config.bg)}
              title={config.label}
            >
              <Icon className={cn('h-3.5 w-3.5', config.color)} />
              <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)]">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Staff Workload Sidebar Card - Shows actual staff names
const StaffWorkload = ({ staff, tasks, onStaffClick, activeStaffFilter }) => {
  const staffList = Array.isArray(staff) ? staff : (staff?.data || []);

  const staffTaskCounts = useMemo(() => {
    const counts = {};
    staffList.forEach(s => {
      const id = s.id || s.recordId;
      counts[id] = tasks.filter(t => t.assignedTo === id && !t.completedAt).length;
    });
    // Count unassigned tasks
    counts['unassigned'] = tasks.filter(t => !t.assignedTo && !t.completedAt).length;
    return counts;
  }, [staffList, tasks]);

  const maxTasks = Math.max(...Object.values(staffTaskCounts), 1);

  // Format name as "Sarah M." or just first name if no last name
  const formatName = (s) => {
    if (!s) return 'Unassigned';
    const first = s.firstName || '';
    const lastInitial = s.lastName ? ` ${s.lastName.charAt(0)}.` : '';
    return `${first}${lastInitial}`;
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Staff Workload</h3>
      </div>

      <div className="space-y-2">
        {staffList.slice(0, 5).map(s => {
          const id = s.id || s.recordId;
          const count = staffTaskCounts[id] || 0;
          const percentage = maxTasks > 0 ? (count / maxTasks) * 100 : 0;
          const isActive = activeStaffFilter === id;
          const isOverloaded = count >= 5;

          return (
            <button
              key={id}
              onClick={() => onStaffClick(isActive ? 'all' : id)}
              className={cn(
                'w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors text-left',
                isActive
                  ? 'bg-[color:var(--bb-color-accent-soft)] ring-1 ring-[color:var(--bb-color-accent)]'
                  : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
              )}
            >
              <span className="text-xs font-medium text-[color:var(--bb-color-text-primary)] min-w-[80px]">
                {formatName(s)}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                <div
                  className={cn('h-full rounded-full transition-all', isOverloaded ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={cn(
                'text-xs font-bold min-w-[20px] text-right',
                isOverloaded ? 'text-amber-600' : 'text-[color:var(--bb-color-text-muted)]'
              )}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Unassigned row */}
        {staffTaskCounts['unassigned'] > 0 && (
          <div className="flex items-center gap-3 px-2 py-1.5 text-[color:var(--bb-color-text-muted)]">
            <span className="text-xs min-w-[80px] italic">Unassigned</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
              <div
                className="h-full rounded-full bg-gray-400"
                style={{ width: `${(staffTaskCounts['unassigned'] / maxTasks) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold min-w-[20px] text-right">{staffTaskCounts['unassigned']}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Add Task Sidebar Card
const QuickAddTask = ({ taskTypes, priorityConfig, pets, staff, onCreateTask, isCreating }) => {
  const [form, setForm] = useState({
    type: 'FEEDING',
    priority: 'NORMAL',
    petId: '',
    assignedTo: '',
    scheduledFor: '',
  });

  const staffList = Array.isArray(staff) ? staff : (staff?.data || []);
  const petList = pets?.pets || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateTask({
      title: `${form.type} Task`,
      type: form.type,
      priority: form.priority,
      scheduledFor: form.scheduledFor || null,
      dueAt: form.scheduledFor || null,
      assignedTo: form.assignedTo || null,
      petId: form.petId || null,
    });
    setForm({
      type: 'FEEDING',
      priority: 'NORMAL',
      petId: '',
      assignedTo: '',
      scheduledFor: '',
    });
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Quick Add</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Task Type - inline */}
        <div className="flex gap-1.5">
          {Object.entries(taskTypes).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setForm({ ...form, type: key })}
                className={cn(
                  'flex-1 flex items-center justify-center p-2 rounded-lg transition-all',
                  form.type === key
                    ? 'bg-[color:var(--bb-color-accent-soft)] ring-1 ring-[color:var(--bb-color-accent)]'
                    : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
                title={config.label}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </button>
            );
          })}
        </div>

        {/* Pet + Staff in 2 columns */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.petId}
            onChange={(e) => setForm({ ...form, petId: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <option value="">Pet...</option>
            {petList.map(p => (
              <option key={p.id || p.recordId} value={p.id || p.recordId}>{p.name}</option>
            ))}
          </select>

          <select
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            className="w-full px-2 py-1.5 text-xs rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <option value="">Staff...</option>
            {staffList.map(s => (
              <option key={s.id || s.recordId} value={s.id || s.recordId}>
                {s.firstName} {s.lastName?.charAt(0)}.
              </option>
            ))}
          </select>
        </div>

        {/* Time + Button in row */}
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={form.scheduledFor}
            onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          />
          <Button type="submit" size="sm" disabled={isCreating || !form.petId} className="px-3">
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Tasks = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortBy, setSortBy] = useState('dueTime');
  const [showFilters, setShowFilters] = useState(false);
  const [staffFilter, setStaffFilter] = useState('all');
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);
  const [showDueToday, setShowDueToday] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBuckets, setExpandedBuckets] = useState({
    overdue: true,
    dueNow: true,
    dueLater: true,
    upcoming: false,
  });
  const [completingTaskId, setCompletingTaskId] = useState(null);

  const [taskForm, setTaskForm] = useState({
    type: 'FEEDING',
    relatedType: 'PET',
    relatedId: '',
    assignedTo: '',
    scheduledFor: '',
    notes: '',
    priority: 'NORMAL'
  });

  // Data fetching
  const { data: allTasks, isLoading: tasksLoading } = useTasksQuery();
  const { data: todaysTasks, isLoading: todaysLoading } = useTodaysTasksQuery();
  const { data: overdueTasks, isLoading: overdueLoading } = useOverdueTasksQuery();
  const { data: pets, isLoading: petsLoading } = usePetsQuery();
  const { data: staff, isLoading: staffLoading } = useStaffQuery();
  const completeMutation = useCompleteTaskMutation();
  const createMutation = useCreateTaskMutation();

  const isLoading = tasksLoading || todaysLoading || overdueLoading;

  // Combine tasks with overdue flag - use allTasks as base, mark overdue ones
  const combinedTasks = useMemo(() => {
    const now = new Date();
    // Use allTasks if available, otherwise fall back to combining overdue + today
    if (allTasks && allTasks.length > 0) {
      return allTasks.map(t => ({
        ...t,
        isOverdue: t.scheduledFor && !t.completedAt && new Date(t.scheduledFor) < now
      }));
    }
    // Fallback to old behavior
    const overdueIds = new Set((overdueTasks || []).map(t => t.id));
    const tasks = [
      ...(overdueTasks || []).map(t => ({ ...t, isOverdue: true })),
      ...(todaysTasks || []).filter(t => !overdueIds.has(t.id))
    ];
    return tasks;
  }, [allTasks, todaysTasks, overdueTasks]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: combinedTasks.length };
    Object.keys(TASK_TYPES).forEach(type => {
      counts[type] = combinedTasks.filter(t => t.type === type).length;
    });
    return counts;
  }, [combinedTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let tasks = combinedTasks;

    // Category filter
    if (filterType !== 'all') {
      tasks = tasks.filter(t => t.type === filterType);
    }

    // Staff filter
    if (staffFilter !== 'all') {
      tasks = tasks.filter(t => t.assignedTo === staffFilter);
    }

    // Show assigned to me (would need current user context)
    // if (showAssignedToMe) { ... }

    // Due today filter
    if (showDueToday) {
      tasks = tasks.filter(t => t.scheduledFor && isToday(new Date(t.scheduledFor)));
    }

    // Overdue only filter
    if (showOverdueOnly) {
      tasks = tasks.filter(t => t.isOverdue);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tasks = tasks.filter(t => 
        t.notes?.toLowerCase().includes(term) ||
        t.type?.toLowerCase().includes(term)
      );
    }

    return tasks;
  }, [combinedTasks, filterType, staffFilter, showDueToday, showOverdueOnly, searchTerm]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

    switch (sortBy) {
      case 'priority':
        sorted.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
        break;
      case 'category':
        sorted.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        break;
      case 'assignedStaff':
        sorted.sort((a, b) => (a.assignedTo || '').localeCompare(b.assignedTo || ''));
        break;
      case 'dueTime':
      default:
        sorted.sort((a, b) => {
          if (!a.scheduledFor) return 1;
          if (!b.scheduledFor) return -1;
          return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        });
    }

    return sorted;
  }, [filteredTasks, sortBy]);

  // Group tasks by time buckets
  const taskBuckets = useMemo(() => {
    const now = new Date();
    const todayEnd = endOfDay(now);
    const tomorrowEnd = endOfDay(addDays(now, 1));
    const weekEnd = endOfDay(addDays(now, 7));

    const buckets = {
      overdue: [],
      dueNow: [], // Within next hour
      dueLater: [], // Later today
      upcoming: [], // Tomorrow and next 7 days
      completed: [],
    };

    sortedTasks.forEach(task => {
      if (task.completedAt) {
        buckets.completed.push(task);
      } else if (task.isOverdue) {
        buckets.overdue.push(task);
      } else if (task.scheduledFor) {
        const dueTime = new Date(task.scheduledFor);
        const timeDiff = dueTime.getTime() - now.getTime();
        
        if (timeDiff < 60 * 60 * 1000) { // Within 1 hour
          buckets.dueNow.push(task);
        } else if (isBefore(dueTime, todayEnd)) {
          buckets.dueLater.push(task);
        } else {
          buckets.upcoming.push(task);
        }
      } else {
        buckets.dueLater.push(task);
      }
    });

    return buckets;
  }, [sortedTasks]);

  // Toggle bucket expansion
  const toggleBucket = useCallback((bucket) => {
    setExpandedBuckets(prev => ({ ...prev, [bucket]: !prev[bucket] }));
  }, []);

  // Handle task completion
  const handleCompleteTask = async (taskId) => {
    setCompletingTaskId(taskId);
    try {
      await completeMutation.mutateAsync({ taskId });
      toast.success('Task completed');
    } catch (error) {
      toast.error('Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Handle create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      // Map form fields to backend expected format
      const payload = {
        title: `${taskForm.type} Task`, // Backend requires title
        type: taskForm.type,
        priority: taskForm.priority,
        scheduledFor: taskForm.scheduledFor || null,
        dueAt: taskForm.scheduledFor || null, // Backend also uses dueAt
        assignedTo: taskForm.assignedTo || null,
        description: taskForm.notes || null,
        // Map relatedId to petId or bookingId based on relatedType
        petId: taskForm.relatedType === 'PET' ? taskForm.relatedId : null,
        bookingId: taskForm.relatedType === 'BOOKING' ? taskForm.relatedId : null,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setTaskForm({
        type: 'FEEDING',
        relatedType: 'PET',
        relatedId: '',
        assignedTo: '',
        scheduledFor: '',
        notes: '',
        priority: 'NORMAL'
      });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const overdueCount = taskBuckets.overdue.length;
  const completedCount = taskBuckets.completed.length;
  const totalTodayTasks = sortedTasks.length;
  const totalPendingTasks = sortedTasks.filter(t => !t.completedAt).length;
  const allCompleted = totalPendingTasks === 0 && sortedTasks.length > 0;
  const completionRate = totalTodayTasks > 0 ? Math.round((completedCount / totalTodayTasks) * 100) : 0;

  // Handle quick add task from sidebar
  const handleQuickAddTask = async (payload) => {
    try {
      await createMutation.mutateAsync(payload);
      toast.success('Task created successfully');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState label="Loading tasks…" variant="mascot" />;
  }

  // Staff list for filters
  const staffList = Array.isArray(staff) ? staff : (staff?.data || []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="mb-2">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><Link to="/operations" className="hover:text-[color:var(--bb-color-accent)]">Operations</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Tasks</li>
            </ol>
          </nav>
          <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Tasks & Reminders</h1>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">Manage daily tasks and care schedules</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <Calendar className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm border-none focus:outline-none cursor-pointer text-[color:var(--bb-color-text-primary)]"
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Total Tasks Today"
          value={totalTodayTasks}
          variant="primary"
          tooltip="All tasks scheduled for today"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={completedCount}
          variant="success"
          tooltip="Tasks completed today"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueCount}
          variant={overdueCount > 0 ? 'danger' : 'success'}
          tooltip="Tasks past their due time"
        />
        <StatCard
          icon={TrendingUp}
          label="Completion Rate"
          value={`${completionRate}%`}
          variant={completionRate >= 80 ? 'success' : completionRate >= 50 ? 'warning' : 'danger'}
          tooltip="Percentage of tasks completed"
        />
      </div>

      {/* Two-Column Layout: Task List (left) + Sidebar (right) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Task List */}
        <div className="space-y-4">
          {/* Filter Bar - includes type filters, sort, search */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* Type Filter Chips + Sort */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {[
                { key: 'all', label: 'All', icon: ClipboardList },
                ...Object.entries(TASK_TYPES).map(([key, config]) => ({ key, label: config.label, icon: config.icon, color: config.color }))
              ].map(({ key, label, icon: TypeIcon, color }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    filterType === key
                      ? 'bg-[color:var(--bb-color-accent)] text-white'
                      : 'hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]'
                  )}
                >
                  <TypeIcon className={cn('h-3.5 w-3.5', filterType === key ? 'text-white' : color)} />
                  {label}
                  {categoryCounts[key] > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      filterType === key ? 'bg-white/20' : 'bg-[color:var(--bb-color-bg-elevated)]'
                    )}>
                      {categoryCounts[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort + Quick Filters + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm bg-transparent border-none focus:outline-none cursor-pointer text-[color:var(--bb-color-text-primary)]"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-5 w-px" style={{ backgroundColor: 'var(--bb-color-border-subtle)' }} />

                <button
                  onClick={() => setShowDueToday(!showDueToday)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    showDueToday
                      ? 'bg-[color:var(--bb-color-accent)] text-white'
                      : 'hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]'
                  )}
                >
                  Due Today
                </button>

                <button
                  onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    showOverdueOnly
                      ? 'bg-red-500 text-white'
                      : 'hover:bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]'
                  )}
                >
                  Overdue
                </button>

                {staffList.length > 0 && (
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border focus:outline-none"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <option value="all">All Staff</option>
                    {staffList.map(s => (
                      <option key={s.id || s.recordId} value={s.id || s.recordId}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none w-48"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
              </div>
            </div>

            {/* Active Filter Tags */}
            {(showDueToday || showOverdueOnly || staffFilter !== 'all' || searchTerm) && (
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--bb-color-border-subtle)' }}>
                <span className="text-xs text-[color:var(--bb-color-text-muted)]">Active:</span>
                {showDueToday && (
                  <button
                    onClick={() => setShowDueToday(false)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    Due Today <X className="h-3 w-3" />
                  </button>
                )}
                {showOverdueOnly && (
                  <button
                    onClick={() => setShowOverdueOnly(false)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full"
                  >
                    Overdue <X className="h-3 w-3" />
                  </button>
                )}
                {staffFilter !== 'all' && (
                  <button
                    onClick={() => setStaffFilter('all')}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                  >
                    {staffList.find(s => (s.id || s.recordId) === staffFilter)?.firstName || 'Staff'} <X className="h-3 w-3" />
                  </button>
                )}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                  >
                    "{searchTerm}" <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDueToday(false);
                    setShowOverdueOnly(false);
                    setStaffFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-xs text-[color:var(--bb-color-accent)] hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Task Buckets */}
          <div className="space-y-4">
        {/* All Tasks Complete State */}
        {allCompleted && (
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <PartyPopper className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-1">
                All tasks complete!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                Great job! You're all caught up for today.
              </p>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {sortedTasks.length === 0 && !allCompleted && (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">
                No tasks for this {filterType !== 'all' ? 'category' : 'view'}
              </h3>
              <p className="text-sm text-muted mb-4">
                {filterType !== 'all' 
                  ? `No ${TASK_TYPES[filterType]?.label.toLowerCase() || filterType.toLowerCase()} tasks today.`
                  : 'No tasks scheduled for today.'
                }
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </Card>
        )}

        {/* Overdue Tasks */}
        {taskBuckets.overdue.length > 0 && (
          <TimeBucket
            title="Overdue"
            count={taskBuckets.overdue.length}
            isExpanded={expandedBuckets.overdue}
            onToggle={() => toggleBucket('overdue')}
            variant="overdue"
          >
            <div className="space-y-2">
              {taskBuckets.overdue.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                  pets={pets}
                  staff={staff}
                />
              ))}
            </div>
          </TimeBucket>
        )}

        {/* Due Now */}
        {taskBuckets.dueNow.length > 0 && (
          <TimeBucket
            title="Due Now"
            count={taskBuckets.dueNow.length}
            isExpanded={expandedBuckets.dueNow}
            onToggle={() => toggleBucket('dueNow')}
            variant="dueNow"
          >
            <div className="space-y-2">
              {taskBuckets.dueNow.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                  pets={pets}
                  staff={staff}
                />
              ))}
            </div>
          </TimeBucket>
        )}

        {/* Due Later Today */}
        {taskBuckets.dueLater.length > 0 && (
          <TimeBucket
            title="Due Later Today"
            count={taskBuckets.dueLater.length}
            isExpanded={expandedBuckets.dueLater}
            onToggle={() => toggleBucket('dueLater')}
          >
            <div className="space-y-2">
              {taskBuckets.dueLater.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                  pets={pets}
                  staff={staff}
                />
              ))}
            </div>
          </TimeBucket>
        )}

        {/* Upcoming */}
        {taskBuckets.upcoming.length > 0 && (
          <TimeBucket
            title="Upcoming (Next 7 Days)"
            count={taskBuckets.upcoming.length}
            isExpanded={expandedBuckets.upcoming}
            onToggle={() => toggleBucket('upcoming')}
          >
            <div className="space-y-2">
              {taskBuckets.upcoming.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                  pets={pets}
                  staff={staff}
                />
              ))}
            </div>
          </TimeBucket>
        )}

        {/* Completed (collapsed by default) */}
        {taskBuckets.completed.length > 0 && (
          <TimeBucket
            title="Completed Today"
            count={taskBuckets.completed.length}
            isExpanded={expandedBuckets.completed}
            onToggle={() => toggleBucket('completed')}
          >
            <div className="space-y-2">
              {taskBuckets.completed.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                  pets={pets}
                  staff={staff}
                />
              ))}
            </div>
          </TimeBucket>
        )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          <TodaysSummary
            categoryCounts={categoryCounts}
            taskTypes={TASK_TYPES}
          />

          <StaffWorkload
            staff={staff}
            tasks={combinedTasks}
            onStaffClick={setStaffFilter}
            activeStaffFilter={staffFilter}
          />

          <QuickAddTask
            taskTypes={TASK_TYPES}
            priorityConfig={PRIORITY_CONFIG}
            pets={pets}
            staff={staff}
            onCreateTask={handleQuickAddTask}
            isCreating={createMutation.isPending}
          />
        </div>
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Create New Task</h3>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TASK_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTaskForm({ ...taskForm, type: key })}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                          taskForm.type === key
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <span className="text-xs font-medium">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Priority
                </label>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTaskForm({ ...taskForm, priority: key })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        taskForm.priority === key
                          ? 'ring-2 ring-primary/20'
                          : ''
                      )}
                    >
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Related To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.relatedType}
                    onChange={(e) => setTaskForm({ ...taskForm, relatedType: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  >
                    <option value="PET">Pet</option>
                    <option value="BOOKING">Booking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {taskForm.relatedType === 'PET' ? 'Pet' : 'Booking'} <span className="text-red-500">*</span>
                  </label>
                  {taskForm.relatedType === 'PET' && pets?.pets?.length > 0 ? (
                    <select
                      value={taskForm.relatedId}
                      onChange={(e) => setTaskForm({ ...taskForm, relatedId: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    >
                      <option value="">Select pet...</option>
                      {pets.pets.map(pet => (
                        <option key={pet.id || pet.recordId} value={pet.id || pet.recordId}>{pet.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={taskForm.relatedId}
                      onChange={(e) => setTaskForm({ ...taskForm, relatedId: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter ID"
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Scheduled For <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={taskForm.scheduledFor}
                  onChange={(e) => setTaskForm({ ...taskForm, scheduledFor: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              {staffList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    Assign To
                  </label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map(s => (
                      <option key={s.id || s.recordId} value={s.id || s.recordId}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Notes
                </label>
                <textarea
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Additional notes or instructions..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
