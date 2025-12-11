/**
 * Pets Page Tour Definition
 *
 * Product tour for the Pets Directory page.
 * Highlights key features for managing pet records,
 * vaccinations, and pet information.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const PETS_TOUR_ID = 'pets-page-v1';

// ============================================================================
// PETS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Pets page
 */
export const petsTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="pets-header"]',
    popover: {
      title: 'Pets Directory',
      description:
        'This is your central hub for all pet records. View profiles, track vaccinations, and manage pet information.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Stats Overview
  {
    element: '[data-tour="pets-stats"]',
    popover: {
      title: 'Pet Statistics',
      description:
        'Quick overview of your pet population: total count, active pets, species breakdown, and vaccination alerts.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 3: Search
  {
    element: '[data-tour="pets-search"]',
    popover: {
      title: 'Search Pets',
      description:
        "Find any pet by name, breed, species, or owner name. Results filter instantly as you type.",
      side: 'bottom',
      align: 'center',
    },
  },

  // Step 4: Filters
  {
    element: '[data-tour="pets-filters"]',
    popover: {
      title: 'Advanced Filters',
      description:
        'Filter by status, species, or vaccination status. Combine multiple filters to find exactly what you need.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 5: Quick Filters
  {
    element: '[data-tour="pets-quick-filters"]',
    popover: {
      title: 'Quick Filters',
      description:
        'Use these dropdowns to quickly filter by species or status without opening the filter panel.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 6: Saved Views
  {
    element: '[data-tour="pets-views"]',
    popover: {
      title: 'Saved Views',
      description:
        'Switch between preset views like "Active Pets", "Dogs Only", or "Expiring Vaccines" for quick access.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 7: Column Controls
  {
    element: '[data-tour="pets-columns"]',
    popover: {
      title: 'Customize Columns',
      description:
        'Show or hide columns and drag to reorder. Your preferences are saved automatically.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 8: Add Pet
  {
    element: '[data-tour="pets-add"]',
    popover: {
      title: 'Add New Pet',
      description:
        'Register a new pet with their details, medical info, and link them to an owner.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 9: Pet Table
  {
    element: '[data-tour="pets-table"]',
    popover: {
      title: 'Pet List',
      description:
        'Browse all pets with sortable columns. Click a pet name to view their full profile. Some fields can be edited inline by clicking on them.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 10: Vaccination Status
  {
    element: '[data-tour="pets-vaccination-badge"]',
    popover: {
      title: 'Vaccination Tracking',
      description:
        'Vaccination badges show status at a glance: green for current, yellow for expiring soon, red for missing.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 11: Pagination
  {
    element: '[data-tour="pets-pagination"]',
    popover: {
      title: 'Navigate Results',
      description:
        'Browse through your pet list and adjust how many pets to show per page.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 12: Completion
  {
    element: '[data-tour="pets-header"]',
    popover: {
      title: "You're All Set!",
      description:
        "You now know how to manage your pets directory. Click any pet's name to view their detailed profile.",
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const petsTourConfig = {
  id: PETS_TOUR_ID,
  steps: petsTourSteps,
  onComplete: () => {
    console.log('Pets tour completed');
  },
  onSkip: () => {
    console.log('Pets tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getPetsTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return petsTourSteps;

  const stepMap = {
    header: 0,
    stats: 1,
    search: 2,
    filters: 3,
    quickFilters: 4,
    views: 5,
    columns: 6,
    add: 7,
    table: 8,
    vaccination: 9,
    pagination: 10,
    complete: 11,
  };

  return stepIds
    .map((id) => petsTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default petsTourConfig;
