import { Calendar, Plus, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import StyledSelect from '@/components/ui/StyledSelect';
import { useState, useMemo } from 'react';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, useCreateTaskMutation } from '@/features/tasks/api';

const TaskManagementSystem = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', type: 'FEEDING', dueAt: new Date().toISOString(), assignedTo: '' });

  const { data: todaysTasksData, isLoading: loadingToday } = useTodaysTasksQuery();
  const { data: overdueTasksData, isLoading: loadingOverdue } = useOverdueTasksQuery();
  const completeMutation = useCompleteTaskMutation();
  const createMutation = useCreateTaskMutation();

  const todaysTasks = useMemo(() => Array.isArray(todaysTasksData) ? todaysTasksData : (todaysTasksData?.data || []), [todaysTasksData]);
  const overdueTasks = useMemo(() => Array.isArray(overdueTasksData) ? overdueTasksData : (overdueTasksData?.data || []), [overdueTasksData]);
  const pendingCount = todaysTasks.filter(t => !t.completedAt && (t.status === 'PENDING' || !t.status)).length;
  const completedCount = todaysTasks.filter(t => t.completedAt || t.status === 'COMPLETED').length;

  const handleComplete = async (taskId) => {
    await completeMutation.mutateAsync({ taskId });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await createMutation.mutateAsync(newTask);
    setShowCreate(false);
    setNewTask({ title: '', description: '', type: 'FEEDING', dueAt: new Date().toISOString(), assignedTo: '' });
  };

  const isLoading = loadingToday || loadingOverdue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Task Management</h2>
          <p className="text-gray-600 dark:text-text-secondary">Assign and track tasks for your team</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Today's Tasks Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Today's Tasks</h3>
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-text-secondary">Loading tasks…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 mb-2">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{pendingCount}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">⏰ Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{completedCount}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">✅ Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">{overdueTasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">⚠️ Overdue</div>
            </div>
          </div>
        )}
      </Card>

      {/* Task List */}
      <Card className="p-4">
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-text-secondary">Loading…</div>
        ) : todaysTasks.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-text-secondary">No tasks for today.</div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((t) => (
              <div key={t.recordId || t.id} className="flex items-start justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {t.priority === 'HIGH' && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 text-xs font-medium rounded">HIGH PRIORITY</span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-text-secondary flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(t.dueAt || t.scheduledFor || Date.now()).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-text-primary mb-1">{t.title || t.type || 'Task'}</h4>
                  {t.description && <p className="text-sm text-gray-600 dark:text-text-secondary">{t.description}</p>}
                </div>
                <div className="flex gap-2 ml-4">
                  {!t.completedAt && (
                    <Button size="sm" onClick={() => handleComplete(t.recordId || t.id)}>Mark Complete</Button>
                  )}
                  {/* Placeholder for edit/reassign when APIs exist */}
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Task Modal (simple inline) */}
      {showCreate && (
        <Card className="p-4">
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <input className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded" placeholder="Title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            <input className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded" placeholder="Assigned To (user id)" value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} />
            <input className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded md:col-span-2" placeholder="Description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
            <div className="flex items-center gap-2 md:col-span-2">
              <input type="datetime-local" className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded" value={new Date(newTask.dueAt).toISOString().slice(0,16)} onChange={(e) => setNewTask({ ...newTask, dueAt: new Date(e.target.value).toISOString() })} />
              <div className="min-w-[140px]">
                <StyledSelect
                  options={[
                    { value: 'FEEDING', label: 'FEEDING' },
                    { value: 'MEDICATION', label: 'MEDICATION' },
                    { value: 'CLEANING', label: 'CLEANING' },
                    { value: 'OTHER', label: 'OTHER' },
                  ]}
                  value={newTask.type}
                  onChange={(opt) => setNewTask({ ...newTask, type: opt?.value || 'FEEDING' })}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default TaskManagementSystem;
