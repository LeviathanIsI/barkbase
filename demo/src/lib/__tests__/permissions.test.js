/**
 * Permissions Library Tests
 * Tests for permission checking functions
 */

import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLES,
  roleHasPermission,
  userHasPermission,
  getUserPermissions,
  can,
  canAny,
  canAll,
} from '../permissions';

describe('PERMISSIONS', () => {
  it('should define booking permissions', () => {
    expect(PERMISSIONS.BOOKINGS_VIEW).toBe('bookings:view');
    expect(PERMISSIONS.BOOKINGS_CREATE).toBe('bookings:create');
    expect(PERMISSIONS.BOOKINGS_EDIT).toBe('bookings:edit');
    expect(PERMISSIONS.BOOKINGS_DELETE).toBe('bookings:delete');
  });

  it('should define pet permissions', () => {
    expect(PERMISSIONS.PETS_VIEW).toBe('pets:view');
    expect(PERMISSIONS.PETS_CREATE).toBe('pets:create');
    expect(PERMISSIONS.PETS_EDIT).toBe('pets:edit');
    expect(PERMISSIONS.PETS_DELETE).toBe('pets:delete');
  });

  it('should define admin permissions', () => {
    expect(PERMISSIONS.ADMIN_FULL_ACCESS).toBe('admin:full_access');
    expect(PERMISSIONS.ADMIN_MANAGE_USERS).toBe('admin:manage_users');
  });
});

describe('ROLES', () => {
  it('should define SUPER_ADMIN with wildcard permissions', () => {
    expect(ROLES.SUPER_ADMIN.name).toBe('Super Admin');
    expect(ROLES.SUPER_ADMIN.permissions).toContain('*');
  });

  it('should define OWNER with full access', () => {
    expect(ROLES.OWNER.name).toBe('Owner');
    expect(ROLES.OWNER.permissions).toContain(PERMISSIONS.ADMIN_FULL_ACCESS);
  });

  it('should define STAFF with limited permissions', () => {
    expect(ROLES.STAFF.name).toBe('Staff');
    expect(ROLES.STAFF.permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    expect(ROLES.STAFF.permissions).not.toContain(PERMISSIONS.BOOKINGS_DELETE);
  });

  it('should define VIEWER with read-only permissions', () => {
    expect(ROLES.VIEWER.name).toBe('Viewer');
    expect(ROLES.VIEWER.permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    expect(ROLES.VIEWER.permissions).not.toContain(PERMISSIONS.BOOKINGS_CREATE);
  });
});

describe('roleHasPermission', () => {
  describe('SUPER_ADMIN', () => {
    it('should have all permissions', () => {
      expect(roleHasPermission('SUPER_ADMIN', PERMISSIONS.BOOKINGS_DELETE)).toBe(true);
      expect(roleHasPermission('SUPER_ADMIN', PERMISSIONS.ADMIN_FULL_ACCESS)).toBe(true);
      expect(roleHasPermission('SUPER_ADMIN', 'any:permission')).toBe(true);
    });
  });

  describe('OWNER', () => {
    it('should have all permissions via ADMIN_FULL_ACCESS', () => {
      expect(roleHasPermission('OWNER', PERMISSIONS.BOOKINGS_DELETE)).toBe(true);
      expect(roleHasPermission('OWNER', PERMISSIONS.ADMIN_MANAGE_TENANT)).toBe(true);
    });
  });

  describe('MANAGER', () => {
    it('should have manager-level permissions', () => {
      expect(roleHasPermission('MANAGER', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(roleHasPermission('MANAGER', PERMISSIONS.STAFF_CREATE)).toBe(true);
      expect(roleHasPermission('MANAGER', PERMISSIONS.REPORTS_VIEW)).toBe(true);
    });

    it('should not have admin permissions', () => {
      expect(roleHasPermission('MANAGER', PERMISSIONS.ADMIN_MANAGE_TENANT)).toBe(false);
    });
  });

  describe('STAFF', () => {
    it('should have staff-level permissions', () => {
      expect(roleHasPermission('STAFF', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(roleHasPermission('STAFF', PERMISSIONS.BOOKINGS_CHECKIN)).toBe(true);
    });

    it('should not have create/edit permissions', () => {
      expect(roleHasPermission('STAFF', PERMISSIONS.BOOKINGS_CREATE)).toBe(false);
      expect(roleHasPermission('STAFF', PERMISSIONS.BOOKINGS_DELETE)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for invalid role', () => {
      expect(roleHasPermission('INVALID_ROLE', PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should return false for null role', () => {
      expect(roleHasPermission(null, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should return false for undefined role', () => {
      expect(roleHasPermission(undefined, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(roleHasPermission('staff', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(roleHasPermission('Staff', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(roleHasPermission('STAFF', PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    });
  });
});

describe('userHasPermission', () => {
  describe('with roles array', () => {
    it('should check permission for user with roles array', () => {
      const user = { roles: ['STAFF'] };
      expect(userHasPermission(user, PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(userHasPermission(user, PERMISSIONS.BOOKINGS_DELETE)).toBe(false);
    });

    it('should check multiple roles', () => {
      const user = { roles: ['STAFF', 'GROOMER'] };
      expect(userHasPermission(user, PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    });
  });

  describe('with single role', () => {
    it('should check permission for user with single role', () => {
      const user = { role: 'MANAGER' };
      expect(userHasPermission(user, PERMISSIONS.STAFF_CREATE)).toBe(true);
    });
  });

  describe('mode: any (default)', () => {
    it('should return true if user has any permission', () => {
      const user = { roles: ['STAFF'] };
      const result = userHasPermission(
        user,
        [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS],
        'any'
      );
      expect(result).toBe(true);
    });

    it('should return false if user has no permissions', () => {
      const user = { roles: ['VIEWER'] };
      const result = userHasPermission(
        user,
        [PERMISSIONS.BOOKINGS_DELETE, PERMISSIONS.ADMIN_FULL_ACCESS],
        'any'
      );
      expect(result).toBe(false);
    });
  });

  describe('mode: all', () => {
    it('should return true only if user has all permissions', () => {
      const user = { roles: ['MANAGER'] };
      const result = userHasPermission(
        user,
        [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE],
        'all'
      );
      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const user = { roles: ['STAFF'] };
      const result = userHasPermission(
        user,
        [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE],
        'all'
      );
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null user', () => {
      expect(userHasPermission(null, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should return false for user without roles', () => {
      expect(userHasPermission({}, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should return false for user with empty roles array', () => {
      const user = { roles: [] };
      expect(userHasPermission(user, PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should handle single permission as string', () => {
      const user = { roles: ['STAFF'] };
      expect(userHasPermission(user, PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    });
  });
});

describe('getUserPermissions', () => {
  it('should return all permissions for SUPER_ADMIN', () => {
    const user = { roles: ['SUPER_ADMIN'] };
    const permissions = getUserPermissions(user);
    expect(permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    expect(permissions).toContain(PERMISSIONS.ADMIN_FULL_ACCESS);
    expect(permissions.length).toBeGreaterThan(20);
  });

  it('should return limited permissions for STAFF', () => {
    const user = { roles: ['STAFF'] };
    const permissions = getUserPermissions(user);
    expect(permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    expect(permissions).not.toContain(PERMISSIONS.BOOKINGS_DELETE);
  });

  it('should combine permissions from multiple roles', () => {
    const user = { roles: ['STAFF', 'GROOMER'] };
    const permissions = getUserPermissions(user);
    expect(permissions).toContain(PERMISSIONS.BOOKINGS_VIEW);
    expect(permissions).toContain(PERMISSIONS.SCHEDULE_VIEW);
  });

  it('should return empty array for null user', () => {
    expect(getUserPermissions(null)).toEqual([]);
  });

  it('should return empty array for user without roles', () => {
    expect(getUserPermissions({})).toEqual([]);
  });

  it('should deduplicate permissions', () => {
    const user = { roles: ['STAFF', 'VIEWER'] };
    const permissions = getUserPermissions(user);
    const uniquePermissions = [...new Set(permissions)];
    expect(permissions.length).toBe(uniquePermissions.length);
  });
});

describe('can', () => {
  it('should be an alias for userHasPermission', () => {
    const user = { roles: ['STAFF'] };
    expect(can(user, PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    expect(can(user, PERMISSIONS.ADMIN_FULL_ACCESS)).toBe(false);
  });
});

describe('canAny', () => {
  it('should return true if user has any of the permissions', () => {
    const user = { roles: ['STAFF'] };
    expect(canAny(user, [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS])).toBe(true);
  });

  it('should return false if user has none of the permissions', () => {
    const user = { roles: ['VIEWER'] };
    expect(canAny(user, [PERMISSIONS.BOOKINGS_DELETE, PERMISSIONS.ADMIN_FULL_ACCESS])).toBe(false);
  });
});

describe('canAll', () => {
  it('should return true if user has all permissions', () => {
    const user = { roles: ['MANAGER'] };
    expect(canAll(user, [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE])).toBe(true);
  });

  it('should return false if user is missing any permission', () => {
    const user = { roles: ['STAFF'] };
    expect(canAll(user, [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE])).toBe(false);
  });
});
