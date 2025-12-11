/**
 * Packages Page Tour Definition
 *
 * Product tour for the Prepaid Packages page.
 */

export const PACKAGES_TOUR_ID = 'packages-page-v1';

export const packagesTourSteps = [
  {
    element: '[data-tour="packages-header"]',
    popover: {
      title: 'Prepaid Packages',
      description:
        'Manage prepaid service packages. Offer discounts for bulk purchases and track credit usage.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="packages-new"]',
    popover: {
      title: 'New Package',
      description:
        'Create a new prepaid package for a customer with bundled services at a discount.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="packages-grid"]',
    popover: {
      title: 'Package Cards',
      description:
        'View all active packages. Each card shows credits remaining, expiration date, and owner details.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="packages-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const packagesTourConfig = {
  id: PACKAGES_TOUR_ID,
  steps: packagesTourSteps,
};

export default packagesTourConfig;
