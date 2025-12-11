/**
 * Bookings Page Tour Definition
 *
 * Product tour for the Bookings & Availability page.
 * Highlights key features for managing reservations,
 * run capacity, and facility utilization.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const BOOKINGS_TOUR_ID = 'bookings-page-v1';

// ============================================================================
// BOOKINGS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Bookings page
 */
export const bookingsTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="bookings-header"]',
    popover: {
      title: 'Bookings & Availability',
      description:
        'Manage all reservations, check run capacity, and track facility utilization from this central hub.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: View Mode Toggle
  {
    element: '[data-tour="bookings-view-toggle"]',
    popover: {
      title: 'View Modes',
      description:
        'Switch between Run Board (visual grid showing runs and dates) and List View (table of all bookings).',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 3: New Booking
  {
    element: '[data-tour="bookings-new"]',
    popover: {
      title: 'Create Booking',
      description:
        'Start a new reservation. The booking wizard guides you through selecting a pet, service, dates, and run assignment.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 4: Period Toggle
  {
    element: '[data-tour="bookings-period"]',
    popover: {
      title: 'Time Period',
      description:
        'Switch between Day, Week, or Month views. Each shows bookings for that time period.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 5: Date Navigation
  {
    element: '[data-tour="bookings-date-nav"]',
    popover: {
      title: 'Navigate Dates',
      description:
        'Use the arrows to move forward or back in time. Click "Today" to jump to the current date.',
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 6: Search
  {
    element: '[data-tour="bookings-search"]',
    popover: {
      title: 'Search Bookings',
      description:
        'Find bookings by pet name or owner name. Results filter instantly as you type.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 7: Help Button
  {
    element: '[data-tour="bookings-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description:
        'Click here anytime to replay this guided tour and learn about the Bookings features.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Run Board
  {
    element: '[data-tour="bookings-content"]',
    popover: {
      title: 'Run Board / Bookings',
      description:
        'The main view shows runs/rooms on the left and dates across the top. Click any booking to see details, or click empty cells to create new bookings.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 9: Completion
  {
    element: '[data-tour="bookings-header"]',
    popover: {
      title: "You're All Set!",
      description:
        'You now know how to manage bookings. Use the Run Board for visual scheduling or List View for detailed records.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const bookingsTourConfig = {
  id: BOOKINGS_TOUR_ID,
  steps: bookingsTourSteps,
  onComplete: () => {
    console.log('Bookings tour completed');
  },
  onSkip: () => {
    console.log('Bookings tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getBookingsTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return bookingsTourSteps;

  const stepMap = {
    header: 0,
    viewToggle: 1,
    newBooking: 2,
    period: 3,
    dateNav: 4,
    search: 5,
    help: 6,
    content: 7,
    complete: 8,
  };

  return stepIds
    .map((id) => bookingsTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default bookingsTourConfig;
