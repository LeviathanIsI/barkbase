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

// Generic event categories (HubSpot-style)
export const TRIGGER_EVENT_CATEGORIES = {
  data_values: {
    label: 'Data values',
    description: 'When data is created, changed or meets conditions',
    icon: 'database',
    color: '#3B82F6',
    events: [
      { value: 'record.created', label: 'Record created' },
      { value: 'record.updated', label: 'Record updated' },
      { value: 'record.deleted', label: 'Record deleted' },
      { value: 'property.changed', label: 'Property value changed' },
      { value: 'segment.membership_changed', label: 'Segment membership changed' },
    ],
  },
  scheduling: {
    label: 'Scheduling & bookings',
    description: 'When appointments or bookings change',
    icon: 'calendar',
    color: '#F59E0B',
    events: [
      { value: 'booking.created', label: 'Booking created' },
      { value: 'booking.confirmed', label: 'Booking confirmed' },
      { value: 'booking.cancelled', label: 'Booking cancelled' },
      { value: 'booking.modified', label: 'Booking modified' },
      { value: 'booking.checked_in', label: 'Pet checked in' },
      { value: 'booking.checked_out', label: 'Pet checked out' },
      { value: 'booking.reminder_due', label: 'Booking reminder due' },
    ],
  },
  communications: {
    label: 'Communications',
    description: 'When messages are sent or received',
    icon: 'message-circle',
    color: '#EC4899',
    events: [
      { value: 'sms.sent', label: 'SMS sent' },
      { value: 'sms.delivered', label: 'SMS delivered' },
      { value: 'sms.failed', label: 'SMS failed' },
      { value: 'email.sent', label: 'Email sent' },
      { value: 'email.opened', label: 'Email opened' },
      { value: 'email.clicked', label: 'Email link clicked' },
      { value: 'email.bounced', label: 'Email bounced' },
    ],
  },
  payments: {
    label: 'Payments & billing',
    description: 'When payment or invoice events occur',
    icon: 'credit-card',
    color: '#10B981',
    events: [
      { value: 'payment.received', label: 'Payment received' },
      { value: 'payment.failed', label: 'Payment failed' },
      { value: 'payment.refunded', label: 'Payment refunded' },
      { value: 'invoice.created', label: 'Invoice created' },
      { value: 'invoice.sent', label: 'Invoice sent' },
      { value: 'invoice.overdue', label: 'Invoice overdue' },
      { value: 'invoice.paid', label: 'Invoice paid' },
    ],
  },
  automations: {
    label: 'Automations & tasks',
    description: 'When automated steps or tasks complete',
    icon: 'zap',
    color: '#8B5CF6',
    events: [
      { value: 'task.created', label: 'Task created' },
      { value: 'task.completed', label: 'Task completed' },
      { value: 'task.overdue', label: 'Task overdue' },
      { value: 'workflow.enrolled', label: 'Enrolled in workflow' },
      { value: 'workflow.completed', label: 'Workflow completed' },
    ],
  },
  pet_health: {
    label: 'Pet health & records',
    description: 'When pet health events occur',
    icon: 'heart',
    color: '#EF4444',
    events: [
      { value: 'pet.created', label: 'Pet created' },
      { value: 'pet.updated', label: 'Pet updated' },
      { value: 'pet.vaccination_expiring', label: 'Vaccination expiring soon' },
      { value: 'pet.vaccination_expired', label: 'Vaccination expired' },
      { value: 'pet.birthday', label: 'Pet birthday' },
      { value: 'pet.medical_note_added', label: 'Medical note added' },
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
  NUMBER: [
    { value: 'equals', label: 'is equal to' },
    { value: 'not_equals', label: 'is not equal to' },
    { value: 'less_than', label: 'is less than' },
    { value: 'less_or_equal', label: 'is less than or equal to' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'greater_or_equal', label: 'is greater than or equal to' },
    { value: 'between', label: 'is between' },
    { value: 'not_between', label: 'is not between' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'has_ever_been', label: 'has ever been equal to' },
    { value: 'has_never_been', label: 'has never been equal to' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
    { value: 'updated_after_property', label: 'was updated after property' },
    { value: 'updated_before_property', label: 'was updated before property' },
  ],
  DATE: [
    { value: 'is', label: 'is' },
    { value: 'equals', label: 'is equal to' },
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
    { value: 'between', label: 'is between' },
    { value: 'not_between', label: 'is not between' },
    { value: 'less_than_ago', label: 'is less than' },
    { value: 'more_than_ago', label: 'is more than' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'after_property', label: 'is after another property' },
    { value: 'before_property', label: 'is before another property' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
    { value: 'updated_after_property', label: 'was updated after property' },
    { value: 'updated_before_property', label: 'was updated before property' },
  ],
  TEXT: [
    { value: 'equals_any', label: 'is equal to any of' },
    { value: 'not_equals_any', label: 'is not equal to any of' },
    { value: 'contains', label: 'contains exactly' },
    { value: 'not_contains', label: "doesn't contain exactly" },
    { value: 'contains_any', label: 'contains any of' },
    { value: 'not_contains_any', label: "doesn't contain any of" },
    { value: 'starts_with_any', label: 'starts with any of' },
    { value: 'ends_with_any', label: 'ends with any of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'has_ever_been_any', label: 'has ever been equal to any of' },
    { value: 'has_never_been_any', label: 'has never been equal to any of' },
    { value: 'has_ever_contained', label: 'has ever contained exactly' },
    { value: 'has_never_contained', label: 'has never contained exactly' },
    { value: 'updated_in_last', label: 'updated in last' },
    { value: 'not_updated_in_last', label: 'not updated in last' },
    { value: 'updated_after_property', label: 'was updated after property' },
    { value: 'updated_before_property', label: 'was updated before property' },
  ],
  BOOLEAN: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  ENUM: [
    { value: 'is_any', label: 'is any of' },
    { value: 'is_none', label: 'is none of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
    { value: 'has_ever_been_any', label: 'has ever been any of' },
    { value: 'has_never_been_any', label: 'has never been any of' },
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
