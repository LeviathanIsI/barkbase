/**
 * Schedule Page Tour Definition
 *
 * Product tour for Today's Schedule page.
 * Highlights key features for daily operations,
 * capacity management, and scheduling.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const SCHEDULE_TOUR_ID = 'schedule-page-v1';

// ============================================================================
// SCHEDULE PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Schedule page
 */
export const scheduleTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="schedule-header"]',
    popover: {
      title: "Today's Schedule",
      description:
        'Your complete operations dashboard. View daily stats, manage check-ins/outs, and monitor facility capacity at a glance.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Action Buttons
  {
    element: '[data-tour="schedule-actions"]',
    popover: {
      title: 'Quick Actions',
      description:
        'Access kennels layout, check-in/out dashboard, filters, and create new bookings from these quick action buttons.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 3: Stats Cards
  {
    element: '[data-tour="schedule-stats"]',
    popover: {
      title: 'Daily Stats',
      description:
        'Monitor key metrics: pets in facility, pending check-ins/outs, and occupancy. Click any card to filter the view.',
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 4: Today Dashboard
  {
    element: '[data-tour="schedule-dashboard"]',
    popover: {
      title: "Today's Dashboard",
      description:
        'Quick summary of current bookings, capacity, check-ins, and available spots. Refresh to get the latest data.',
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 5: Capacity Alerts
  {
    element: '[data-tour="schedule-alerts"]',
    popover: {
      title: 'Capacity Alerts',
      description:
        'Real-time alerts when facility capacity is high. Green means good availability, amber/red indicates limited space.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 6: Weekly Grid
  {
    element: '[data-tour="schedule-grid"]',
    popover: {
      title: 'Weekly Run Grid',
      description:
        'Visual grid showing all runs/rooms for the week. Click a booking to view details, or click an empty cell to create a new booking.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 7: Help Button
  {
    element: '[data-tour="schedule-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description:
        'Click here anytime to replay this guided tour and learn about the Schedule features.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Completion
  {
    element: '[data-tour="schedule-header"]',
    popover: {
      title: "You're All Set!",
      description:
        'You now know how to use the Schedule dashboard. Monitor daily operations, manage capacity, and keep your facility running smoothly.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const scheduleTourConfig = {
  id: SCHEDULE_TOUR_ID,
  steps: scheduleTourSteps,
  onComplete: () => {
    console.log('Schedule tour completed');
  },
  onSkip: () => {
    console.log('Schedule tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getScheduleTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return scheduleTourSteps;

  const stepMap = {
    header: 0,
    actions: 1,
    stats: 2,
    dashboard: 3,
    alerts: 4,
    grid: 5,
    help: 6,
    complete: 7,
  };

  return stepIds
    .map((id) => scheduleTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default scheduleTourConfig;
