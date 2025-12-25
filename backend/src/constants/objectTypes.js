/**
 * =============================================================================
 * BarkBase Object Type Registry
 * =============================================================================
 *
 * Central registry for all object types in the system. Each object type has:
 * - code: Numeric identifier for the object type (used in TenantSequence)
 * - typeId: enterprise type identifier (format: "0-{code}")
 * - table: Database table name (PascalCase, matches Prisma/SQL)
 * - label: Human-readable singular name
 * - labelPlural: Human-readable plural name
 *
 * Object Type Code Ranges:
 * - 1-19: Core CRM Objects (Owner, Pet, Booking, etc.)
 * - 20-29: Workflow Objects
 * - 30-39: Service Objects
 * - 40-49: Facility Objects
 * - 50-59: Staff/User Objects
 * - 60-69: Communication Objects
 * - 70-79: Configuration Objects
 * - 80-89: Property System Objects
 * - 90-99: System/Audit Objects
 *
 * =============================================================================
 */

const OBJECT_TYPES = {
  // ============================================================================
  // Core CRM Objects (1-19)
  // ============================================================================
  owner: {
    code: 1,
    typeId: '0-1',
    table: 'Owner',
    label: 'Owner',
    labelPlural: 'Owners',
  },
  pet: {
    code: 2,
    typeId: '0-2',
    table: 'Pet',
    label: 'Pet',
    labelPlural: 'Pets',
  },
  booking: {
    code: 3,
    typeId: '0-3',
    table: 'Booking',
    label: 'Booking',
    labelPlural: 'Bookings',
  },
  payment: {
    code: 4,
    typeId: '0-4',
    table: 'Payment',
    label: 'Payment',
    labelPlural: 'Payments',
  },
  invoice: {
    code: 5,
    typeId: '0-5',
    table: 'Invoice',
    label: 'Invoice',
    labelPlural: 'Invoices',
  },
  invoiceLine: {
    code: 6,
    typeId: '0-6',
    table: 'InvoiceLine',
    label: 'Invoice Line',
    labelPlural: 'Invoice Lines',
  },
  task: {
    code: 7,
    typeId: '0-7',
    table: 'Task',
    label: 'Task',
    labelPlural: 'Tasks',
  },
  note: {
    code: 8,
    typeId: '0-8',
    table: 'Note',
    label: 'Note',
    labelPlural: 'Notes',
  },
  vaccination: {
    code: 9,
    typeId: '0-9',
    table: 'Vaccination',
    label: 'Vaccination',
    labelPlural: 'Vaccinations',
  },
  incident: {
    code: 10,
    typeId: '0-10',
    table: 'Incident',
    label: 'Incident',
    labelPlural: 'Incidents',
  },
  veterinarian: {
    code: 11,
    typeId: '0-11',
    table: 'Veterinarian',
    label: 'Veterinarian',
    labelPlural: 'Veterinarians',
  },

  // ============================================================================
  // Workflow Objects (20-29)
  // ============================================================================
  workflow: {
    code: 20,
    typeId: '0-20',
    table: 'Workflow',
    label: 'Workflow',
    labelPlural: 'Workflows',
  },
  workflowStep: {
    code: 21,
    typeId: '0-21',
    table: 'WorkflowStep',
    label: 'Workflow Step',
    labelPlural: 'Workflow Steps',
  },
  workflowExecution: {
    code: 22,
    typeId: '0-22',
    table: 'WorkflowExecution',
    label: 'Workflow Execution',
    labelPlural: 'Workflow Executions',
  },
  workflowExecutionLog: {
    code: 23,
    typeId: '0-23',
    table: 'WorkflowExecutionLog',
    label: 'Workflow Execution Log',
    labelPlural: 'Workflow Execution Logs',
  },
  workflowFolder: {
    code: 24,
    typeId: '0-24',
    table: 'WorkflowFolder',
    label: 'Workflow Folder',
    labelPlural: 'Workflow Folders',
  },
  workflowRevision: {
    code: 25,
    typeId: '0-25',
    table: 'WorkflowRevision',
    label: 'Workflow Revision',
    labelPlural: 'Workflow Revisions',
  },
  workflowTemplate: {
    code: 26,
    typeId: '0-26',
    table: 'WorkflowTemplate',
    label: 'Workflow Template',
    labelPlural: 'Workflow Templates',
  },
  segment: {
    code: 27,
    typeId: '0-27',
    table: 'Segment',
    label: 'Segment',
    labelPlural: 'Segments',
  },
  segmentMember: {
    code: 28,
    typeId: '0-28',
    table: 'SegmentMember',
    label: 'Segment Member',
    labelPlural: 'Segment Members',
  },
  segmentActivity: {
    code: 29,
    typeId: '0-29',
    table: 'SegmentActivity',
    label: 'Segment Activity',
    labelPlural: 'Segment Activities',
  },

  // ============================================================================
  // Service Objects (30-39)
  // ============================================================================
  service: {
    code: 30,
    typeId: '0-30',
    table: 'Service',
    label: 'Service',
    labelPlural: 'Services',
  },
  package: {
    code: 31,
    typeId: '0-31',
    table: 'Package',
    label: 'Package',
    labelPlural: 'Packages',
  },
  packageService: {
    code: 32,
    typeId: '0-32',
    table: 'PackageService',
    label: 'Package Service',
    labelPlural: 'Package Services',
  },

  // ============================================================================
  // Facility Objects (40-49)
  // ============================================================================
  run: {
    code: 40,
    typeId: '0-40',
    table: 'Run',
    label: 'Run',
    labelPlural: 'Runs',
  },
  kennel: {
    code: 41,
    typeId: '0-41',
    table: 'Kennel',
    label: 'Kennel',
    labelPlural: 'Kennels',
  },
  runTemplate: {
    code: 42,
    typeId: '0-42',
    table: 'RunTemplate',
    label: 'Run Template',
    labelPlural: 'Run Templates',
  },
  runAssignment: {
    code: 43,
    typeId: '0-43',
    table: 'RunAssignment',
    label: 'Run Assignment',
    labelPlural: 'Run Assignments',
  },

  // ============================================================================
  // Staff/User Objects (50-59)
  // ============================================================================
  user: {
    code: 50,
    typeId: '0-50',
    table: 'User',
    label: 'User',
    labelPlural: 'Users',
  },
  staff: {
    code: 51,
    typeId: '0-51',
    table: 'Staff',
    label: 'Staff',
    labelPlural: 'Staff',
  },
  role: {
    code: 52,
    typeId: '0-52',
    table: 'Role',
    label: 'Role',
    labelPlural: 'Roles',
  },
  userRole: {
    code: 53,
    typeId: '0-53',
    table: 'UserRole',
    label: 'User Role',
    labelPlural: 'User Roles',
  },
  userSession: {
    code: 54,
    typeId: '0-54',
    table: 'UserSession',
    label: 'User Session',
    labelPlural: 'User Sessions',
  },
  timeEntry: {
    code: 55,
    typeId: '0-55',
    table: 'TimeEntry',
    label: 'Time Entry',
    labelPlural: 'Time Entries',
  },
  timePunch: {
    code: 56,
    typeId: '0-56',
    table: 'TimePunch',
    label: 'Time Punch',
    labelPlural: 'Time Punches',
  },

  // ============================================================================
  // Communication Objects (60-69)
  // ============================================================================
  conversation: {
    code: 60,
    typeId: '0-60',
    table: 'Conversation',
    label: 'Conversation',
    labelPlural: 'Conversations',
  },
  message: {
    code: 61,
    typeId: '0-61',
    table: 'Message',
    label: 'Message',
    labelPlural: 'Messages',
  },
  notification: {
    code: 62,
    typeId: '0-62',
    table: 'Notification',
    label: 'Notification',
    labelPlural: 'Notifications',
  },
  emailTemplate: {
    code: 63,
    typeId: '0-63',
    table: 'EmailTemplate',
    label: 'Email Template',
    labelPlural: 'Email Templates',
  },

  // ============================================================================
  // Configuration Objects (70-79)
  // ============================================================================
  customProperty: {
    code: 70,
    typeId: '0-70',
    table: 'CustomProperty',
    label: 'Custom Property',
    labelPlural: 'Custom Properties',
  },
  objectSettings: {
    code: 71,
    typeId: '0-71',
    table: 'ObjectSettings',
    label: 'Object Settings',
    labelPlural: 'Object Settings',
  },
  objectAssociation: {
    code: 72,
    typeId: '0-72',
    table: 'ObjectAssociation',
    label: 'Object Association',
    labelPlural: 'Object Associations',
  },
  objectPipeline: {
    code: 73,
    typeId: '0-73',
    table: 'ObjectPipeline',
    label: 'Object Pipeline',
    labelPlural: 'Object Pipelines',
  },
  pipelineStage: {
    code: 74,
    typeId: '0-74',
    table: 'PipelineStage',
    label: 'Pipeline Stage',
    labelPlural: 'Pipeline Stages',
  },
  objectStatus: {
    code: 75,
    typeId: '0-75',
    table: 'ObjectStatus',
    label: 'Object Status',
    labelPlural: 'Object Statuses',
  },
  savedView: {
    code: 76,
    typeId: '0-76',
    table: 'SavedView',
    label: 'Saved View',
    labelPlural: 'Saved Views',
  },
  associationLabel: {
    code: 77,
    typeId: '0-77',
    table: 'AssociationLabel',
    label: 'Association Label',
    labelPlural: 'Association Labels',
  },

  // ============================================================================
  // Property System Objects (80-89)
  // ============================================================================
  property: {
    code: 80,
    typeId: '0-80',
    table: 'Property',
    label: 'Property',
    labelPlural: 'Properties',
  },
  propertyGroup: {
    code: 81,
    typeId: '0-81',
    table: 'PropertyGroup',
    label: 'Property Group',
    labelPlural: 'Property Groups',
  },
  propertyLogicRule: {
    code: 82,
    typeId: '0-82',
    table: 'PropertyLogicRule',
    label: 'Property Logic Rule',
    labelPlural: 'Property Logic Rules',
  },
  propertyValue: {
    code: 83,
    typeId: '0-83',
    table: 'PropertyValue',
    label: 'Property Value',
    labelPlural: 'Property Values',
  },
  propertyTemplate: {
    code: 84,
    typeId: '0-84',
    table: 'PropertyTemplate',
    label: 'Property Template',
    labelPlural: 'Property Templates',
  },
  propertyHistory: {
    code: 85,
    typeId: '0-85',
    table: 'PropertyHistory',
    label: 'Property History',
    labelPlural: 'Property Histories',
  },

  // ============================================================================
  // System/Audit Objects (90-99)
  // ============================================================================
  auditLog: {
    code: 90,
    typeId: '0-90',
    table: 'AuditLog',
    label: 'Audit Log',
    labelPlural: 'Audit Logs',
  },
  deletedRecord: {
    code: 91,
    typeId: '0-91',
    table: 'DeletedRecord',
    label: 'Deleted Record',
    labelPlural: 'Deleted Records',
  },
  import: {
    code: 92,
    typeId: '0-92',
    table: 'Import',
    label: 'Import',
    labelPlural: 'Imports',
  },
  activity: {
    code: 93,
    typeId: '0-93',
    table: 'Activity',
    label: 'Activity',
    labelPlural: 'Activities',
  },
};

// ============================================================================
// Junction Tables (no record_id - use composite keys from referenced tables)
// ============================================================================
const JUNCTION_TABLES = [
  'PetOwner',
  'BookingPet',
  'RolePermission',
  'PackageService',
];

// ============================================================================
// Tables without record_id (use UUID or special keys)
// ============================================================================
const EXCLUDED_TABLES = [
  'Tenant',           // Uses tenant_id UUID, gets account_code
  'TenantSettings',   // Uses tenant_id as PK (1:1 with Tenant)
  'Permission',       // Global, not tenant-scoped
  'SystemProperty',   // Global system properties
  'TenantSequence',   // Sequence tracking table
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/**
 * Get object type by typeId (e.g., "0-1" -> owner)
 * @param {string} typeId - The type ID (format: "0-{code}")
 * @returns {object|null} Object type definition or null
 */
function getByTypeId(typeId) {
  return Object.values(OBJECT_TYPES).find((o) => o.typeId === typeId) || null;
}

/**
 * Get object type by table name (e.g., "Owner" -> owner)
 * @param {string} table - The database table name
 * @returns {object|null} Object type definition or null
 */
function getByTable(table) {
  return Object.values(OBJECT_TYPES).find((o) => o.table === table) || null;
}

/**
 * Get object type by code (e.g., 1 -> owner)
 * @param {number} code - The numeric object type code
 * @returns {object|null} Object type definition or null
 */
function getByCode(code) {
  return Object.values(OBJECT_TYPES).find((o) => o.code === code) || null;
}

/**
 * Get object type by key name (e.g., "owner" -> owner object)
 * @param {string} key - The object type key
 * @returns {object|null} Object type definition or null
 */
function getByKey(key) {
  return OBJECT_TYPES[key] || null;
}

/**
 * Check if a table is a junction table (no record_id)
 * @param {string} table - The database table name
 * @returns {boolean}
 */
function isJunctionTable(table) {
  return JUNCTION_TABLES.includes(table);
}

/**
 * Check if a table is excluded from record_id system
 * @param {string} table - The database table name
 * @returns {boolean}
 */
function isExcludedTable(table) {
  return EXCLUDED_TABLES.includes(table);
}

/**
 * Check if a table uses the record_id system
 * @param {string} table - The database table name
 * @returns {boolean}
 */
function usesRecordId(table) {
  const objectType = getByTable(table);
  return objectType !== null && !isJunctionTable(table) && !isExcludedTable(table);
}

/**
 * Get all object types as an array
 * @returns {Array} Array of object type definitions
 */
function getAllObjectTypes() {
  return Object.entries(OBJECT_TYPES).map(([key, value]) => ({
    key,
    ...value,
  }));
}

module.exports = {
  OBJECT_TYPES,
  JUNCTION_TABLES,
  EXCLUDED_TABLES,
  getByTypeId,
  getByTable,
  getByCode,
  getByKey,
  isJunctionTable,
  isExcludedTable,
  usesRecordId,
  getAllObjectTypes,
};
