/**
 * Vaccinations Page Tour Definition
 *
 * Product tour for the Vaccinations page.
 * Highlights key features for monitoring vaccination status,
 * filtering records, and managing pet vaccinations.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const VACCINATIONS_TOUR_ID = 'vaccinations-page-v1';

// ============================================================================
// VACCINATIONS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Vaccinations page
 */
export const vaccinationsTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="vaccinations-header"]',
    popover: {
      title: 'Vaccinations Dashboard',
      description:
        'Monitor vaccination status across all pets. Track expiring, critical, and overdue vaccinations in one place.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Stats Overview
  {
    element: '[data-tour="vaccinations-stats"]',
    popover: {
      title: 'Status Overview',
      description:
        'See vaccination status at a glance: total records, overdue, critical (7 days), expiring (30 days), and current. Click any badge to filter.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 3: Filters
  {
    element: '[data-tour="vaccinations-filters"]',
    popover: {
      title: 'Advanced Filters',
      description:
        'Filter by vaccine type, species, status, or date range. Combine multiple filters to find exactly what you need.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 4: Saved Views
  {
    element: '[data-tour="vaccinations-views"]',
    popover: {
      title: 'Saved Views',
      description:
        'Quick access to preset views: "Overdue", "Expiring in 7 Days", or filter by specific vaccine types like Rabies or DAPP.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 5: Search
  {
    element: '[data-tour="vaccinations-search"]',
    popover: {
      title: 'Search Records',
      description:
        'Search by pet name, owner name, email, or vaccine type. Results filter instantly as you type.',
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 6: View Mode
  {
    element: '[data-tour="vaccinations-view-mode"]',
    popover: {
      title: 'View Mode',
      description:
        'Toggle between compact and expanded views. Compact shows essential info, expanded shows full details including owner contact.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 7: Export
  {
    element: '[data-tour="vaccinations-export"]',
    popover: {
      title: 'Export Records',
      description:
        'Download all vaccination records as a CSV file. You can also export just selected records using bulk actions.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Sort Controls
  {
    element: '[data-tour="vaccinations-sort"]',
    popover: {
      title: 'Sort Records',
      description:
        'Sort by expiry date, pet name, owner name, or vaccine type. Default shows soonest expiry first.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 9: Vaccination List
  {
    element: '[data-tour="vaccinations-list"]',
    popover: {
      title: 'Vaccination Records',
      description:
        'Each row shows pet info, vaccine type, expiry date, and owner details. Color-coded icons indicate status urgency.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 10: Bulk Actions
  {
    element: '[data-tour="vaccinations-select-all"]',
    popover: {
      title: 'Bulk Selection',
      description:
        'Select multiple records to email owners, export selected, or mark as reviewed. Use the checkbox to select all on the current page.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 11: Pagination
  {
    element: '[data-tour="vaccinations-pagination"]',
    popover: {
      title: 'Navigate Results',
      description:
        'Browse through vaccination records and adjust how many to show per page (25, 50, or 100).',
      side: 'top',
      align: 'center',
    },
  },

  // Step 12: Completion
  {
    element: '[data-tour="vaccinations-header"]',
    popover: {
      title: "You're All Set!",
      description:
        'You now know how to manage vaccinations. Click any pet name to view their full profile and add or update vaccines.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const vaccinationsTourConfig = {
  id: VACCINATIONS_TOUR_ID,
  steps: vaccinationsTourSteps,
  onComplete: () => {
    console.log('Vaccinations tour completed');
  },
  onSkip: () => {
    console.log('Vaccinations tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getVaccinationsTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return vaccinationsTourSteps;

  const stepMap = {
    header: 0,
    stats: 1,
    filters: 2,
    views: 3,
    search: 4,
    viewMode: 5,
    export: 6,
    sort: 7,
    list: 8,
    selectAll: 9,
    pagination: 10,
    complete: 11,
  };

  return stepIds
    .map((id) => vaccinationsTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default vaccinationsTourConfig;
