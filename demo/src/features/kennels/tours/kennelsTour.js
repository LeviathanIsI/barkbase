/**
 * Kennels Page Tour Definition
 *
 * Product tour for the Kennel Management page.
 */

export const KENNELS_TOUR_ID = 'kennels-page-v1';

export const kennelsTourSteps = [
  {
    element: '[data-tour="kennels-header"]',
    popover: {
      title: 'Kennel Management',
      description:
        'Manage your facility accommodations, track capacity, and assign pets to kennels.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="kennels-add-button"]',
    popover: {
      title: 'Add Kennel',
      description: 'Create a new kennel, suite, cabin, or daycare space.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="kennels-stats"]',
    popover: {
      title: 'Quick Stats',
      description:
        'View totals at a glance. Click a stat to filter kennels by that criteria.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="kennels-filters"]',
    popover: {
      title: 'Search & Filter',
      description:
        'Search by name or building, filter by status or type, and group kennels.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="kennels-grid"]',
    popover: {
      title: 'Kennel Cards',
      description:
        'Each card shows kennel details, capacity, and availability. Use the menu for actions.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="kennels-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const kennelsTourConfig = {
  id: KENNELS_TOUR_ID,
  steps: kennelsTourSteps,
};

export default kennelsTourConfig;
