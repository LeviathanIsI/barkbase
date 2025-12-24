/**
 * Payments Page Tour Definition
 *
 * Product tour for the Payments financial command center.
 */

export const PAYMENTS_TOUR_ID = 'payments-page-v1';

export const paymentsTourSteps = [
  {
    element: '[data-tour="payments-header"]',
    popover: {
      title: 'Payments',
      description:
        'Your financial command center. Track revenue, manage transactions, and monitor payment health.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-tabs"]',
    popover: {
      title: 'Navigation Tabs',
      description:
        'Switch between Overview, Analytics, Outstanding balances, and Settings views.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-record"]',
    popover: {
      title: 'Record Payment',
      description:
        'Manually record cash, check, or other payments received outside of card processing.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="payments-kpis"]',
    popover: {
      title: 'Key Metrics',
      description:
        'At-a-glance view of revenue collected, processed payments, pending amounts, and payouts.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-processor"]',
    popover: {
      title: 'Payment Processor',
      description:
        'See your Stripe connection status, processing rates, and manage your payment gateway.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-filters"]',
    popover: {
      title: 'Search & Filters',
      description:
        'Search transactions, filter by status or payment method, and export data.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-transactions"]',
    popover: {
      title: 'Transactions Table',
      description:
        'View all payment transactions. Click any row to see details, send receipts, or process refunds.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="payments-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const paymentsTourConfig = {
  id: PAYMENTS_TOUR_ID,
  steps: paymentsTourSteps,
};

export default paymentsTourConfig;
