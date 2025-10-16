import { useState } from 'react';
import { CheckCircle, Circle, Plus, AlertTriangle, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation } from '../api';
import toast from 'react-hot-toast';

const Tasks = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState('all');

  const { data: todaysTasks, isLoading: todaysLoading } = useTodaysTasksQuery();
  const { data: overdueTasks, isLoading: overdueLoading } = useOverdueTasksQuery();
  const completeMutation = useCompleteTaskMutation();

  const isLoading = todaysLoading || overdueLoading;

  const handleCompleteTask = async (taskId) => {
    try {
      await completeMutation.mutateAsync({ taskId });
      toast.success('Task completed');
    } catch (error) {
      toast.error('Failed to complete task');
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
      <div>
        <PageHeader title="Tasks & Reminders" breadcrumb="Home > Operations > Tasks" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tasks & Reminders"
        breadcrumb="Home > Operations > Tasks"
        actions={
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {['all', 'FEEDING', 'MEDICATION', 'GROOMING', 'EXERCISE', 'CHECKUP'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === type
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:bg-surface/80'
            }`}
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
    </div>
  );
};

export default Tasks;

