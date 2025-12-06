import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertTriangle, Clock, ListTodo } from 'lucide-react';
import { useUserProfileQuery } from '@/features/settings/api-user';
// Dashboard hooks available if needed:
// import { useDashboardStatsQuery } from '@/features/dashboard/api';
import { useTodaysTasksQuery, useOverdueTasksQuery, useCompleteTaskMutation, TASK_STATUS } from '@/features/tasks/api';
import TodayHeroCard from '@/features/today/components/TodayHeroCard';
import TodayArrivalsList from '@/features/today/components/TodayArrivalsList';
import TodayDeparturesList from '@/features/today/components/TodayDeparturesList';
import TodayBatchCheckInModal from '@/features/today/components/TodayBatchCheckInModal';
import TodayBatchCheckOutModal from '@/features/today/components/TodayBatchCheckOutModal';
import useTodayBookingsSnapshot, { getTodayBookingsSnapshotKey } from '@/features/today/hooks/useTodayBookingsSnapshot';
import SinglePageBookingWizard from '@/features/bookings/components/SinglePageBookingWizard';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
// Replaced with LoadingState (mascot) for page-level loading
import LoadingState from '@/components/ui/LoadingState';
import TodayCard from '@/features/today/components/TodayCard';
import TodaySection from '@/features/today/components/TodaySection';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

/**
 * TodayCommandCenter Component
 * 
 * The main "operations cockpit" for day-to-day kennel management.
 * Shows arrivals, departures, tasks, and key metrics using the new
 * normalized API hooks for bookings, tasks, and dashboard data.
 */
const TodayCommandCenter = () => {
  const queryClient = useQueryClient();
  const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
  const [showBatchCheckOut, setShowBatchCheckOut] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  // Today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  
  // ============================================================================
  // DATA FETCHING - Using canonical hooks
  // ============================================================================
  
  // User profile for kennel name
  const { data: userProfile = {} } = useUserProfileQuery();
  const kennelName = userProfile?.propertyName || userProfile?.businessName || '';

  // Bookings snapshot (arrivals, departures, in-facility)
  const todaySnapshot = useTodayBookingsSnapshot(today);
  const snapshotQueryKey = getTodayBookingsSnapshotKey(today);
  const arrivals = todaySnapshot.data?.arrivalsToday ?? [];
  const departures = todaySnapshot.data?.departuresToday ?? [];
  const inFacility = todaySnapshot.data?.inFacility ?? [];
  
  // Dashboard stats from analytics-service (available for future use)
  // const { data: dashboardStats = {} } = useDashboardStatsQuery();
  
  // Tasks from refactored tasks API
  const { data: todaysTasks = [], isLoading: tasksLoading } = useTodaysTasksQuery();
  const { data: overdueTasks = [], isLoading: overdueLoading } = useOverdueTasksQuery();
  const completeTaskMutation = useCompleteTaskMutation();
  
  // Loading states
  const loadingSnapshot = todaySnapshot.isLoading && !todaySnapshot.data;
  const isUpdatingSnapshot = todaySnapshot.isFetching && !todaySnapshot.isLoading && !!todaySnapshot.data;
  
  // Fade-in animation state
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!loadingSnapshot && todaySnapshot.data && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [loadingSnapshot, todaySnapshot.data, hasLoaded]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: snapshotQueryKey });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setLastRefreshed(new Date());
  }, [queryClient, snapshotQueryKey]);

  const handleBookingComplete = useCallback(() => {
    setShowNewBooking(false);
    queryClient.invalidateQueries({ queryKey: snapshotQueryKey });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success('Booking created successfully!');
  }, [queryClient, snapshotQueryKey]);

  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await completeTaskMutation.mutateAsync({ taskId });
      toast.success('Task completed!');
    } catch {
      toast.error('Failed to complete task');
    }
  }, [completeTaskMutation]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Calculate attention items (overdue tasks + unpaid/issues)
  const attentionItems = useMemo(() => {
    const overdueCount = overdueTasks.length;
    const vaccinationIssues = arrivals.filter(b => b.hasExpiringVaccinations).length;
    return overdueCount + vaccinationIssues;
  }, [overdueTasks, arrivals]);

  // Stats for hero card
  const stats = useMemo(() => ({
    arrivals: arrivals.length,
    departures: departures.length,
    inFacility: inFacility.length,
    attentionItems,
  }), [arrivals, departures, inFacility, attentionItems]);

  // Formatted date
  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  // Pending tasks (not completed)
  const pendingTasks = useMemo(() => 
    todaysTasks.filter(t => t.status !== TASK_STATUS.COMPLETED),
    [todaysTasks]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loadingSnapshot) {
    return <LoadingState label="Loading today's schedule…" variant="mascot" />;
  }


  return (
    <div className={cn(
      "space-y-[var(--bb-space-6,1.5rem)] transition-opacity duration-200",
      hasLoaded ? "opacity-100" : "opacity-0"
    )}>
      {/* 12-column grid layout */}
      <div className="grid gap-[var(--bb-space-6,1.5rem)] lg:grid-cols-12">
        {/* Hero card spans full width */}
        <div className="lg:col-span-12">
          <TodayHeroCard
            kennelName={kennelName}
            formattedDate={formattedDate}
            stats={stats}
            isLoading={false}
            isUpdating={isUpdatingSnapshot}
            onRefresh={handleRefresh}
            lastRefreshed={lastRefreshed}
            onNewBooking={() => setShowNewBooking(true)}
          />
        </div>

        {/* Arrivals & Departures side-by-side on large screens */}
        <div className="lg:col-span-6">
          <TodayArrivalsList
            arrivals={arrivals}
            isLoading={false}
            hasError={todaySnapshot.isError}
            onBatchCheckIn={() => setShowBatchCheckIn(true)}
          />
        </div>
        <div className="lg:col-span-6">
          <TodayDeparturesList
            departures={departures}
            isLoading={false}
            hasError={todaySnapshot.isError}
            onBatchCheckOut={() => setShowBatchCheckOut(true)}
          />
        </div>

        {/* Tasks Section */}
        <div className="lg:col-span-12">
          <div className="grid gap-[var(--bb-space-6,1.5rem)] lg:grid-cols-2">
            {/* Today's Tasks */}
            <TodayCard>
              <TodaySection
                title="Today's Tasks"
                icon={ListTodo}
                iconClassName="text-blue-600 dark:text-blue-400"
                badge={<Badge variant="info">{pendingTasks.length}</Badge>}
              >
                <TasksList
                  tasks={pendingTasks}
                  isLoading={tasksLoading}
                  emptyMessage="All tasks complete! 🎉"
                  onComplete={handleCompleteTask}
                  isCompleting={completeTaskMutation.isPending}
                />
              </TodaySection>
            </TodayCard>

            {/* Overdue Tasks */}
            <TodayCard>
              <TodaySection
                title="Overdue Tasks"
                icon={AlertTriangle}
                iconClassName="text-amber-600 dark:text-amber-400"
                badge={
                  <Badge variant={overdueTasks.length > 0 ? "warning" : "success"}>
                    {overdueTasks.length}
                  </Badge>
                }
              >
                <TasksList
                  tasks={overdueTasks}
                  isLoading={overdueLoading}
                  emptyMessage="No overdue tasks 🎉"
                  onComplete={handleCompleteTask}
                  isCompleting={completeTaskMutation.isPending}
                  isOverdue
                />
              </TodaySection>
            </TodayCard>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TodayBatchCheckInModal
        open={showBatchCheckIn}
        onClose={() => setShowBatchCheckIn(false)}
      />
      <TodayBatchCheckOutModal
        open={showBatchCheckOut}
        onClose={() => setShowBatchCheckOut(false)}
        departures={departures}
        snapshotQueryKey={snapshotQueryKey}
      />
      <SlideOutDrawer
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        title="New Booking"
        size="lg"
      >
        <SinglePageBookingWizard onComplete={handleBookingComplete} />
      </SlideOutDrawer>
    </div>
  );
};

// ============================================================================
// TASKS LIST COMPONENT
// ============================================================================

const TasksList = ({ tasks, isLoading, emptyMessage, onComplete, isCompleting, isOverdue }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-[color:var(--bb-color-bg-elevated)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
        <p className="text-[color:var(--bb-color-text-muted)] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {tasks.slice(0, 10).map((task, idx) => (
        <div
          key={task.id || idx}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-colors",
            isOverdue 
              ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
              : "bg-[color:var(--bb-color-bg-elevated)] border-[color:var(--bb-color-border)]"
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">
              {task.title || `${task.type} ${task.petName ? `- ${task.petName}` : ''}`}
            </p>
            {task.scheduledFor && (
              <p className="text-xs text-[color:var(--bb-color-text-muted)] flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(task.scheduledFor).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                })}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant={isOverdue ? "warning" : "outline"}
            onClick={() => onComplete(task.id)}
            disabled={isCompleting}
            className="ml-2 flex-shrink-0"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Done
          </Button>
        </div>
      ))}
      {tasks.length > 10 && (
        <p className="text-center text-xs text-[color:var(--bb-color-text-muted)] pt-2">
          +{tasks.length - 10} more tasks
        </p>
      )}
    </div>
  );
};

export default TodayCommandCenter;
