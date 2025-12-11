/**
 * Segments Page Tour Definition
 *
 * Product tour for the Customer Segments page.
 * Highlights key features for creating and managing
 * customer segments for targeted marketing.
 */

// ============================================================================
// TOUR CONFIGURATION
// ============================================================================

export const SEGMENTS_TOUR_ID = 'segments-page-v1';

// ============================================================================
// SEGMENTS PAGE TOUR
// ============================================================================

/**
 * Tour step definitions for the Segments page
 */
export const segmentsTourSteps = [
  // Step 1: Welcome / Overview
  {
    element: '[data-tour="segments-header"]',
    popover: {
      title: 'Customer Segments',
      description:
        'Group customers for targeted marketing and personalized service. Create segments based on behavior, preferences, or custom criteria.',
      side: 'bottom',
      align: 'start',
    },
  },

  // Step 2: Refresh Auto Segments
  {
    element: '[data-tour="segments-refresh"]',
    popover: {
      title: 'Refresh Auto Segments',
      description:
        'Automatic segments update their membership based on rules you define. Click refresh to update all auto segments with the latest data.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 3: Create Segment
  {
    element: '[data-tour="segments-create"]',
    popover: {
      title: 'Create Segment',
      description:
        'Create a new customer segment. You can build manual segments by selecting specific customers, or automatic segments that update based on criteria.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 4: Page Tour Button
  {
    element: '[data-tour="segments-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description:
        'Click here anytime to replay this guided tour and learn about the Segments features.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Step 5: Segment Cards
  {
    element: '[data-tour="segments-list"]',
    popover: {
      title: 'Your Segments',
      description:
        'Each card shows a segment with its member count, type (manual or auto), and status. Click to view members or edit the segment.',
      side: 'top',
      align: 'center',
    },
  },

  // Step 6: Segment Actions
  {
    element: '[data-tour="segments-card-actions"]',
    popover: {
      title: 'Segment Actions',
      description:
        'View the members in a segment, edit its settings, or delete it. Segments can be used in email campaigns and SMS broadcasts.',
      side: 'left',
      align: 'center',
    },
  },

  // Step 7: Completion
  {
    element: '[data-tour="segments-header"]',
    popover: {
      title: "You're All Set!",
      description:
        'You now know how to create and manage customer segments. Use segments to send targeted communications and track customer groups.',
      side: 'bottom',
      align: 'start',
    },
  },
];

/**
 * Complete tour configuration object
 */
export const segmentsTourConfig = {
  id: SEGMENTS_TOUR_ID,
  steps: segmentsTourSteps,
  onComplete: () => {
    console.log('Segments tour completed');
  },
  onSkip: () => {
    console.log('Segments tour skipped');
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of tour steps (useful for mini-tours)
 */
export const getSegmentsTourSteps = (stepIds) => {
  if (!stepIds || !stepIds.length) return segmentsTourSteps;

  const stepMap = {
    header: 0,
    refresh: 1,
    create: 2,
    help: 3,
    list: 4,
    actions: 5,
    complete: 6,
  };

  return stepIds
    .map((id) => segmentsTourSteps[stepMap[id]])
    .filter(Boolean);
};

export default segmentsTourConfig;
