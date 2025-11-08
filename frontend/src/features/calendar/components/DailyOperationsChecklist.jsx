import { useState } from 'react';
import { format } from 'date-fns';
import { CheckSquare, Square, Clock, AlertTriangle, CheckCircle, PlayCircle, Dog, Heart, Phone } from 'lucide-react';
import Button from '@/components/ui/Button';

const DailyOperationsChecklist = () => {
  const [tasks, setTasks] = useState({
    morning: [
      { id: 1, text: 'Review today\'s check-ins (4 scheduled)', completed: true, time: '8:00 AM' },
      { id: 2, text: 'Review today\'s check-outs (3 scheduled)', completed: true, time: '8:15 AM' },
      { id: 3, text: 'Check medication schedule (5 pets need meds today)', completed: true, time: '8:30 AM' },
      { id: 4, text: 'Morning feeding round (18 pets)', completed: false, time: '9:00 AM', count: '0/18 pets fed' },
      { id: 5, text: 'Morning potty break (18 pets)', completed: false, time: '10:00 AM', count: '0/18 completed' },
      { id: 6, text: 'Health check (18 pets)', completed: false, time: '11:00 AM', count: '0/18 completed' }
    ],
    midday: [
      { id: 7, text: 'Lunch feeding (12:00 PM - 4 pets)', completed: false, time: '12:00 PM' },
      { id: 8, text: 'Afternoon playtime/exercise', completed: false, time: '2:00 PM' },
      { id: 9, text: 'Medication administration (2:00 PM - 3 pets)', completed: false, time: '2:00 PM' },
      { id: 10, text: 'Send photo updates to owners (12 pets)', completed: false, time: '3:00 PM', count: '0/12 sent' }
    ],
    evening: [
      { id: 11, text: 'Evening feeding round (6:00 PM)', completed: false, time: '6:00 PM' },
      { id: 12, text: 'Final potty break', completed: false, time: '7:00 PM' },
      { id: 13, text: 'Evening medication (8:00 PM - 2 pets)', completed: false, time: '8:00 PM' },
      { id: 14, text: 'Generate report cards (3 check-outs tomorrow)', completed: false, time: '9:00 PM', count: '0/3 check-outs tomorrow' }
    ]
  });

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'warning',
      icon: AlertTriangle,
      message: 'Bella is 3 hours late for check-in - follow up needed',
      action: 'Call Owner'
    },
    {
      id: 2,
      type: 'warning',
      icon: AlertTriangle,
      message: 'Charlie has outstanding balance of $145 (checking out 3pm)',
      action: 'Process Payment'
    },
    {
      id: 3,
      type: 'info',
      icon: CheckCircle,
      message: 'Tomorrow has 6 check-ins - prepare kennels tonight',
      action: 'View Schedule'
    }
  ]);

  const toggleTask = (section, taskId) => {
    setTasks(prev => ({
      ...prev,
      [section]: prev[section].map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const completeMorningTasks = () => {
    setTasks(prev => ({
      ...prev,
      morning: prev.morning.map(task => ({ ...task, completed: true }))
    }));
  };

  const TaskItem = ({ task, section, onToggle }) => (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => onToggle(section, task.id)}
        className="flex-shrink-0"
      >
        {task.completed ? (
          <CheckSquare className="w-5 h-5 text-green-600" />
        ) : (
          <Square className="w-5 h-5 text-gray-400 dark:text-text-tertiary" />
        )}
      </button>

      <div className="flex-1">
        <div className={`text-sm ${task.completed ? 'text-gray-500 dark:text-text-secondary line-through' : 'text-gray-900 dark:text-text-primary'}`}>
          {task.text}
        </div>
        {task.count && (
          <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">{task.count}</div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-text-secondary flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {task.time}
      </div>
    </div>
  );

  const AlertItem = ({ alert }) => {
    const Icon = alert.icon;
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg ${
        alert.type === 'warning' ? 'bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30' :
        alert.type === 'error' ? 'bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30' :
        'bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30'
      }`}>
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          alert.type === 'warning' ? 'text-yellow-600' :
          alert.type === 'error' ? 'text-red-600' :
          'text-blue-600 dark:text-blue-400'
        }`} />
        <div className="flex-1">
          <div className={`text-sm ${
            alert.type === 'warning' ? 'text-yellow-800' :
            alert.type === 'error' ? 'text-red-800 dark:text-red-200' :
            'text-blue-800 dark:text-blue-200'
          }`}>
            {alert.message}
          </div>
          <Button size="sm" variant="outline" className="mt-2 text-xs">
            {alert.action}
          </Button>
        </div>
      </div>
    );
  };

  const getCompletedCount = (sectionTasks) => {
    return sectionTasks.filter(task => task.completed).length;
  };

  const getTotalCount = (sectionTasks) => {
    return sectionTasks.length;
  };

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">📋 DAILY CHECKLIST</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 dark:text-text-primary">
            {getCompletedCount([...tasks.morning, ...tasks.midday, ...tasks.evening])}/{getTotalCount([...tasks.morning, ...tasks.midday, ...tasks.evening])}
          </div>
          <div className="text-xs text-gray-500 dark:text-text-secondary">tasks completed</div>
        </div>
      </div>

      {/* Morning Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-text-primary flex items-center gap-2">
            🌅 MORNING TASKS
            <span className="text-sm font-normal text-gray-600 dark:text-text-secondary">
              ({getCompletedCount(tasks.morning)}/{getTotalCount(tasks.morning)})
            </span>
          </h4>
          {!tasks.morning.every(task => task.completed) && (
            <Button size="sm" variant="outline" onClick={completeMorningTasks}>
              Mark All Complete
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {tasks.morning.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              section="morning"
              onToggle={toggleTask}
            />
          ))}
        </div>
      </div>

      {/* Midday Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-text-primary flex items-center gap-2">
            ☀️ MIDDAY TASKS
            <span className="text-sm font-normal text-gray-600 dark:text-text-secondary">
              ({getCompletedCount(tasks.midday)}/{getTotalCount(tasks.midday)})
            </span>
          </h4>
        </div>
        <div className="space-y-1">
          {tasks.midday.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              section="midday"
              onToggle={toggleTask}
            />
          ))}
        </div>
      </div>

      {/* Evening Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-text-primary flex items-center gap-2">
            🌙 EVENING TASKS
            <span className="text-sm font-normal text-gray-600 dark:text-text-secondary">
              ({getCompletedCount(tasks.evening)}/{getTotalCount(tasks.evening)})
            </span>
          </h4>
        </div>
        <div className="space-y-1">
          {tasks.evening.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              section="evening"
              onToggle={toggleTask}
            />
          ))}
        </div>
      </div>

      {/* Alerts & Reminders */}
      <div className="border-t border-gray-200 dark:border-surface-border pt-6">
        <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
          ⚠️ ALERTS & REMINDERS
        </h4>
        <div className="space-y-3">
          {alerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-surface-border">
        <Button variant="outline" size="sm">
          <Dog className="w-4 h-4 mr-2" />
          View Full Task List
        </Button>
        <Button variant="outline" size="sm">
          <Heart className="w-4 h-4 mr-2" />
          Health Check Log
        </Button>
        <Button variant="outline" size="sm">
          <Phone className="w-4 h-4 mr-2" />
          Emergency Contacts
        </Button>
      </div>
    </div>
  );
};

export default DailyOperationsChecklist;
