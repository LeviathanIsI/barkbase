import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, AlertTriangle, Clock, ListTodo, Home, ExternalLink, AlertCircle, Dog, User, ChevronRight } from 'lucide-react';
import { useUserProfileQuery } from '@/features/settings/api-user';
import { useTimezoneUtils } from '@/lib/timezone';
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
  const tz = useTimezoneUtils();
  const [showBatchCheckIn, setShowBatchCheckIn] = useState(false);
  const [showBatchCheckOut, setShowBatchCheckOut] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showInFacility, setShowInFacility] = useState(false);
  const [showNeedsAttention, setShowNeedsAttention] = useState(false);
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
      tz.formatDate(new Date(), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [tz],
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
      {/* Breadcrumbs */}
      <nav className="mb-2">
        <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
          <li><span>Today</span></li>
          <li className="flex items-center gap-1"><ChevronRight className="h-3 w-3" /><span className="text-[color:var(--bb-color-text-primary)] font-medium">Command Center</span></li>
        </ol>
      </nav>

      {/* 12-column grid layout */}
      <div className="grid gap-[var(--bb-space-6,1.5rem)] lg:grid-cols-12">
        {/* Hero card spans full width */}
        <div className="lg:col-span-12">
          <TodayHeroCard
            kennelName={kennelName}
            formattedDate={formattedDate}
            stats={stats}
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
                  tz={tz}
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
                  tz={tz}
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
        size="xl"
      >
        <SinglePageBookingWizard onComplete={handleBookingComplete} />
      </SlideOutDrawer>

      {/* In Facility Slideout */}
      <SlideOutDrawer
        isOpen={showInFacility}
        onClose={() => setShowInFacility(false)}
        title="Pets In Facility"
        size="lg"
      >
        <InFacilitySlideoutContent
          pets={inFacility}
          onClose={() => setShowInFacility(false)}
          tz={tz}
        />
      </SlideOutDrawer>

      {/* Needs Attention Slideout */}
      <SlideOutDrawer
        isOpen={showNeedsAttention}
        onClose={() => setShowNeedsAttention(false)}
        title="Needs Attention"
        size="lg"
      >
        <NeedsAttentionSlideoutContent
          overdueTasks={overdueTasks}
          vaccinationIssues={arrivals.filter(b => b.hasExpiringVaccinations)}
          onCompleteTask={handleCompleteTask}
          isCompleting={completeTaskMutation.isPending}
          onClose={() => setShowNeedsAttention(false)}
          tz={tz}
        />
      </SlideOutDrawer>
    </div>
  );
};

// ============================================================================
// TASKS LIST COMPONENT
// ============================================================================

const TasksList = ({ tasks, isLoading, emptyMessage, onComplete, isCompleting, isOverdue, tz }) => {
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
                {tz ? tz.formatTime(task.scheduledFor) : new Date(task.scheduledFor).toLocaleTimeString('en-US', {
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

// ============================================================================
// IN FACILITY SLIDEOUT CONTENT
// ============================================================================

const InFacilitySlideoutContent = ({ pets, onClose, tz }) => {
  const navigate = useNavigate();

  if (!pets.length) {
    return (
      <div className="text-center py-12">
        <Home className="h-12 w-12 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
        <p className="text-[color:var(--bb-color-text-muted)]">No pets currently in facility</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[color:var(--bb-color-border)]">
        <p className="text-sm text-[color:var(--bb-color-text-muted)]">
          {pets.length} pet{pets.length !== 1 ? 's' : ''} currently staying
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onClose();
            navigate('/kennels');
          }}
          className="gap-1.5"
        >
          View Kennels
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {pets.map((booking) => (
          <div
            key={booking.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-[color:var(--bb-color-border)] bg-[color:var(--bb-color-bg-elevated)] hover:border-[color:var(--bb-color-accent)] transition-colors cursor-pointer"
            onClick={() => {
              onClose();
              navigate(`/pets/${booking.petId || booking.pet_id}`);
            }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Dog className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">
                {booking.petName || booking.pet_name || 'Unknown Pet'}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                {booking.ownerName || booking.owner_name || 'Unknown Owner'}
                {booking.kennelName && ` • ${booking.kennelName}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                Departs {booking.endDate ? tz.formatShortDate(booking.endDate) : 'TBD'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// NEEDS ATTENTION SLIDEOUT CONTENT
// ============================================================================

const NeedsAttentionSlideoutContent = ({ overdueTasks, vaccinationIssues, onCompleteTask, isCompleting, onClose, tz }) => {
  const navigate = useNavigate();
  const totalItems = overdueTasks.length + vaccinationIssues.length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
        <p className="text-[color:var(--bb-color-text-muted)]">Nothing needs attention right now!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-[color:var(--bb-color-text-primary)]">
              Overdue Tasks ({overdueTasks.length})
            </h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">
                    {task.title || `${task.type} ${task.petName ? `- ${task.petName}` : ''}`}
                  </p>
                  {task.scheduledFor && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Due {tz ? tz.formatShortDate(task.scheduledFor) : new Date(task.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => onCompleteTask(task.id)}
                  disabled={isCompleting}
                  className="ml-2 flex-shrink-0"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Done
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vaccination Issues Section */}
      {vaccinationIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-sm text-[color:var(--bb-color-text-primary)]">
              Vaccination Alerts ({vaccinationIssues.length})
            </h3>
          </div>
          <div className="space-y-2">
            {vaccinationIssues.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
                onClick={() => {
                  onClose();
                  navigate(`/pets/${booking.petId || booking.pet_id}`);
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <Dog className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">
                    {booking.petName || booking.pet_name || 'Unknown Pet'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Expiring or missing vaccinations
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer link to tasks page */}
      <div className="pt-4 border-t border-[color:var(--bb-color-border)]">
        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={() => {
            onClose();
            navigate('/tasks');
          }}
        >
          View All Tasks
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TodayCommandCenter;
