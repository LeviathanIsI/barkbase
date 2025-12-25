/**
 * Workflows Constants
 * BarkBase workflow automation system - enterprise patterns
 */

// =============================================================================
// OBJECT TYPES
// =============================================================================

// Object types that can be enrolled in workflows
export const WORKFLOW_OBJECT_TYPES = [
  { value: 'pet', label: 'Pet', icon: 'PawPrint' },
  { value: 'booking', label: 'Booking', icon: 'Calendar' },
  { value: 'owner', label: 'Owner', icon: 'User' },
  { value: 'payment', label: 'Payment', icon: 'CreditCard' },
  { value: 'task', label: 'Task', icon: 'CheckSquare' },
  { value: 'invoice', label: 'Invoice', icon: 'FileText' },
];

// Legacy constant for backwards compatibility
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

// =============================================================================
// ENTRY CONDITIONS (TRIGGERS)
// =============================================================================

// Entry condition types - enterprise style
export const ENTRY_CONDITION_TYPES = [
  {
    value: 'manual',
    label: 'Trigger manually',
    icon: 'MousePointer',
    description: 'Only add records manually',
  },
  {
    value: 'filter',
    label: 'Met filter criteria',
    icon: 'Filter',
    description: 'When records match conditions',
  },
  {
    value: 'schedule',
    label: 'On a schedule',
    icon: 'Clock',
    description: 'Run at specific times',
  },
  {
    value: 'event',
    label: 'When event occurs',
    icon: 'Zap',
    description: 'Trigger on specific events',
  },
];

// Legacy trigger types
export const TRIGGER_TYPES = {
  MANUAL: 'manual',
  FILTER_CRITERIA: 'filter',
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
  filter: {
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

// =============================================================================
// EVENT TRIGGERS
// =============================================================================

// Event triggers organized by category (enterprise style)
export const EVENT_TRIGGERS = {
  bookings: {
    label: 'Bookings',
    icon: 'Calendar',
    description: 'When booking events occur',
    events: [
      { value: 'booking.created', label: 'Booking created', objectType: 'booking' },
      { value: 'booking.confirmed', label: 'Booking confirmed', objectType: 'booking' },
      { value: 'booking.cancelled', label: 'Booking cancelled', objectType: 'booking' },
      { value: 'booking.modified', label: 'Booking modified', objectType: 'booking' },
      { value: 'booking.checked_in', label: 'Pet checked in', objectType: 'booking' },
      { value: 'booking.checked_out', label: 'Pet checked out', objectType: 'booking' },
    ],
  },
  pets: {
    label: 'Pets',
    icon: 'PawPrint',
    description: 'When pet events occur',
    events: [
      { value: 'pet.created', label: 'Pet created', objectType: 'pet' },
      { value: 'pet.updated', label: 'Pet updated', objectType: 'pet' },
      { value: 'pet.vaccination_expiring', label: 'Vaccination expiring', objectType: 'pet', configurable: true },
      { value: 'pet.vaccination_expired', label: 'Vaccination expired', objectType: 'pet' },
      { value: 'pet.birthday', label: 'Pet birthday', objectType: 'pet' },
    ],
  },
  owners: {
    label: 'Owners',
    icon: 'User',
    description: 'When owner events occur',
    events: [
      { value: 'owner.created', label: 'Owner created', objectType: 'owner' },
      { value: 'owner.updated', label: 'Owner updated', objectType: 'owner' },
    ],
  },
  payments: {
    label: 'Payments',
    icon: 'CreditCard',
    description: 'When payment events occur',
    events: [
      { value: 'payment.received', label: 'Payment received', objectType: 'payment' },
      { value: 'payment.failed', label: 'Payment failed', objectType: 'payment' },
      { value: 'invoice.created', label: 'Invoice created', objectType: 'invoice' },
      { value: 'invoice.overdue', label: 'Invoice overdue', objectType: 'invoice', configurable: true },
    ],
  },
  tasks: {
    label: 'Tasks',
    icon: 'CheckSquare',
    description: 'When task events occur',
    events: [
      { value: 'task.created', label: 'Task created', objectType: 'task' },
      { value: 'task.completed', label: 'Task completed', objectType: 'task' },
      { value: 'task.overdue', label: 'Task overdue', objectType: 'task' },
    ],
  },
};

// Generic event categories (for left panel display)
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
      { value: 'property.changed', label: 'Property value changed', configurable: true },
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
      { value: 'pet.vaccination_expiring', label: 'Vaccination expiring soon', configurable: true },
      { value: 'pet.vaccination_expired', label: 'Vaccination expired' },
      { value: 'pet.birthday', label: 'Pet birthday' },
      { value: 'pet.medical_note_added', label: 'Medical note added' },
    ],
  },
};

// =============================================================================
// STEP TYPES
// =============================================================================

// Step type string constants for comparisons
export const STEP_TYPES = {
  ACTION: 'action',
  WAIT: 'wait',
  DETERMINATOR: 'determinator',
  GATE: 'gate',
  TERMINUS: 'terminus',
};

// Step type configuration for display
export const STEP_TYPE_CONFIG = {
  action: { label: 'Action', icon: 'Play' },
  wait: { label: 'Wait', icon: 'Clock' },
  determinator: { label: 'Determinator', icon: 'GitBranch' },
  gate: { label: 'Gate', icon: 'Shield' },
  terminus: { label: 'End', icon: 'Square' },
};

// Step type icons mapping (for canvas)
export const STEP_TYPE_ICONS = {
  action: 'zap',
  wait: 'clock',
  determinator: 'git-branch',
  gate: 'shield',
  terminus: 'square',
};

// =============================================================================
// ACTION TYPES
// =============================================================================

export const ACTION_TYPES = {
  // Communication
  send_sms: { label: 'Send SMS', icon: 'MessageSquare', category: 'communication' },
  send_email: { label: 'Send email', icon: 'Mail', category: 'communication' },
  send_notification: { label: 'Send notification', icon: 'Bell', category: 'communication' },

  // Records
  create_task: { label: 'Create task', icon: 'CheckSquare', category: 'records' },
  update_field: { label: 'Update field', icon: 'Edit', category: 'records' },
  add_to_segment: { label: 'Add to segment', icon: 'UserPlus', category: 'records' },
  remove_from_segment: { label: 'Remove from segment', icon: 'UserMinus', category: 'records' },

  // Workflow
  enroll_in_workflow: { label: 'Enroll in workflow', icon: 'GitMerge', category: 'workflow' },
  unenroll_from_workflow: { label: 'Unenroll from workflow', icon: 'GitPullRequest', category: 'workflow' },

  // External
  webhook: { label: 'Webhook', icon: 'Globe', category: 'external' },
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

// Action categories for left panel
// ALL actions must have both stepType and actionType for consistency
export const ACTION_CATEGORIES = {
  communication: {
    label: 'Communication',
    icon: 'message-square',
    actions: [
      {
        stepType: 'action',
        actionType: 'send_sms',
        label: 'Send SMS',
        description: 'Send a text message',
        icon: 'smartphone',
      },
      {
        stepType: 'action',
        actionType: 'send_email',
        label: 'Send email',
        description: 'Send an email message',
        icon: 'mail',
      },
      {
        stepType: 'action',
        actionType: 'send_notification',
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
        stepType: 'action',
        actionType: 'create_task',
        label: 'Create task',
        description: 'Create a new task',
        icon: 'check-square',
      },
      {
        stepType: 'action',
        actionType: 'update_field',
        label: 'Update field',
        description: 'Update a field value',
        icon: 'edit-3',
      },
      {
        stepType: 'action',
        actionType: 'add_to_segment',
        label: 'Add to segment',
        description: 'Add record to a segment',
        icon: 'user-plus',
      },
      {
        stepType: 'action',
        actionType: 'remove_from_segment',
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
        stepType: 'action',
        actionType: 'enroll_in_workflow',
        label: 'Enroll in workflow',
        description: 'Enroll in another workflow',
        icon: 'log-in',
      },
      {
        stepType: 'action',
        actionType: 'unenroll_from_workflow',
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
        stepType: 'wait',
        actionType: null,
        label: 'Wait',
        description: 'Add a delay',
        icon: 'clock',
      },
      {
        stepType: 'determinator',
        actionType: null,
        label: 'Determinator',
        description: 'If/then branch',
        icon: 'git-branch',
      },
      {
        stepType: 'gate',
        actionType: null,
        label: 'Gate',
        description: 'Continue or stop',
        icon: 'shield',
      },
    ],
  },
  external: {
    label: 'External',
    icon: 'globe',
    actions: [
      {
        stepType: 'action',
        actionType: 'webhook',
        label: 'Webhook',
        description: 'Call external URL',
        icon: 'send',
      },
    ],
  },
};

// =============================================================================
// WAIT TYPES
// =============================================================================

export const WAIT_TYPES = {
  duration: { label: 'Set amount of time', icon: 'Clock' },
  calendar_date: { label: 'Until a calendar date', icon: 'Calendar' },
  date_property: { label: 'Until a date from record', icon: 'CalendarDays' },
  day_of_week: { label: 'Until a day of the week', icon: 'CalendarRange' },
  event: { label: 'Until an event occurs', icon: 'Zap' },
};

export const WAIT_TYPE_CONFIG = {
  duration: {
    label: 'Set amount of time',
    description: 'Wait for a specific duration before continuing',
  },
  calendar_date: {
    label: 'Until a calendar date',
    description: 'Wait until a specific date and time',
  },
  date_property: {
    label: 'Until a date from record',
    description: 'Wait until a date stored in the record (e.g., check-in date)',
  },
  day_of_week: {
    label: 'Until a day of the week',
    description: 'Wait until a specific day of the week',
  },
  event: {
    label: 'Until an event occurs',
    description: 'Wait until a specific event happens or max time elapses',
  },
};

// Date timing options for date_property wait type
export const DATE_TIMING_OPTIONS = [
  { value: 'on', label: 'On the date' },
  { value: 'before', label: 'Before the date' },
  { value: 'after', label: 'After the date' },
];

// Offset units for before/after date timing
export const DATE_OFFSET_UNITS = [
  { value: 'days', label: 'days' },
  { value: 'weeks', label: 'weeks' },
  { value: 'months', label: 'months' },
];

// Events that can be waited for by object type
export const WAIT_EVENTS_BY_OBJECT_TYPE = {
  pet: [
    { value: 'pet.updated', label: 'Pet is updated' },
    { value: 'pet.vaccination_updated', label: 'Vaccination status changes' },
    { value: 'booking.created', label: 'Booking is created for pet' },
  ],
  booking: [
    { value: 'booking.confirmed', label: 'Booking is confirmed' },
    { value: 'booking.checked_in', label: 'Pet is checked in' },
    { value: 'booking.checked_out', label: 'Pet is checked out' },
    { value: 'booking.cancelled', label: 'Booking is cancelled' },
    { value: 'payment.received', label: 'Payment is received' },
  ],
  owner: [
    { value: 'owner.updated', label: 'Owner is updated' },
    { value: 'booking.created', label: 'Booking is created' },
    { value: 'payment.received', label: 'Payment is received' },
  ],
  payment: [
    { value: 'payment.completed', label: 'Payment is completed' },
    { value: 'payment.refunded', label: 'Payment is refunded' },
  ],
  task: [
    { value: 'task.completed', label: 'Task is completed' },
    { value: 'task.updated', label: 'Task is updated' },
  ],
  invoice: [
    { value: 'invoice.paid', label: 'Invoice is paid' },
    { value: 'invoice.sent', label: 'Invoice is sent' },
  ],
};

export const DURATION_UNITS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
];

// =============================================================================
// SCHEDULE FREQUENCIES
// =============================================================================

export const SCHEDULE_FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

// Full day of week names for schedule config
export const DAYS_OF_WEEK_FULL = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

// Months for annually schedule
export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Day of month options (1-31 + Last day)
export const DAYS_OF_MONTH = [
  ...Array.from({ length: 31 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  })),
  { value: 'last', label: 'Last day of month' },
];

// =============================================================================
// WORKFLOW STATUSES
// =============================================================================

export const WORKFLOW_STATUSES = {
  draft: { label: 'Draft', color: 'gray' },
  active: { label: 'Active', color: 'green' },
  paused: { label: 'Paused', color: 'yellow' },
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

// =============================================================================
// EXECUTION STATUSES
// =============================================================================

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

// =============================================================================
// CONDITION OPERATORS (enterprise by field type)
// =============================================================================

export const CONDITION_OPERATORS = {
  text: [
    { value: 'is_equal_to_any', label: 'is equal to any of' },
    { value: 'is_not_equal_to_any', label: 'is not equal to any of' },
    { value: 'contains_exactly', label: 'contains exactly' },
    { value: 'does_not_contain_exactly', label: "doesn't contain exactly" },
    { value: 'contains_any', label: 'contains any of' },
    { value: 'does_not_contain_any', label: "doesn't contain any of" },
    { value: 'starts_with_any', label: 'starts with any of' },
    { value: 'ends_with_any', label: 'ends with any of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  number: [
    { value: 'is_equal_to', label: 'is equal to' },
    { value: 'is_not_equal_to', label: 'is not equal to' },
    { value: 'is_less_than', label: 'is less than' },
    { value: 'is_less_than_or_equal', label: 'is less than or equal to' },
    { value: 'is_greater_than', label: 'is greater than' },
    { value: 'is_greater_than_or_equal', label: 'is greater than or equal to' },
    { value: 'is_between', label: 'is between' },
    { value: 'is_not_between', label: 'is not between' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'is_less_than_days_ago', label: 'is less than X days ago' },
    { value: 'is_more_than_days_ago', label: 'is more than X days ago' },
    { value: 'is_less_than_days_from_now', label: 'is less than X days from now' },
    { value: 'is_more_than_days_from_now', label: 'is more than X days from now' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  enum: [
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_none_of', label: 'is none of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
};

// =============================================================================
// OBJECT ASSOCIATIONS
// =============================================================================

// Object associations - what associated objects can be filtered on
export const OBJECT_ASSOCIATIONS = {
  pet: [
    { objectType: 'owner', label: 'Owner', relationship: 'belongs_to' },
    { objectType: 'vaccination', label: 'Vaccination', relationship: 'has_many' },
  ],
  owner: [
    { objectType: 'pet', label: 'Pet', relationship: 'has_many' },
    { objectType: 'booking', label: 'Booking', relationship: 'has_many' },
    { objectType: 'invoice', label: 'Invoice', relationship: 'has_many' },
    { objectType: 'payment', label: 'Payment', relationship: 'has_many' },
  ],
  booking: [
    { objectType: 'owner', label: 'Owner', relationship: 'belongs_to' },
    { objectType: 'pet', label: 'Pet', relationship: 'has_many' },
    { objectType: 'service', label: 'Service', relationship: 'belongs_to' },
    { objectType: 'kennel', label: 'Kennel', relationship: 'belongs_to' },
    { objectType: 'invoice', label: 'Invoice', relationship: 'has_one' },
    { objectType: 'task', label: 'Task', relationship: 'has_many' },
  ],
  invoice: [
    { objectType: 'owner', label: 'Owner', relationship: 'belongs_to' },
    { objectType: 'booking', label: 'Booking', relationship: 'belongs_to' },
    { objectType: 'payment', label: 'Payment', relationship: 'has_many' },
  ],
  payment: [
    { objectType: 'owner', label: 'Owner', relationship: 'belongs_to' },
    { objectType: 'invoice', label: 'Invoice', relationship: 'belongs_to' },
  ],
  task: [
    { objectType: 'pet', label: 'Pet', relationship: 'belongs_to' },
    { objectType: 'booking', label: 'Booking', relationship: 'belongs_to' },
    { objectType: 'staff', label: 'Assigned To', relationship: 'belongs_to' },
  ],
};

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const DEFAULT_WORKFLOW_SETTINGS = {
  // Re-enrollment
  allowReenrollment: false,
  reenrollmentDelayDays: 30,

  // Suppression
  suppressionSegmentIds: [],

  // Goal (auto-unenrollment)
  goalConfig: {
    enabled: false,
    conditions: { logic: 'and', conditions: [] },
  },

  // Execution timing
  timingConfig: {
    enabled: false,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    startTime: '09:00',
    endTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    pauseDates: [],
    pauseAnnually: false,
  },

  // Unenrollment triggers
  unenrollOnCriteriaChange: false,
  unenrollmentTriggers: {
    enabled: false,
    conditions: { logic: 'and', conditions: [] },
  },
};

// Common timezones for the timezone dropdown
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

// Days of the week for execution timing
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

// =============================================================================
// OBJECT PROPERTIES (for filters, conditions, and property-based triggers)
// =============================================================================

export const OBJECT_PROPERTIES = {
  pet: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'species', label: 'Species', type: 'enum', options: [
      { value: 'dog', label: 'Dog' },
      { value: 'cat', label: 'Cat' },
      { value: 'bird', label: 'Bird' },
      { value: 'rabbit', label: 'Rabbit' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'breed', label: 'Breed', type: 'text' },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    { name: 'weight', label: 'Weight (lbs)', type: 'number' },
    { name: 'sex', label: 'Sex', type: 'enum', options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'unknown', label: 'Unknown' },
    ]},
    { name: 'is_neutered', label: 'Is Neutered/Spayed', type: 'boolean' },
    { name: 'vaccination_status', label: 'Vaccination Status', type: 'enum', options: [
      { value: 'current', label: 'Current' },
      { value: 'expiring', label: 'Expiring Soon' },
      { value: 'expired', label: 'Expired' },
      { value: 'unknown', label: 'Unknown' },
    ]},
    { name: 'medical_notes', label: 'Medical Notes', type: 'text' },
    { name: 'behavioral_notes', label: 'Behavioral Notes', type: 'text' },
    { name: 'feeding_instructions', label: 'Feeding Instructions', type: 'text' },
    { name: 'is_active', label: 'Is Active', type: 'boolean' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Updated', type: 'date' },
  ],

  booking: [
    { name: 'status', label: 'Status', type: 'enum', options: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'CHECKED_IN', label: 'Checked In' },
      { value: 'CHECKED_OUT', label: 'Checked Out' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'NO_SHOW', label: 'No Show' },
    ]},
    { name: 'service_type', label: 'Service Type', type: 'enum', options: [
      { value: 'BOARDING', label: 'Boarding' },
      { value: 'DAYCARE', label: 'Daycare' },
      { value: 'GROOMING', label: 'Grooming' },
      { value: 'TRAINING', label: 'Training' },
    ]},
    { name: 'check_in', label: 'Check-in Date', type: 'date' },
    { name: 'check_out', label: 'Check-out Date', type: 'date' },
    { name: 'total_price', label: 'Total Price', type: 'number' },
    { name: 'deposit_amount', label: 'Deposit Amount', type: 'number' },
    { name: 'is_recurring', label: 'Is Recurring', type: 'boolean' },
    { name: 'special_requests', label: 'Special Requests', type: 'text' },
    { name: 'internal_notes', label: 'Internal Notes', type: 'text' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Updated', type: 'date' },
  ],

  owner: [
    { name: 'first_name', label: 'First Name', type: 'text' },
    { name: 'last_name', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text' },
    { name: 'zip', label: 'ZIP Code', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'blocked', label: 'Blocked' },
    ]},
    { name: 'sms_consent', label: 'SMS Consent', type: 'boolean' },
    { name: 'email_consent', label: 'Email Consent', type: 'boolean' },
    { name: 'total_spent', label: 'Total Spent', type: 'number' },
    { name: 'booking_count', label: 'Total Bookings', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'text' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
    { name: 'updated_at', label: 'Last Updated', type: 'date' },
  ],

  payment: [
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'status', label: 'Status', type: 'enum', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
      { value: 'refunded', label: 'Refunded' },
    ]},
    { name: 'payment_method', label: 'Payment Method', type: 'enum', options: [
      { value: 'card', label: 'Credit Card' },
      { value: 'cash', label: 'Cash' },
      { value: 'check', label: 'Check' },
      { value: 'ach', label: 'ACH Transfer' },
    ]},
    { name: 'payment_date', label: 'Payment Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'text' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
  ],

  task: [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum', options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ]},
    { name: 'priority', label: 'Priority', type: 'enum', options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ]},
    { name: 'task_type', label: 'Task Type', type: 'enum', options: [
      { value: 'general', label: 'General' },
      { value: 'feeding', label: 'Feeding' },
      { value: 'medication', label: 'Medication' },
      { value: 'grooming', label: 'Grooming' },
      { value: 'exercise', label: 'Exercise' },
      { value: 'cleaning', label: 'Cleaning' },
      { value: 'follow_up', label: 'Follow-up' },
    ]},
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'completed_at', label: 'Completed Date', type: 'date' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
  ],

  invoice: [
    { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
    { name: 'status', label: 'Status', type: 'enum', options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'void', label: 'Void' },
    ]},
    { name: 'subtotal', label: 'Subtotal', type: 'number' },
    { name: 'tax', label: 'Tax', type: 'number' },
    { name: 'total', label: 'Total', type: 'number' },
    { name: 'amount_paid', label: 'Amount Paid', type: 'number' },
    { name: 'amount_due', label: 'Amount Due', type: 'number' },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'text' },
    { name: 'created_at', label: 'Created Date', type: 'date' },
  ],
};

// Property change types for property_changed trigger
export const PROPERTY_CHANGE_TYPES = [
  { value: 'any_change', label: 'Any change' },
  { value: 'changed_to', label: 'Changed to specific value' },
  { value: 'changed_from', label: 'Changed from specific value' },
  { value: 'changed_from_to', label: 'Changed from X to Y' },
];

// Helper to get property by name for an object type
export function getPropertyConfig(objectType, propertyName) {
  const properties = OBJECT_PROPERTIES[objectType] || [];
  return properties.find(p => p.name === propertyName);
}
