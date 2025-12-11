/**
 * Operations Page Tour Definition
 *
 * Product tour for the Operations Command Console.
 */

export const OPERATIONS_TOUR_ID = 'operations-page-v1';

export const operationsTourSteps = [
  {
    element: '[data-tour="operations-header"]',
    popover: {
      title: 'Operations Command Console',
      description:
        'Your high-level operational overview. Monitor arrivals, departures, staff, and facility status.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-kpis"]',
    popover: {
      title: 'Key Metrics',
      description:
        'Quick view of arrivals, departures, occupancy, and staff on duty. Click any tile to see details.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-arrivals"]',
    popover: {
      title: 'Arrivals & Departures',
      description:
        'Today\'s check-ins and check-outs. Switch between timeline and list views.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-staff"]',
    popover: {
      title: 'Staff & Time Clock',
      description:
        'See who\'s on duty, on break, and track productivity. Manage schedules from here.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-tasks"]',
    popover: {
      title: 'Tasks & Alerts',
      description:
        'Monitor overdue tasks, medication reminders, and urgent items needing attention.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-utilization"]',
    popover: {
      title: 'Facility Utilization',
      description:
        '7-day forecast of kennel occupancy. Plan ahead for busy periods.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-bookings"]',
    popover: {
      title: 'Upcoming Bookings',
      description:
        'See booking trends by service type for the week ahead.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="operations-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const operationsTourConfig = {
  id: OPERATIONS_TOUR_ID,
  steps: operationsTourSteps,
};

export default operationsTourConfig;
