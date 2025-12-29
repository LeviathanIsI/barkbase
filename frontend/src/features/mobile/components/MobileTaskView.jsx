import { useState, useMemo } from 'react';
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronUp,
  Filter,
  Search,
  PhoneCall,
  MessageSquare,
  Camera,
  MapPin,
  Calendar,
  DollarSign,
  PawPrint,
  User,
  FileText,
  Activity,
  X,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useTodaysTasksQuery, useCompleteTaskMutation } from '@/features/tasks/api';
import toast from 'react-hot-toast';

/**
 * Mobile-First Task View
 * Fixes: "I want to do this on my phone" and avoids "wrapped website" complaints
 * Native mobile patterns: slide-up sheets, swipe actions, large touch targets
 */

const MobileTaskView = () => {
  const tz = useTimezoneUtils();
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('due-now');
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch tasks from API
  const { data: apiTasks = [], isLoading } = useTodaysTasksQuery();
  const completeTaskMutation = useCompleteTaskMutation();

  // Transform API tasks to component format
  const tasks = useMemo(() => {
    return apiTasks.map(task => ({
      id: task.recordId || task.id,
      type: task.type?.toLowerCase().replace('_', '-') || 'other',
      priority: task.priority?.toLowerCase() || 'medium',
      pet: task.pet || { name: task.petName || 'Unknown', breed: task.breed, photo: null },
      owner: task.owner || { name: task.ownerName || 'Unknown', phone: task.ownerPhone },
      time: task.dueTime || task.dueDate ?
        (task.dueTime || tz.formatTime(task.dueDate)) :
        'TBD',
      status: task.status?.toLowerCase() || 'pending',
      room: task.room || task.location || 'N/A',
      notes: task.notes || task.description || '',
      medication: task.medication,
      instructions: task.instructions,
      diet: task.diet,
      amount: task.amount,
      balance: task.balance ? (task.balance / 100) : undefined,
      items: task.items || [],
      rawData: task
    }));
  }, [apiTasks, tz]);

  const getTaskIcon = (type) => {
    switch (type) {
      case 'check-in': return CheckCircle;
      case 'check-out': return Calendar;
      case 'medication': return AlertCircle;
      case 'feeding': return FileText;
      default: return Clock;
    }
  };

  const getTaskColor = (type) => {
    switch (type) {
      case 'check-in': return 'bg-success-100 text-success-700 border-success-200';
      case 'check-out': return 'bg-blue-100 dark:bg-surface-secondary text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30';
      case 'medication': return 'bg-error-100 text-error-700 border-error-200';
      case 'feeding': return 'bg-warning-100 text-warning-700 border-warning-200';
      default: return 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary border-gray-200 dark:border-surface-border';
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterStatus === 'due-now') return task.status === 'pending' || task.status === 'overdue';
      if (filterStatus === 'overdue') return task.status === 'overdue';
      if (filterStatus === 'completed') return task.status === 'completed';
      return true;
    });
  }, [tasks, filterStatus]);

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTaskMutation.mutateAsync({ taskId, notes: '' });
      toast.success('Task completed');
      setSelectedTask(null);
    } catch (error) {
      toast.error(error.message || 'Failed to complete task');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-surface-secondary">
      {/* Mobile Header */}
      <div className="bg-white dark:bg-surface-primary border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Tasks</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar - Slides down when active */}
          {searchOpen && (
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search tasks, pets, or owners..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-surface-border rounded-lg focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Filter Tabs - Horizontal scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {[
              { value: 'due-now', label: 'Due Now', count: 12 },
              { value: 'overdue', label: 'Overdue', count: 3 },
              { value: 'upcoming', label: 'Upcoming', count: 8 },
              { value: 'completed', label: 'Completed', count: 24 }
            ].map(filter => {
              const count = filter.value === 'due-now' ? filteredTasks.filter(t => t.status === 'pending' || t.status === 'overdue').length :
                           filter.value === 'overdue' ? filteredTasks.filter(t => t.status === 'overdue').length :
                           filter.value === 'completed' ? tasks.filter(t => t.status === 'completed').length :
                           tasks.length;
              return (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    filterStatus === filter.value
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary"
                  )}
                >
                  {filter.label}
                  {count > 0 && (
                    <span className="ml-1.5">({count})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Bar */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-surface-secondary flex items-center justify-between text-xs">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-text-tertiary" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-text-secondary">
                  {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-error-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-text-secondary">{tasks.filter(t => t.status === 'overdue').length} overdue</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3 text-success-600" />
                  <span className="text-gray-600 dark:text-text-secondary">
                    {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}% complete
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task List - Optimized for touch */}
      <div className="flex-1 overflow-y-auto pb-safe">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-text-tertiary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
            No tasks found
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={() => setSelectedTask(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Details Sheet */}
      {selectedTask && (
        <TaskDetailsSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={handleCompleteTask}
          isLoading={completeTaskMutation.isPending}
        />
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <Button
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

// Task Card Component - Large touch targets
const TaskCard = ({ task, onSelect }) => {
  const [swiped, setSwiped] = useState(false);
  const Icon = getTaskIcon(task.type);
  
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg transition-transform",
        swiped && "transform -translate-x-20"
      )}
    >
      {/* Swipe Actions */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        <Button
          variant="destructive"
          className="h-full rounded-none px-4"
        >
          <CheckCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Card Content */}
      <div
        className={cn(
          "relative bg-white dark:bg-surface-primary border rounded-lg p-4 touch-manipulation",
          getTaskColor(task.type),
          task.priority === 'urgent' && "ring-2 ring-error-400"
        )}
        onClick={onSelect}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <Icon className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-semibold text-gray-900 dark:text-text-primary">
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1).replace('-', ' ')}
                </p>
                <p className="text-sm text-gray-700 dark:text-text-primary mt-0.5">{task.time}</p>
              </div>
              {task.status === 'overdue' && (
                <Badge variant="error" className="text-xs">Overdue</Badge>
              )}
            </div>

            {/* Pet Info */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 bg-white dark:bg-surface-primary/50 rounded-full flex items-center justify-center">
                <PawPrint className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{task.pet.name}</p>
                <p className="text-xs opacity-80">{task.pet.breed}</p>
              </div>
            </div>

            {/* Task-specific info */}
            {task.type === 'check-in' && task.room && (
              <div className="flex items-center gap-2 mt-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span>Room {task.room}</span>
              </div>
            )}
            {task.type === 'medication' && (
              <div className="mt-2 text-sm">
                <p className="font-medium">{task.medication}</p>
                <p className="text-xs opacity-80">{task.instructions}</p>
              </div>
            )}
            {task.type === 'check-out' && task.balance > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">${task.balance} due</span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3">
              {task.owner && (
                <>
                  <Button variant="secondary" size="sm" className="h-8">
                    <PhoneCall className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Text
                  </Button>
                </>
              )}
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-text-tertiary ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Task Details Sheet - Slide up from bottom
const TaskDetailsSheet = ({ task, onClose, onComplete, isLoading: isCompleting }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleComplete = async () => {
    if (onComplete && task.id) {
      await onComplete(task.id);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-40"
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-white dark:bg-surface-primary rounded-t-2xl transition-transform duration-300",
          isClosing ? "translate-y-full" : "translate-y-0"
        )}
        style={{ maxHeight: '90vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-12 h-1 bg-gray-300 dark:bg-surface-border rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                {task.type.charAt(0).toUpperCase() + task.type.slice(1).replace('-', ' ')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-text-secondary">{task.time}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {/* Pet Section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-3">Pet Information</h3>
            <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-surface-border rounded-lg flex items-center justify-center">
                  {task.pet.photo ? (
                    <img src={task.pet.photo} alt={task.pet.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <PawPrint className="h-8 w-8 text-gray-400 dark:text-text-tertiary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-text-primary">{task.pet.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{task.pet.breed}</p>
                  {task.room && (
                    <div className="flex items-center gap-1 mt-2">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                      <span className="text-sm text-gray-700 dark:text-text-primary">Room {task.room}</span>
                    </div>
                  )}
                </div>
                <Button variant="secondary" size="sm">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {task.notes && (
                <div className="mt-3 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                  <p className="text-sm text-warning-800 dark:text-warning-200">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {task.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Owner Section */}
          {task.owner && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-3">Owner Information</h3>
              <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-text-primary">{task.owner.name}</p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">{task.owner.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task-Specific Content */}
          {task.type === 'medication' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-3">Medication Details</h3>
              <div className="bg-error-50 rounded-lg p-4">
                <p className="font-medium text-error-900">{task.medication}</p>
                <p className="text-sm text-error-700 mt-1">{task.instructions}</p>
              </div>
            </div>
          )}

          {task.type === 'check-out' && task.items && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-text-primary mb-3">Services & Charges</h3>
              <div className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4">
                <div className="space-y-2">
                  {task.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-text-primary">{item}</span>
                      <span className="text-gray-900 dark:text-text-primary font-medium">--</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between">
                    <span className="font-medium text-gray-900 dark:text-text-primary">Total Due</span>
                    <span className="font-semibold text-gray-900 dark:text-text-primary">${task.balance}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t bg-gray-50 dark:bg-surface-secondary">
          <Button
            className="w-full h-12 text-base"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Task
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileTaskView;


