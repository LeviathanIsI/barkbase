/**
 * Incidents Page Tour Definition
 *
 * Product tour for the Incident Reports page.
 */

export const INCIDENTS_TOUR_ID = 'incidents-page-v1';

export const incidentsTourSteps = [
  {
    element: '[data-tour="incidents-header"]',
    popover: {
      title: 'Incident Reports',
      description:
        'Document and track incidents for compliance and liability protection.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="incidents-report-button"]',
    popover: {
      title: 'Report Incident',
      description:
        'Create a new incident report. Document injuries, illnesses, bites, escapes, and more.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="incidents-filters"]',
    popover: {
      title: 'Filter Incidents',
      description:
        'Filter by status, severity, or incident type to find specific reports.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="incidents-list"]',
    popover: {
      title: 'Incident List',
      description:
        'View all incidents with severity, status, and details. Click to view full report.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="incidents-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const incidentsTourConfig = {
  id: INCIDENTS_TOUR_ID,
  steps: incidentsTourSteps,
};

export default incidentsTourConfig;
