/**
 * Reports Page Tour Definition
 *
 * Product tour for the Reports & Analytics page.
 */

export const REPORTS_TOUR_ID = 'reports-page-v1';

export const reportsTourSteps = [
  {
    element: '[data-tour="reports-header"]',
    popover: {
      title: 'Reports & Analytics',
      description:
        'Your analytics command center. Monitor revenue, bookings, customer growth, and business performance all in one place.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-export"]',
    popover: {
      title: 'Export Data',
      description:
        'Download reports as CSV or PDF for offline analysis, team sharing, or accounting purposes.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="reports-date-filters"]',
    popover: {
      title: 'Date Range & Comparison',
      description:
        'Select a date range (today, this month, quarter, year) and compare against previous periods to track growth trends.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-tabs"]',
    popover: {
      title: 'Report Types',
      description:
        'Overview shows key metrics. Live Analytics tracks real-time activity. Scheduled lets you automate reports. Custom Builder creates tailored analytics.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-kpis"]',
    popover: {
      title: 'Key Performance Indicators',
      description:
        'Eight critical metrics: Revenue, Bookings, Customers, Growth, Average Value, Capacity Utilization, Top Service, and No-Shows. Trend indicators show period-over-period changes.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-charts"]',
    popover: {
      title: 'Trend Charts',
      description:
        'Visual breakdown of Revenue Trend, Bookings Trend, and Customer Growth. Adjust time ranges to see weekly, monthly, or quarterly patterns.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-services"]',
    popover: {
      title: 'Service Performance',
      description:
        'See how each service (Boarding, Daycare, Grooming, Training) contributes to your business. Identify your most and least popular offerings.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-utilization"]',
    popover: {
      title: 'Weekly Utilization',
      description:
        'Capacity heatmap showing busy vs slow days. Identify peak times to optimize staffing and spot opportunities to fill gaps.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-insights"]',
    popover: {
      title: 'Actionable Insights',
      description:
        'Highlights celebrate wins (revenue up, new customers). Opportunities flag areas to improve (low capacity, no-shows). Data-driven suggestions to grow your business.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="reports-help-button"]',
    popover: {
      title: 'Replay Tour',
      description: 'Click here anytime to replay this guided tour of the Reports page.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const reportsTourConfig = {
  id: REPORTS_TOUR_ID,
  steps: reportsTourSteps,
};

export default reportsTourConfig;
