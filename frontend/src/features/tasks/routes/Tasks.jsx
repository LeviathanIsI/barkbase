import { useState } from 'react';
import { CheckCircle, Circle, Plus, AlertTriangle, Calendar, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, useCreateTaskMutation } from '../api';
import toast from 'react-hot-toast';

const Tasks = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    type: 'FEEDING',
    relatedType: 'PET',
    relatedId: '',
    assignedTo: '',
    scheduledFor: '',
    notes: '',
    priority: 'NORMAL'
  });

  const { data: todaysTasks, isLoading: todaysLoading } = useTodaysTasksQuery();
  const { data: overdueTasks, isLoading: overdueLoading } = useOverdueTasksQuery();
  const completeMutation = useCompleteTaskMutation();
  const createMutation = useCreateTaskMutation();

  const isLoading = todaysLoading || overdueLoading;

  const handleCompleteTask = async (taskId) => {
    try {
      await completeMutation.mutateAsync({ taskId });
      toast.success('Task completed');
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(taskForm);
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

  const getTaskIcon = (type) => {
    const icons = {
      FEEDING: '🍖',
      MEDICATION: '💊',
      GROOMING: '✂️',
      EXERCISE: '🏃',
      CHECKUP: '🔍'
    };
    return icons[type] || '📋';
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      LOW: 'neutral',
      NORMAL: 'info',
      HIGH: 'warning',
      URGENT: 'danger'
    };
    return <Badge variant={variants[priority] || 'neutral'}>{priority}</Badge>;
  };

  const allTasks = [
    ...(overdueTasks || []).map(t => ({ ...t, isOverdue: true })),
    ...(todaysTasks || [])
  ];

  const filteredTasks = filterType === 'all' 
    ? allTasks 
    : allTasks.filter(t => t.type === filterType);

  if (isLoading) {
    return (
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <PageHeader title="Tasks & Reminders" description="Manage daily tasks and care schedules" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <PageHeader
        title="Tasks & Reminders"
        description="Manage daily tasks and care schedules"
        actions={
          <div className="flex gap-[var(--bb-space-2,0.5rem)]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
              style={{
                backgroundColor: 'var(--bb-color-bg-elevated)',
                borderColor: 'var(--bb-color-border-subtle)',
                color: 'var(--bb-color-text-primary)',
              }}
            />
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-[var(--bb-space-2,0.5rem)] overflow-x-auto">
        {['all', 'FEEDING', 'MEDICATION', 'GROOMING', 'EXERCISE', 'CHECKUP'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className="px-[var(--bb-space-4,1rem)] py-[var(--bb-space-2,0.5rem)] rounded-lg text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] whitespace-nowrap transition-colors"
            style={{
              backgroundColor: filterType === type ? 'var(--bb-color-accent)' : 'var(--bb-color-bg-surface)',
              color: filterType === type ? 'var(--bb-color-text-on-accent)' : 'var(--bb-color-text-muted)',
              borderColor: 'var(--bb-color-border-subtle)',
            }}
          >
            {type === 'all' ? 'All Tasks' : type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdueTasks && overdueTasks.length > 0 && (
        <Card className="mb-6 bg-danger/5 border-danger/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <div>
              <p className="font-semibold text-danger">
                {overdueTasks.length} Overdue Task{overdueTasks.length === 1 ? '' : 's'}
              </p>
              <p className="text-sm text-muted">Please complete these as soon as possible</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks List */}
      <Card>
        <div className="divide-y divide-border">
          {filteredTasks.map((task) => (
            <div
              key={task.recordId}
              className={`p-4 hover:bg-surface/50 transition-colors ${
                task.completedAt ? 'opacity-60' : ''
              } ${task.isOverdue ? 'bg-danger/5' : ''}`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => !task.completedAt && handleCompleteTask(task.recordId)}
                  className="mt-1"
                  disabled={!!task.completedAt || completeMutation.isLoading}
                >
                  {task.completedAt ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getTaskIcon(task.type)}</span>
                    <h3 className={`font-semibold ${task.completedAt ? 'line-through' : ''}`}>
                      {task.type.charAt(0) + task.type.slice(1).toLowerCase()}
                    </h3>
                    {getPriorityBadge(task.priority)}
                    {task.isOverdue && <Badge variant="danger">Overdue</Badge>}
                  </div>

                  {task.notes && (
                    <p className="text-sm text-muted mb-2">{task.notes}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(task.scheduledFor).toLocaleString()}
                    </span>
                    {task.assignedTo && (
                      <span>Assigned to Staff</span>
                    )}
                    {task.completedAt && (
                      <span className="text-success">
                        Completed {new Date(task.completedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted mx-auto mb-4" />
              <p className="text-muted">No {filterType !== 'all' ? filterType.toLowerCase() : ''} tasks for today</p>
              <p className="text-sm text-muted mt-2">All caught up!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={taskForm.type}
                  onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="FEEDING">Feeding</option>
                  <option value="MEDICATION">Medication</option>
                  <option value="GROOMING">Grooming</option>
                  <option value="EXERCISE">Exercise</option>
                  <option value="CHECKUP">Checkup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Related Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={taskForm.relatedType}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedType: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="PET">Pet</option>
                  <option value="BOOKING">Booking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Related ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.relatedId}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter pet or booking ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Scheduled For <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={taskForm.scheduledFor}
                  onChange={(e) => setTaskForm({ ...taskForm, scheduledFor: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Notes
                </label>
                <textarea
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-surface-border pt-4">
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
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
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

