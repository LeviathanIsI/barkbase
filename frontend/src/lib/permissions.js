/**
 * Frontend Permissions Utility
 * Mirrors backend permission system for UI-level access control
 */

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

export const PERMISSIONS = {
  // Booking permissions
  BOOKINGS_VIEW: 'bookings:view',
  BOOKINGS_CREATE: 'bookings:create',
  BOOKINGS_EDIT: 'bookings:edit',
  BOOKINGS_DELETE: 'bookings:delete',
  BOOKINGS_CHECKIN: 'bookings:checkin',
  BOOKINGS_CHECKOUT: 'bookings:checkout',

  // Pet permissions
  PETS_VIEW: 'pets:view',
  PETS_CREATE: 'pets:create',
  PETS_EDIT: 'pets:edit',
  PETS_DELETE: 'pets:delete',

  // Owner permissions
  OWNERS_VIEW: 'owners:view',
  OWNERS_CREATE: 'owners:create',
  OWNERS_EDIT: 'owners:edit',
  OWNERS_DELETE: 'owners:delete',

  // Staff permissions
  STAFF_VIEW: 'staff:view',
  STAFF_CREATE: 'staff:create',
  STAFF_EDIT: 'staff:edit',
  STAFF_DELETE: 'staff:delete',
  STAFF_MANAGE_SCHEDULE: 'staff:manage_schedule',

  // Financial permissions
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_CREATE_INVOICE: 'financial:create_invoice',
  FINANCIAL_PROCESS_PAYMENT: 'financial:process_payment',
  FINANCIAL_ISSUE_REFUND: 'financial:issue_refund',
  FINANCIAL_VIEW_REPORTS: 'financial:view_reports',

  // Incident permissions
  INCIDENTS_VIEW: 'incidents:view',
  INCIDENTS_CREATE: 'incidents:create',
  INCIDENTS_EDIT: 'incidents:edit',
  INCIDENTS_DELETE: 'incidents:delete',
  INCIDENTS_RESOLVE: 'incidents:resolve',

  // Time clock permissions
  TIMECLOCK_VIEW: 'timeclock:view',
  TIMECLOCK_CLOCKIN: 'timeclock:clockin',
  TIMECLOCK_APPROVE: 'timeclock:approve',
  TIMECLOCK_EDIT: 'timeclock:edit',

  // Schedule permissions
  SCHEDULE_VIEW: 'schedule:view',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_EDIT: 'schedule:edit',
  SCHEDULE_DELETE: 'schedule:delete',

  // Reports permissions
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_ANALYTICS: 'reports:analytics',

  // Settings permissions
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  SETTINGS_MANAGE_ROLES: 'settings:manage_roles',
  SETTINGS_MANAGE_INTEGRATIONS: 'settings:manage_integrations',

  // Admin permissions
  ADMIN_FULL_ACCESS: 'admin:full_access',
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_TENANT: 'admin:manage_tenant',
  ADMIN_VIEW_AUDIT: 'admin:view_audit',
};

// =============================================================================
// PERMISSION CATEGORIES (for UI grouping)
// =============================================================================

export const PERMISSION_CATEGORIES = {
  BOOKINGS: {
    label: 'Bookings',
    permissions: {
      VIEW_BOOKINGS: 'View Bookings',
      CREATE_BOOKING: 'Create Booking',
      EDIT_BOOKING: 'Edit Booking',
      DELETE_BOOKING: 'Delete Booking',
      CHECKIN_BOOKING: 'Check In',
      CHECKOUT_BOOKING: 'Check Out',
    },
  },
  CUSTOMERS: {
    label: 'Customers & Owners',
    permissions: {
      VIEW_CUSTOMERS: 'View Customers',
      VIEW_CUSTOMER_DETAILS: 'View Customer Details',
      CREATE_CUSTOMER: 'Create Customer',
      EDIT_CUSTOMER: 'Edit Customer',
      DELETE_CUSTOMER: 'Delete Customer',
      VIEW_CUSTOMER_FINANCIAL: 'View Customer Financial Info',
      MANAGE_CUSTOMER_NOTES: 'Manage Customer Notes',
    },
  },
  PETS: {
    label: 'Pets',
    permissions: {
      VIEW_PETS: 'View Pets',
      VIEW_PET_DETAILS: 'View Pet Details',
      CREATE_PET: 'Create Pet',
      EDIT_PET: 'Edit Pet',
      DELETE_PET: 'Delete Pet',
      VIEW_MEDICAL_RECORDS: 'View Medical Records',
      EDIT_MEDICAL_RECORDS: 'Edit Medical Records',
    },
  },
  KENNELS: {
    label: 'Kennels & Facilities',
    permissions: {
      VIEW_KENNELS: 'View Kennels',
      MANAGE_KENNELS: 'Manage Kennels',
      VIEW_OCCUPANCY: 'View Occupancy',
      VIEW_MAINTENANCE: 'View Maintenance',
      CREATE_MAINTENANCE: 'Create Maintenance Request',
      MANAGE_INVENTORY: 'Manage Inventory',
    },
  },
  FINANCIAL: {
    label: 'Financial',
    permissions: {
      VIEW_INVOICES: 'View Invoices',
      CREATE_INVOICE: 'Create Invoice',
      EDIT_INVOICE: 'Edit Invoice',
      VIEW_PAYMENTS: 'View Payments',
      PROCESS_PAYMENT: 'Process Payment',
      ISSUE_REFUND: 'Issue Refund',
      VIEW_FINANCIAL_REPORTS: 'View Financial Reports',
    },
  },
  STAFF: {
    label: 'Staff Management',
    permissions: {
      VIEW_STAFF: 'View Staff',
      CREATE_STAFF: 'Create Staff',
      EDIT_STAFF: 'Edit Staff',
      DELETE_STAFF: 'Delete Staff',
      MANAGE_SCHEDULE: 'Manage Schedule',
      VIEW_TIMECLOCK: 'View Time Clock',
      CLOCKIN: 'Clock In/Out',
      APPROVE_TIMECLOCK: 'Approve Time Entries',
    },
  },
  COMMUNICATIONS: {
    label: 'Communications',
    permissions: {
      VIEW_MESSAGES: 'View Messages',
      SEND_MESSAGES: 'Send Messages',
      VIEW_NOTIFICATIONS: 'View Notifications',
      MANAGE_NOTIFICATIONS: 'Manage Notifications',
    },
  },
  REPORTS: {
    label: 'Reports & Analytics',
    permissions: {
      VIEW_BASIC_REPORTS: 'View Basic Reports',
      VIEW_DASHBOARDS: 'View Dashboards',
      VIEW_ANALYTICS: 'View Analytics',
      EXPORT_REPORTS: 'Export Reports',
    },
  },
  SETTINGS: {
    label: 'Settings & Admin',
    permissions: {
      VIEW_SETTINGS: 'View Settings',
      EDIT_SETTINGS: 'Edit Settings',
      MANAGE_ROLES: 'Manage Roles',
      MANAGE_INTEGRATIONS: 'Manage Integrations',
      VIEW_AUDIT_LOG: 'View Audit Log',
      ADMIN_FULL_ACCESS: 'Full Admin Access',
    },
  },
};

// =============================================================================
// ROLE DEFINITIONS (simplified for frontend)
// =============================================================================

export const ROLES = {
  SUPER_ADMIN: { name: 'Super Admin', permissions: ['*'] },
  OWNER: { name: 'Owner', permissions: [PERMISSIONS.ADMIN_FULL_ACCESS, ...Object.values(PERMISSIONS)] },
  MANAGER: {
    name: 'Manager',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_EDIT, PERMISSIONS.BOOKINGS_DELETE,
      PERMISSIONS.BOOKINGS_CHECKIN, PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW, PERMISSIONS.PETS_CREATE, PERMISSIONS.PETS_EDIT,
      PERMISSIONS.OWNERS_VIEW, PERMISSIONS.OWNERS_CREATE, PERMISSIONS.OWNERS_EDIT,
      PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_CREATE, PERMISSIONS.STAFF_EDIT, PERMISSIONS.STAFF_MANAGE_SCHEDULE,
      PERMISSIONS.FINANCIAL_VIEW, PERMISSIONS.FINANCIAL_CREATE_INVOICE, PERMISSIONS.FINANCIAL_PROCESS_PAYMENT,
      PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_CREATE, PERMISSIONS.INCIDENTS_EDIT, PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TIMECLOCK_VIEW, PERMISSIONS.TIMECLOCK_CLOCKIN, PERMISSIONS.TIMECLOCK_APPROVE,
      PERMISSIONS.SCHEDULE_VIEW, PERMISSIONS.SCHEDULE_CREATE, PERMISSIONS.SCHEDULE_EDIT, PERMISSIONS.SCHEDULE_DELETE,
      PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT, PERMISSIONS.REPORTS_ANALYTICS,
      PERMISSIONS.SETTINGS_VIEW,
    ],
  },
  STAFF: {
    name: 'Staff',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CHECKIN, PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW, PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW, PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.SCHEDULE_VIEW,
    ],
  },
  RECEPTIONIST: {
    name: 'Receptionist',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.BOOKINGS_CHECKIN, PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW, PERMISSIONS.PETS_CREATE, PERMISSIONS.PETS_EDIT,
      PERMISSIONS.OWNERS_VIEW, PERMISSIONS.OWNERS_CREATE, PERMISSIONS.OWNERS_EDIT,
      PERMISSIONS.FINANCIAL_VIEW, PERMISSIONS.FINANCIAL_CREATE_INVOICE, PERMISSIONS.FINANCIAL_PROCESS_PAYMENT,
      PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW, PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.SCHEDULE_VIEW,
    ],
  },
  GROOMER: {
    name: 'Groomer',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.PETS_VIEW, PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.INCIDENTS_VIEW, PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW, PERMISSIONS.TIMECLOCK_CLOCKIN, PERMISSIONS.SCHEDULE_VIEW,
    ],
  },
  VIEWER: {
    name: 'Viewer',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.PETS_VIEW, PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.SCHEDULE_VIEW, PERMISSIONS.REPORTS_VIEW,
    ],
  },
};

// =============================================================================
// PERMISSION CHECKING FUNCTIONS
// =============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(roleName, permission) {
  const role = ROLES[roleName?.toUpperCase()];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  if (role.permissions.includes(PERMISSIONS.ADMIN_FULL_ACCESS)) return true;
  return role.permissions.includes(permission);
}

/**
 * Check if user has permission based on their roles
 * @param {object} user - User object with roles array or role string
 * @param {string|string[]} requiredPermissions - Permission(s) to check
 * @param {string} mode - 'any' (default) or 'all'
 */
export function userHasPermission(user, requiredPermissions, mode = 'any') {
  if (!user) return false;
  
  const roles = user.roles || (user.role ? [user.role] : []);
  if (roles.length === 0) return false;

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  if (mode === 'all') {
    return permissions.every(perm => roles.some(role => roleHasPermission(role, perm)));
  }
  return permissions.some(perm => roles.some(role => roleHasPermission(role, perm)));
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user) {
  if (!user) return [];
  
  const roles = user.roles || (user.role ? [user.role] : []);
  const permissions = new Set();

  for (const roleName of roles) {
    const role = ROLES[roleName?.toUpperCase()];
    if (!role) continue;
    if (role.permissions.includes('*')) return Object.values(PERMISSIONS);
    role.permissions.forEach(perm => permissions.add(perm));
  }

  return Array.from(permissions);
}

/**
 * Hook-compatible permission check
 * Returns true if user has the permission
 */
export function can(user, permission) {
  return userHasPermission(user, permission);
}

/**
 * Hook-compatible permission check for multiple permissions
 * Returns true if user has any of the permissions
 */
export function canAny(user, permissions) {
  return userHasPermission(user, permissions, 'any');
}

/**
 * Hook-compatible permission check for multiple permissions
 * Returns true if user has all of the permissions
 */
export function canAll(user, permissions) {
  return userHasPermission(user, permissions, 'all');
}

export default {
  PERMISSIONS,
  ROLES,
  roleHasPermission,
  userHasPermission,
  getUserPermissions,
  can,
  canAny,
  canAll,
};
