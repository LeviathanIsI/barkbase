/**
 * Today Dashboard Tour Definition
 *
 * Product tour for the Today Command Center page.
 * Highlights key features for first-time users and provides
 * helpful tips for daily workflow optimization.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const TODAY_TOUR_ID = 'today-dashboard-v1';
export const WELCOME_TOUR_ID = 'barkbase-welcome-v1';

// ============================================================================
// WELCOME TOUR (First-time users only)
// ============================================================================

/**
 * Welcome tour steps - shown only on first-ever visit
 */
export const welcomeTourSteps = [
  // Step 1: Welcome to BarkBase
  {
    popover: {
      title: 'Welcome to BarkBase! 🐾',
      description:
        "We're excited to have you here! Let us show you around so you can get started quickly.",
      side: 'over',
      align: 'center',
    },
  },
  // Step 2: Point to the help button
  {
    element: '[data-tour="today-help-button"]',
    popover: {
      title: 'Page Tours Available',
      description:
        'Look for the "Start Page Tour" button on each page. Click it anytime for a guided tour of that page\'s features.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Welcome tour configuration
 */
export const welcomeTourConfig = {
  id: WELCOME_TOUR_ID,
  steps: welcomeTourSteps,
};

// ============================================================================
// TODAY DASHBOARD TOUR
// ============================================================================

/**
 * Tour step definitions for the Today dashboard
 *
 * Each step targets a specific element and provides
 * contextual information about that feature.
 */
export const todayTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="today-hero"]',
    popover: {
      title: 'Your Daily Command Center',
      description:
        "This is your operational hub for the day. Here you'll see at-a-glance stats, arrivals, departures, and tasks that need your attention.",
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 2: Stats Overview
  {
    element: '[data-tour="today-stats"]',
    popover: {
      title: 'Daily Statistics',
      description:
        'These cards show your key metrics for today: arriving pets, departing pets, currently in facility, and items needing attention. Click any card to jump to more details.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 3: Quick Actions
  {
    element: '[data-tour="today-new-booking"]',
    popover: {
      title: 'Quick Booking',
      description:
        'Need to add a last-minute boarding? Click here to create a new booking directly from the dashboard without navigating away.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 4: Arrivals List
  {
    element: '[data-tour="today-arrivals"]',
    popover: {
      title: "Today's Arrivals",
      description:
        "Pets scheduled to check in today appear here. You'll see pet names, owner info, and scheduled arrival times. Click any row to view booking details.",
      side: 'right',
      align: 'start',
    },
  },

  // Step 5: Departures List
  {
    element: '[data-tour="today-departures"]',
    popover: {
      title: "Today's Departures",
      description:
        "Pets going home today are listed here. Review pickup times and ensure all pets are ready. Click any row to view booking details and process checkout.",
      side: 'left',
      align: 'start',
    },
  },

  // Step 6: Tasks Section
  {
    element: '[data-tour="today-tasks"]',
    popover: {
      title: 'Task Management',
      description:
        "Keep track of daily tasks like feeding schedules, medication reminders, and grooming appointments. Overdue tasks are highlighted so nothing slips through the cracks.",
      side: 'top',
      align: 'center',
    },
  },

  // Step 7: Refresh & Last Updated
  {
    element: '[data-tour="today-refresh"]',
    popover: {
      title: 'Stay Up to Date',
      description:
        'Data refreshes automatically, but you can manually refresh anytime. The timestamp shows when data was last updated so you always know how current your view is.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Completion
  {
    element: '[data-tour="today-hero"]',
    popover: {
      title: "You're All Set!",
      description:
        "You now know your way around the Today dashboard. Check back here each morning to start your day organized. Click 'Done' to close this tour—you can replay it anytime from the help menu.",
      side: 'bottom',
      align: 'center',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const todayTourConfig = {
  id: TODAY_TOUR_ID,
  steps: todayTourSteps,
  onComplete: () => {
    console.log('Today tour completed');
  },
  onSkip: () => {
    console.log('Today tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getTodayTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return todayTourSteps;

  const stepMap = {
    welcome: 0,
    stats: 1,
    booking: 2,
    arrivals: 3,
    departures: 4,
    tasks: 5,
    refresh: 6,
    complete: 7,
  };

  return stepIds
    .map((id) => todayTourSteps[stepMap[id]])
    .filter(Boolean);
};

/**
 * Create a mini-tour for specific features
 */
export const createMiniTour = (featureId) => {
  const miniTours = {
    arrivals: {
      id: 'today-arrivals-mini',
      steps: [todayTourSteps[3]], // Just arrivals step
    },
    departures: {
      id: 'today-departures-mini',
      steps: [todayTourSteps[4]], // Just departures step
    },
    tasks: {
      id: 'today-tasks-mini',
      steps: [todayTourSteps[5]], // Just tasks step
    },
  };

  return miniTours[featureId] || null;
};

export default todayTourConfig;
