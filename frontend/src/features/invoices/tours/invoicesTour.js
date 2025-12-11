/**
 * Invoices Page Tour Definition
 *
 * Product tour for the Invoices billing command center.
 */

export const INVOICES_TOUR_ID = 'invoices-page-v1';

export const invoicesTourSteps = [
  {
    element: '[data-tour="invoices-header"]',
    popover: {
      title: 'Invoices',
      description:
        'Your billing command center. Create, send, and track invoices for your customers.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="invoices-create"]',
    popover: {
      title: 'Create Invoice',
      description:
        'Create a new invoice manually or generate one from completed bookings.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="invoices-kpis"]',
    popover: {
      title: 'Invoice Status Overview',
      description:
        'Quick view of draft, finalized, paid, and overdue invoices. Click any tile to filter the list.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="invoices-tabs"]',
    popover: {
      title: 'Status Tabs',
      description:
        'Filter invoices by status - All, Draft, Sent, Paid, Overdue, and more.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="invoices-filters"]',
    popover: {
      title: 'Search & Filters',
      description:
        'Search by invoice number, customer name, or email. Filter by date range and export data.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="invoices-table"]',
    popover: {
      title: 'Invoice List',
      description:
        'View all invoices with status, amount, and due dates. Click any row to see details and actions.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="invoices-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const invoicesTourConfig = {
  id: INVOICES_TOUR_ID,
  steps: invoicesTourSteps,
};

export default invoicesTourConfig;
