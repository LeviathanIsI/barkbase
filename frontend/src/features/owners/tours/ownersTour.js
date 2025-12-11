/**
 * Owners Page Tour Definition
 *
 * Product tour for the Pet Owners management page.
 * Highlights key features for managing client relationships,
 * filtering, and viewing owner details.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const OWNERS_TOUR_ID = 'owners-page-v1';

// ============================================================================
// OWNERS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Owners page
 *
 * Each step targets a specific element and provides
 * contextual information about that feature.
 */
export const ownersTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="owners-header"]',
    popover: {
      title: 'Pet Owners Directory',
      description:
        'This is your client management hub. View all pet owners, track their activity, and manage relationships from one place.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Stats Overview
  {
    element: '[data-tour="owners-stats"]',
    popover: {
      title: 'Quick Stats',
      description:
        'Get an at-a-glance view of your client base: total owners, active clients, high-value customers, and total revenue.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 3: Search
  {
    element: '[data-tour="owners-search"]',
    popover: {
      title: 'Search Owners',
      description:
        "Quickly find any owner by name, email, phone, or even their pet's name. Results update as you type.",
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 4: Filters
  {
    element: '[data-tour="owners-filters"]',
    popover: {
      title: 'Filter Your List',
      description:
        'Use filters to narrow down owners by status, minimum pet count, or lifetime value. Great for targeted outreach.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 5: Saved Views
  {
    element: '[data-tour="owners-views"]',
    popover: {
      title: 'Saved Views',
      description:
        'Switch between preset views like "Active Clients" or "High Value" to quickly segment your customer base.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 6: Column Controls
  {
    element: '[data-tour="owners-columns"]',
    popover: {
      title: 'Customize Columns',
      description:
        'Show or hide columns to focus on the data you need. Drag to reorder columns. Your preferences are saved automatically.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 7: Export
  {
    element: '[data-tour="owners-export"]',
    popover: {
      title: 'Export Data',
      description:
        'Download your owner list as a CSV or Excel file for external use, reporting, or backup purposes.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Add Owner
  {
    element: '[data-tour="owners-add"]',
    popover: {
      title: 'Add New Owner',
      description:
        'Click here to register a new pet owner. You can add their contact info, notes, and link pets to their profile.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 9: Owner Table
  {
    element: '[data-tour="owners-table"]',
    popover: {
      title: 'Owner List',
      description:
        'Browse all owners in a sortable table. Click column headers to sort. Select multiple owners for bulk actions like email or SMS.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 10: Row Actions
  {
    element: '[data-tour="owners-row-actions"]',
    popover: {
      title: 'Quick Actions',
      description:
        'Hover over any row to see quick actions: view profile, send a message, or access more options.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 11: Pagination
  {
    element: '[data-tour="owners-pagination"]',
    popover: {
      title: 'Navigate Results',
      description:
        'Use pagination to browse through large lists. Adjust rows per page to see more or fewer results at once.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 12: Completion
  {
    element: '[data-tour="owners-header"]',
    popover: {
      title: "You're Ready!",
      description:
        "You now know how to manage your pet owners. Click on any owner's name to view their full profile and booking history.",
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const ownersTourConfig = {
  id: OWNERS_TOUR_ID,
  steps: ownersTourSteps,
  onComplete: () => {
    console.log('Owners tour completed');
  },
  onSkip: () => {
    console.log('Owners tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getOwnersTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return ownersTourSteps;

  const stepMap = {
    header: 0,
    stats: 1,
    search: 2,
    filters: 3,
    views: 4,
    columns: 5,
    export: 6,
    add: 7,
    table: 8,
    actions: 9,
    pagination: 10,
    complete: 11,
  };

  return stepIds
    .map((id) => ownersTourSteps[stepMap[id]])
    .filter(Boolean);
};

/**
 * Create a mini-tour for specific features
 */
export const createMiniTour = (featureId) => {
  const miniTours = {
    search: {
      id: 'owners-search-mini',
      steps: [ownersTourSteps[2]], // Just search step
    },
    filters: {
      id: 'owners-filters-mini',
      steps: [ownersTourSteps[3], ownersTourSteps[4]], // Filters and views
    },
    table: {
      id: 'owners-table-mini',
      steps: [ownersTourSteps[8], ownersTourSteps[9]], // Table and actions
    },
  };

  return miniTours[featureId] || null;
};

export default ownersTourConfig;
