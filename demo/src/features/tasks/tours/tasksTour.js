/**
 * Tasks Page Tour Definition
 *
 * Product tour for the Tasks & Reminders page.
 */

export const TASKS_TOUR_ID = 'tasks-page-v1';

export const tasksTourSteps = [
  {
    element: '[data-tour="tasks-header"]',
    popover: {
      title: 'Tasks & Reminders',
      description:
        'Manage daily tasks like feeding, medication, grooming, and exercise. Track what needs to be done and mark tasks complete.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-date-picker"]',
    popover: {
      title: 'Date Selection',
      description: 'Select a date to view tasks scheduled for that day.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-new-button"]',
    popover: {
      title: 'Create New Task',
      description:
        'Create a new task. Assign it to a pet, set the due time and priority.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="tasks-category-filters"]',
    popover: {
      title: 'Filter by Category',
      description:
        'Filter tasks by type: Feeding, Medication, Grooming, Exercise, or Checkup.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-toolbar"]',
    popover: {
      title: 'Sort & Filter',
      description:
        'Sort by due time, priority, or category. Use quick filters for overdue tasks.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-task-card"]',
    popover: {
      title: 'Task Card',
      description:
        'Each task shows type, priority, due time, and related pet. Click the circle to mark complete.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-completed"]',
    popover: {
      title: 'Completed Today',
      description:
        'Tasks you\'ve completed today appear here. Expand to review what\'s been done.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="tasks-help-button"]',
    popover: {
      title: 'Start Page Tour',
      description: 'Click here anytime to replay this guided tour.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const tasksTourConfig = {
  id: TASKS_TOUR_ID,
  steps: tasksTourSteps,
};

export default tasksTourConfig;
