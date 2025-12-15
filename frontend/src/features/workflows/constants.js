/**
 * Workflows Constants
 * BarkBase workflow automation system - HubSpot-style patterns
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

// Entry condition types - HubSpot style
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

// Event triggers organized by category (HubSpot style)
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

// =============================================================================
// WAIT TYPES
// =============================================================================

export const WAIT_TYPES = {
  duration: { label: 'Set amount of time', icon: 'Clock' },
  until_date: { label: 'Until date', icon: 'Calendar' },
  until_time: { label: 'Until time of day', icon: 'Sun' },
  until_event: { label: 'Until event occurs', icon: 'Zap' },
};

export const WAIT_TYPE_CONFIG = {
  duration: {
    label: 'For a set amount of time',
    description: 'Wait for a specific duration',
  },
  until_date: {
    label: 'Until a date from a field',
    description: 'Wait until a date stored in a record field',
  },
  until_time: {
    label: 'Until a specific time',
    description: 'Wait until a specific time of day',
  },
  until_event: {
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
// CONDITION OPERATORS (HubSpot-style by field type)
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
  allowReenrollment: false,
  reenrollmentDelayDays: 30,
  suppressionSegments: [],
  executionWindow: null,
  timezone: 'America/New_York',
};
