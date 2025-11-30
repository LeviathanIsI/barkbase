/**
 * Role-Based Permission System
 * Defines permissions and provides middleware for access control
 */

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

/**
 * Available permissions in the system
 */
const PERMISSIONS = {
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
  MANAGE_STAFF: 'staff:manage', // Alias for backwards compatibility

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

/**
 * Role definitions with their permissions
 */
const ROLES = {
  // Super admin - has all permissions
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: ['*'], // Wildcard for all permissions
  },

  // Owner/Manager - full access to their facility
  OWNER: {
    name: 'Owner',
    description: 'Business owner with full facility access',
    permissions: [
      PERMISSIONS.ADMIN_FULL_ACCESS,
      PERMISSIONS.ADMIN_MANAGE_USERS,
      PERMISSIONS.ADMIN_MANAGE_TENANT,
      PERMISSIONS.ADMIN_VIEW_AUDIT,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_EDIT,
      PERMISSIONS.SETTINGS_MANAGE_ROLES,
      PERMISSIONS.SETTINGS_MANAGE_INTEGRATIONS,
      // Include all other permissions
      ...Object.values(PERMISSIONS).filter(p => !p.startsWith('admin:')),
    ],
  },

  // Manager - day-to-day operations
  MANAGER: {
    name: 'Manager',
    description: 'Manages daily operations and staff',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
      PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.BOOKINGS_DELETE,
      PERMISSIONS.BOOKINGS_CHECKIN,
      PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW,
      PERMISSIONS.PETS_CREATE,
      PERMISSIONS.PETS_EDIT,
      PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.OWNERS_CREATE,
      PERMISSIONS.OWNERS_EDIT,
      PERMISSIONS.STAFF_VIEW,
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_EDIT,
      PERMISSIONS.STAFF_DELETE,
      PERMISSIONS.STAFF_MANAGE_SCHEDULE,
      PERMISSIONS.MANAGE_STAFF,
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.FINANCIAL_CREATE_INVOICE,
      PERMISSIONS.FINANCIAL_PROCESS_PAYMENT,
      PERMISSIONS.FINANCIAL_VIEW_REPORTS,
      PERMISSIONS.INCIDENTS_VIEW,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.INCIDENTS_EDIT,
      PERMISSIONS.INCIDENTS_RESOLVE,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.TIMECLOCK_APPROVE,
      PERMISSIONS.TIMECLOCK_EDIT,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SCHEDULE_DELETE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_ANALYTICS,
      PERMISSIONS.SETTINGS_VIEW,
    ],
  },

  // Staff - kennel technician, groomer, etc.
  STAFF: {
    name: 'Staff',
    description: 'Regular staff member',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CHECKIN,
      PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW,
      PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.INCIDENTS_VIEW,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.SCHEDULE_VIEW,
    ],
  },

  // Receptionist - front desk
  RECEPTIONIST: {
    name: 'Receptionist',
    description: 'Front desk operations',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
      PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.BOOKINGS_CHECKIN,
      PERMISSIONS.BOOKINGS_CHECKOUT,
      PERMISSIONS.PETS_VIEW,
      PERMISSIONS.PETS_CREATE,
      PERMISSIONS.PETS_EDIT,
      PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.OWNERS_CREATE,
      PERMISSIONS.OWNERS_EDIT,
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.FINANCIAL_CREATE_INVOICE,
      PERMISSIONS.FINANCIAL_PROCESS_PAYMENT,
      PERMISSIONS.INCIDENTS_VIEW,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.SCHEDULE_VIEW,
    ],
  },

  // Groomer
  GROOMER: {
    name: 'Groomer',
    description: 'Grooming staff',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.PETS_VIEW,
      PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.INCIDENTS_VIEW,
      PERMISSIONS.INCIDENTS_CREATE,
      PERMISSIONS.TIMECLOCK_VIEW,
      PERMISSIONS.TIMECLOCK_CLOCKIN,
      PERMISSIONS.SCHEDULE_VIEW,
    ],
  },

  // Read-only viewer
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.PETS_VIEW,
      PERMISSIONS.OWNERS_VIEW,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
};

// =============================================================================
// PERMISSION CHECKING FUNCTIONS
// =============================================================================

/**
 * Check if a role has a specific permission
 * @param {string} roleName - Role name
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function roleHasPermission(roleName, permission) {
  const role = ROLES[roleName?.toUpperCase()];
  if (!role) return false;

  // Check for wildcard
  if (role.permissions.includes('*')) return true;

  // Check for admin full access
  if (role.permissions.includes(PERMISSIONS.ADMIN_FULL_ACCESS)) return true;

  // Direct permission check
  return role.permissions.includes(permission);
}

/**
 * Check if user has permission based on their roles
 * @param {object} user - User object with roles array
 * @param {string|string[]} requiredPermissions - Permission(s) to check
 * @param {string} mode - 'any' (default) or 'all'
 * @returns {boolean}
 */
function userHasPermission(user, requiredPermissions, mode = 'any') {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    // Check for legacy role field
    if (user?.role) {
      return checkPermissionForRoles([user.role], requiredPermissions, mode);
    }
    return false;
  }

  return checkPermissionForRoles(user.roles, requiredPermissions, mode);
}

/**
 * Check permissions for a set of roles
 */
function checkPermissionForRoles(roles, requiredPermissions, mode = 'any') {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  if (mode === 'all') {
    return permissions.every(perm => roles.some(role => roleHasPermission(role, perm)));
  }

  return permissions.some(perm => roles.some(role => roleHasPermission(role, perm)));
}

/**
 * Get all permissions for a user
 * @param {object} user - User object with roles
 * @returns {string[]} - Array of permissions
 */
function getUserPermissions(user) {
  if (!user) return [];

  const roles = user.roles || (user.role ? [user.role] : []);
  const permissions = new Set();

  for (const roleName of roles) {
    const role = ROLES[roleName?.toUpperCase()];
    if (!role) continue;

    if (role.permissions.includes('*')) {
      // Return all permissions
      return Object.values(PERMISSIONS);
    }

    for (const perm of role.permissions) {
      permissions.add(perm);
    }
  }

  return Array.from(permissions);
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Permission check middleware for Lambda handlers
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {object} options - Options { mode: 'any'|'all', createResponse: fn }
 * @returns {function} - Middleware function
 */
function requirePermission(requiredPermissions, options = {}) {
  const { mode = 'any', createResponse } = options;

  return async (event, user, next) => {
    // If no user, deny access
    if (!user) {
      console.log('[PERMISSIONS] No user provided, access denied');
      return createResponse ? createResponse(401, {
        error: 'Unauthorized',
        message: 'Authentication required',
      }) : { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Check permission
    const hasPermission = userHasPermission(user, requiredPermissions, mode);

    if (!hasPermission) {
      console.log('[PERMISSIONS] Access denied:', {
        userId: user.id,
        roles: user.roles || user.role,
        required: requiredPermissions,
        mode,
      });

      return createResponse ? createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
        requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
      }) : { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    console.log('[PERMISSIONS] Access granted:', {
      userId: user.id,
      required: requiredPermissions,
    });

    // Continue to handler
    if (typeof next === 'function') {
      return next();
    }

    return null; // Indicates permission granted
  };
}

/**
 * Check permission inline (for use within handlers)
 * @param {object} user - User object
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {function} createResponse - Response creator function (optional)
 * @returns {object} - { allowed: boolean, message?: string } OR Error response if createResponse provided
 */
function checkPermission(user, requiredPermissions, createResponse) {
  const hasPermission = userHasPermission(user, requiredPermissions);

  if (!hasPermission) {
    console.log('[PERMISSIONS] Inline check failed:', {
      userId: user?.id,
      roles: user?.roles || user?.role,
      required: requiredPermissions,
    });

    // If createResponse function provided, return HTTP error response
    if (typeof createResponse === 'function') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    }

    // Otherwise return structured result for handler to process
    return {
      allowed: false,
      message: 'You do not have permission to perform this action',
    };
  }

  // If createResponse was provided, return null (backwards compatible)
  if (typeof createResponse === 'function') {
    return null;
  }

  // Otherwise return structured success result
  return { allowed: true };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  PERMISSIONS,
  ROLES,
  roleHasPermission,
  userHasPermission,
  getUserPermissions,
  requirePermission,
  checkPermission,
};

