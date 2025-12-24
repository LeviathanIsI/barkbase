import { useState } from "react";
import { CheckSquare, Square, LogIn, LogOut, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useBookingsQuery } from "@/features/bookings/api";
import { useTodayStats } from "../hooks/useTodayStats";

/**
 * Daily Operations Checklist section - shows actionable tasks for today
 */
const DailyChecklistSection = ({ currentDate = new Date() }) => {
  const today = format(currentDate, 'yyyy-MM-dd');
  const { data: todayBookings } = useBookingsQuery({ from: today, to: today });
  const stats = useTodayStats(currentDate);
  
  const [completedTasks, setCompletedTasks] = useState(new Set());

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Generate tasks from real data
  const tasks = [];
  
  // Check-ins scheduled for today
  const checkInsToday = (todayBookings || []).filter(b => {
    const checkInDate = format(new Date(b.checkIn), 'yyyy-MM-dd');
    return checkInDate === today && b.status !== 'CHECKED_IN';
  });
  
  checkInsToday.forEach(booking => {
    tasks.push({
      id: `checkin-${booking.id || booking.recordId}`,
      icon: LogIn,
      label: `Check in ${booking.pet?.name || 'guest'} (${booking.owner?.firstName} ${booking.owner?.lastName})`,
      color: 'text-green-600',
      priority: 'high'
    });
  });

  // Check-outs scheduled for today
  const checkOutsToday = (todayBookings || []).filter(b => {
    const checkOutDate = format(new Date(b.checkOut), 'yyyy-MM-dd');
    return checkOutDate === today && b.status !== 'CHECKED_OUT';
  });
  
  checkOutsToday.forEach(booking => {
    tasks.push({
      id: `checkout-${booking.id || booking.recordId}`,
      icon: LogOut,
      label: `Check out ${booking.pet?.name || 'guest'} (${booking.owner?.firstName} ${booking.owner?.lastName})`,
      color: 'text-orange-600',
      priority: 'high'
    });
  });

  // Add routine tasks
  if (tasks.length > 0 || stats.petsToday > 0) {
    tasks.push({
      id: 'morning-feeding',
      icon: Clock,
      label: 'Complete morning feeding and medication rounds',
      color: 'text-blue-600 dark:text-blue-400',
      priority: 'medium'
    });
    tasks.push({
      id: 'facility-check',
      icon: CheckSquare,
      label: 'Inspect all kennels and common areas',
      color: 'text-blue-600 dark:text-blue-400',
      priority: 'medium'
    });
  }

  // Pending payments
  const unpaidBookings = (todayBookings || []).filter(
    b => b.status === 'CHECKED_OUT' && !b.paymentStatus
  );
  if (unpaidBookings.length > 0) {
    tasks.push({
      id: 'collect-payments',
      icon: DollarSign,
      label: `Collect ${unpaidBookings.length} pending payment${unpaidBookings.length > 1 ? 's' : ''}`,
      color: 'text-purple-600 dark:text-purple-400',
      priority: 'high'
    });
  }

  const completedCount = tasks.filter(t => completedTasks.has(t.id)).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">
              Daily Operations Checklist
            </h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              {completedCount} of {tasks.length} tasks completed
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">{progressPct}%</div>
          <div className="text-xs text-gray-500 dark:text-text-secondary">Complete</div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 text-gray-400 dark:text-text-tertiary mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-text-secondary">
            No tasks scheduled for today
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isCompleted = completedTasks.has(task.id);
            return (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border'
                    : 'bg-white dark:bg-surface-primary border-gray-200 dark:border-surface-border hover:border-gray-300'
                }`}
              >
                {isCompleted ? (
                  <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 dark:text-text-tertiary flex-shrink-0" />
                )}
                <task.icon className={`w-4 h-4 ${task.color} flex-shrink-0`} />
                <span
                  className={`text-sm flex-1 text-left ${
                    isCompleted ? 'line-through text-gray-500 dark:text-text-secondary' : 'text-gray-900 dark:text-text-primary'
                  }`}
                >
                  {task.label}
                </span>
                {task.priority === 'high' && !isCompleted && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-surface-secondary text-red-700 dark:text-red-200 rounded">
                    Priority
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyChecklistSection;

