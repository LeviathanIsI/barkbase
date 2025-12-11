/**
 * Run Assignment Page Tour Definition
 *
 * Product tour for the Run Assignment page.
 * Highlights key features for assigning pets
 * to daycare runs with drag-and-drop.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const RUNS_TOUR_ID = 'runs-page-v1';

// ============================================================================
// RUNS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Run Assignment page
 */
export const runsTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="runs-header"]',
    popover: {
      title: 'Run Assignment',
      description:
        'Assign checked-in pets to daycare runs using drag-and-drop. Organize your facility and manage time slots efficiently.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Date Navigation
  {
    element: '[data-tour="runs-date-nav"]',
    popover: {
      title: 'Date Navigation',
      description:
        'Navigate between days to view or plan assignments. Click "Today" to jump back to the current date.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 3: Actions
  {
    element: '[data-tour="runs-actions"]',
    popover: {
      title: 'Quick Actions',
      description:
        'Print run sheets for staff, or save your assignments when you\'re done making changes.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 4: Unassigned Pets
  {
    element: '[data-tour="runs-unassigned"]',
    popover: {
      title: 'Unassigned Pets',
      description:
        'Checked-in pets waiting to be assigned appear here. Drag them to a run column, or select multiple and assign together.',
      side: 'right',
      align: 'start',
    },
  },

  // Step 5: Run Columns
  {
    element: '[data-tour="runs-columns"]',
    popover: {
      title: 'Run Columns',
      description:
        'Each column represents a run/room. Drop pets here to assign them. The capacity badge shows current utilization.',
      side: 'left',
      align: 'start',
    },
  },

  // Step 6: Help Button
  {
    element: '[data-tour="runs-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description:
        'Click here anytime to replay this guided tour and learn about the Run Assignment features.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 7: Completion
  {
    element: '[data-tour="runs-header"]',
    popover: {
      title: "You're All Set!",
      description:
        'You now know how to assign pets to runs. Drag pets between columns, set time slots, and save your work when done.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const runsTourConfig = {
  id: RUNS_TOUR_ID,
  steps: runsTourSteps,
  onComplete: () => {
    console.log('Runs tour completed');
  },
  onSkip: () => {
    console.log('Runs tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getRunsTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return runsTourSteps;

  const stepMap = {
    header: 0,
    dateNav: 1,
    actions: 2,
    unassigned: 3,
    columns: 4,
    help: 5,
    complete: 6,
  };

  return stepIds
    .map((id) => runsTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default runsTourConfig;
