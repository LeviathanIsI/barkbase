/**
 * Staff/Team Page Tour Definition
 *
 * Product tour for the Team Management page.
 */

export const STAFF_TOUR_ID = 'staff-page-v1';

export const staffTourSteps = [
  {
    element: '[data-tour="staff-header"]',
    popover: {
      title: 'Team Management',
      description:
        'Your workforce command center. Manage staff, schedules, tasks, and performance all in one place.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="staff-add"]',
    popover: {
      title: 'Add Staff',
      description:
        'Add new team members with role assignments, permissions, and availability settings.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="staff-tabs"]',
    popover: {
      title: 'Management Tabs',
      description:
        'Switch between Overview, Schedule, Tasks, Time Clock, Reviews, Messages, and Analytics.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="staff-kpis"]',
    popover: {
      title: 'Team Metrics',
      description:
        'Quick view of total staff, who\'s clocked in, on schedule, and utilization rates.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="staff-filters"]',
    popover: {
      title: 'Search & Filters',
      description:
        'Search staff by name or email. Filter by status and role to find team members quickly.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="staff-grid"]',
    popover: {
      title: 'Staff Directory',
      description:
        'View all team members with their status, contact info, and quick action buttons.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="staff-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const staffTourConfig = {
  id: STAFF_TOUR_ID,
  steps: staffTourSteps,
};

export default staffTourConfig;
