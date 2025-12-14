/**
 * Workflows Constants
 * BarkBase workflow automation system constants and configuration
 */

// Step types for workflow builder
export const STEP_TYPES = {
  ACTION: 'action',
  WAIT: 'wait',
  DETERMINATOR: 'determinator',
  GATE: 'gate',
  TERMINUS: 'terminus',
};

// Action types available in workflows
export const ACTION_TYPES = {
  SEND_SMS: 'send_sms',
  SEND_EMAIL: 'send_email',
  SEND_NOTIFICATION: 'send_notification',
  CREATE_TASK: 'create_task',
  UPDATE_FIELD: 'update_field',
  ADD_TO_SEGMENT: 'add_to_segment',
  REMOVE_FROM_SEGMENT: 'remove_from_segment',
  ENROLL_IN_WORKFLOW: 'enroll_in_workflow',
  UNENROLL_FROM_WORKFLOW: 'unenroll_from_workflow',
  WEBHOOK: 'webhook',
};

// Object types that workflows can operate on
export const OBJECT_TYPES = {
  PET: 'pet',
  BOOKING: 'booking',
  OWNER: 'owner',
  PAYMENT: 'payment',
  TASK: 'task',
  INVOICE: 'invoice',
};

// Object type display configuration
export const OBJECT_TYPE_CONFIG = {
  pet: {
    label: 'Pet',
    pluralLabel: 'Pets',
    icon: 'paw-print',
    color: '#10B981',
  },
  booking: {
    label: 'Booking',
    pluralLabel: 'Bookings',
    icon: 'calendar',
    color: '#3B82F6',
  },
  owner: {
    label: 'Owner',
    pluralLabel: 'Owners',
    icon: 'user',
    color: '#8B5CF6',
  },
  payment: {
    label: 'Payment',
    pluralLabel: 'Payments',
    icon: 'credit-card',
    color: '#F59E0B',
  },
  task: {
    label: 'Task',
    pluralLabel: 'Tasks',
    icon: 'check-square',
    color: '#EF4444',
  },
  invoice: {
    label: 'Invoice',
    pluralLabel: 'Invoices',
    icon: 'file-text',
    color: '#06B6D4',
  },
};

// Entry condition trigger types
export const TRIGGER_TYPES = {
  MANUAL: 'manual',
  FILTER_CRITERIA: 'filter_criteria',
  SCHEDULE: 'schedule',
  EVENT: 'event',
};

// Trigger type display configuration
export const TRIGGER_TYPE_CONFIG = {
  manual: {
    label: 'Trigger manually',
    description: 'Manually add records to this workflow',
    icon: 'hand',
  },
  filter_criteria: {
    label: 'Met filter criteria',
    description: 'Automatically enroll when records match conditions',
    icon: 'filter',
  },
  schedule: {
    label: 'On a schedule',
    description: 'Run workflow at specific times',
    icon: 'clock',
  },
  event: {
    label: 'Event-based',
    description: 'Trigger when specific events occur',
    icon: 'zap',
  },
};

// Event categories and events by object type
export const TRIGGER_EVENT_CATEGORIES = {
  booking: {
    label: 'Bookings',
    description: 'When bookings are created, modified, or status changes',
    icon: 'calendar',
    events: [
      { value: 'booking.created', label: 'Booking created' },
      { value: 'booking.confirmed', label: 'Booking confirmed' },
      { value: 'booking.cancelled', label: 'Booking cancelled' },
      { value: 'booking.modified', label: 'Booking modified' },
      { value: 'booking.checked_in', label: 'Pet checked in' },
      { value: 'booking.checked_out', label: 'Pet checked out' },
    ],
  },
  pet: {
    label: 'Pets',
    description: 'When pet records are created or updated',
    icon: 'paw-print',
    events: [
      { value: 'pet.created', label: 'Pet created' },
      { value: 'pet.updated', label: 'Pet updated' },
      { value: 'pet.vaccination_expiring', label: 'Vaccination expiring soon' },
      { value: 'pet.vaccination_expired', label: 'Vaccination expired' },
      { value: 'pet.birthday', label: 'Pet birthday' },
    ],
  },
  owner: {
    label: 'Owners',
    description: 'When owner records are created or updated',
    icon: 'user',
    events: [
      { value: 'owner.created', label: 'Owner created' },
      { value: 'owner.updated', label: 'Owner updated' },
      { value: 'owner.first_booking', label: 'First booking completed' },
    ],
  },
  payment: {
    label: 'Payments',
    description: 'When payment events occur',
    icon: 'credit-card',
    events: [
      { value: 'payment.received', label: 'Payment received' },
      { value: 'payment.failed', label: 'Payment failed' },
    ],
  },
  invoice: {
    label: 'Invoices',
    description: 'When invoice events occur',
    icon: 'file-text',
    events: [
      { value: 'invoice.created', label: 'Invoice created' },
      { value: 'invoice.overdue', label: 'Invoice overdue' },
    ],
  },
  task: {
    label: 'Tasks',
    description: 'When task events occur',
    icon: 'check-square',
    events: [
      { value: 'task.created', label: 'Task created' },
      { value: 'task.completed', label: 'Task completed' },
      { value: 'task.overdue', label: 'Task overdue' },
    ],
  },
};

// Action categories for the left panel
export const ACTION_CATEGORIES = {
  communication: {
    label: 'Communication',
    icon: 'message-square',
    actions: [
      {
        type: 'send_sms',
        label: 'Send SMS',
        description: 'Send a text message',
        icon: 'smartphone',
      },
      {
        type: 'send_email',
        label: 'Send email',
        description: 'Send an email message',
        icon: 'mail',
      },
      {
        type: 'send_notification',
        label: 'Send notification',
        description: 'Send an in-app notification',
        icon: 'bell',
      },
    ],
  },
  records: {
    label: 'Records',
    icon: 'database',
    actions: [
      {
        type: 'create_task',
        label: 'Create task',
        description: 'Create a new task',
        icon: 'check-square',
      },
      {
        type: 'update_field',
        label: 'Update field',
        description: 'Update a field value',
        icon: 'edit-3',
      },
      {
        type: 'add_to_segment',
        label: 'Add to segment',
        description: 'Add record to a segment',
        icon: 'user-plus',
      },
      {
        type: 'remove_from_segment',
        label: 'Remove from segment',
        description: 'Remove record from a segment',
        icon: 'user-minus',
      },
    ],
  },
  workflow: {
    label: 'Workflow',
    icon: 'git-branch',
    actions: [
      {
        type: 'enroll_in_workflow',
        label: 'Enroll in workflow',
        description: 'Enroll in another workflow',
        icon: 'log-in',
      },
      {
        type: 'unenroll_from_workflow',
        label: 'Unenroll from workflow',
        description: 'Remove from other workflows',
        icon: 'log-out',
      },
    ],
  },
  flow_control: {
    label: 'Flow Control',
    icon: 'shuffle',
    actions: [
      {
        type: 'wait',
        stepType: 'wait',
        label: 'Wait',
        description: 'Add a delay',
        icon: 'clock',
      },
      {
        type: 'determinator',
        stepType: 'determinator',
        label: 'Determinator',
        description: 'If/then branch',
        icon: 'git-branch',
      },
      {
        type: 'gate',
        stepType: 'gate',
        label: 'Gate',
        description: 'Continue or stop',
        icon: 'shield',
      },
      {
        type: 'terminus',
        stepType: 'terminus',
        label: 'End workflow',
        description: 'End this branch',
        icon: 'square',
      },
    ],
  },
  external: {
    label: 'External',
    icon: 'globe',
    actions: [
      {
        type: 'webhook',
        label: 'Webhook',
        description: 'Call external URL',
        icon: 'send',
      },
    ],
  },
};

// Wait step configuration options
export const WAIT_TYPES = {
  DURATION: 'duration',
  DATE_FIELD: 'date_field',
  TIME_OF_DAY: 'time_of_day',
  EVENT: 'event',
};

export const WAIT_TYPE_CONFIG = {
  duration: {
    label: 'For a set amount of time',
    description: 'Wait for a specific duration',
  },
  date_field: {
    label: 'Until a date from a field',
    description: 'Wait until a date stored in a record field',
  },
  time_of_day: {
    label: 'Until a specific time',
    description: 'Wait until a specific time of day',
  },
  event: {
    label: 'Until an event happens',
    description: 'Wait until a specific event occurs',
  },
};

export const DURATION_UNITS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
];

// Workflow status options
export const WORKFLOW_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
};

export const WORKFLOW_STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
  active: {
    label: 'On',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  paused: {
    label: 'Off',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
};

// Execution status options
export const EXECUTION_STATUSES = {
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const EXECUTION_STATUS_CONFIG = {
  running: {
    label: 'Running',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  waiting: {
    label: 'Waiting',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  failed: {
    label: 'Failed',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
};

// Condition operators for filters and determinators
export const CONDITION_OPERATORS = {
  TEXT: [
    { value: 'equals', label: 'is equal to' },
    { value: 'not_equals', label: 'is not equal to' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  NUMBER: [
    { value: 'equals', label: 'is equal to' },
    { value: 'not_equals', label: 'is not equal to' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'greater_or_equal', label: 'is greater than or equal to' },
    { value: 'less_or_equal', label: 'is less than or equal to' },
    { value: 'between', label: 'is between' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  DATE: [
    { value: 'equals', label: 'is equal to' },
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
    { value: 'between', label: 'is between' },
    { value: 'in_last', label: 'is in the last' },
    { value: 'in_next', label: 'is in the next' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  BOOLEAN: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
  SELECT: [
    { value: 'equals', label: 'is any of' },
    { value: 'not_equals', label: 'is none of' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
};

// Step type icons mapping
export const STEP_TYPE_ICONS = {
  action: 'zap',
  wait: 'clock',
  determinator: 'git-branch',
  gate: 'shield',
  terminus: 'square',
};

// Action type icons mapping
export const ACTION_TYPE_ICONS = {
  send_sms: 'smartphone',
  send_email: 'mail',
  send_notification: 'bell',
  create_task: 'check-square',
  update_field: 'edit-3',
  add_to_segment: 'user-plus',
  remove_from_segment: 'user-minus',
  enroll_in_workflow: 'log-in',
  unenroll_from_workflow: 'log-out',
  webhook: 'send',
};

// Default workflow settings
export const DEFAULT_WORKFLOW_SETTINGS = {
  allowReenrollment: false,
  reenrollmentDelayDays: 30,
  suppressionSegments: [],
  executionWindow: null,
  timezone: 'America/New_York',
};
