/**
 * Staff Roles Hook and Utilities
 *
 * Provides tenant-configurable staff roles throughout the app.
 * Falls back to default roles if tenant hasn't configured any.
 */

import { useTenantStore } from '@/stores/tenant';

// Default roles seeded for new tenants
export const defaultStaffRoles = [
  { id: 'kennel_tech', name: 'Kennel Tech', color: '#3B82F6', isDefault: true },
  { id: 'groomer', name: 'Groomer', color: '#8B5CF6', isDefault: false },
  { id: 'manager', name: 'Manager', color: '#F59E0B', isDefault: false },
  { id: 'trainer', name: 'Trainer', color: '#10B981', isDefault: false },
];

// Color presets for role color picker
export const roleColorPresets = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Green', value: '#10B981' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Slate', value: '#64748B' },
];

/**
 * Hook to get all configured staff roles for the current tenant.
 * Falls back to default roles if tenant hasn't configured any.
 *
 * @returns {Array} Array of role objects { id, name, color, isDefault }
 */
export const useStaffRoles = () => {
  const staffRoles = useTenantStore((state) => state.tenant?.staffRoles);
  return staffRoles?.length > 0 ? staffRoles : defaultStaffRoles;
};

/**
 * Hook to get a single role by ID.
 *
 * @param {string} roleId - The role ID to look up
 * @returns {Object|null} The role object or null if not found
 */
export const useRoleById = (roleId) => {
  const roles = useStaffRoles();
  return roles.find((r) => r.id === roleId || r.name === roleId) || null;
};

/**
 * Hook to get a role's color by ID or name.
 *
 * @param {string} roleIdOrName - The role ID or name to look up
 * @returns {string} The hex color or gray fallback
 */
export const useRoleColor = (roleIdOrName) => {
  const roles = useStaffRoles();
  const role = roles.find((r) => r.id === roleIdOrName || r.name === roleIdOrName);
  return role?.color || '#6B7280'; // gray fallback
};

/**
 * Hook to get the default role (for new staff).
 *
 * @returns {Object} The default role object
 */
export const useDefaultRole = () => {
  const roles = useStaffRoles();
  return roles.find((r) => r.isDefault) || roles[0];
};

/**
 * Hook to get roles formatted for dropdown options.
 *
 * @returns {Array} Array of { value, label, color } objects
 */
export const useStaffRoleOptions = () => {
  const roles = useStaffRoles();
  return roles.map((r) => ({
    value: r.id,
    label: r.name,
    color: r.color,
  }));
};

/**
 * Get role color from a roles array (for non-hook contexts).
 *
 * @param {Array} roles - Array of role objects
 * @param {string} roleIdOrName - The role ID or name to look up
 * @returns {string} The hex color or gray fallback
 */
export const getRoleColor = (roles, roleIdOrName) => {
  if (!roles || !roleIdOrName) return '#6B7280';
  const role = roles.find((r) => r.id === roleIdOrName || r.name === roleIdOrName);
  return role?.color || '#6B7280';
};

/**
 * Generate a unique role ID from a name.
 *
 * @param {string} name - The role name
 * @returns {string} A URL-safe ID
 */
export const generateRoleId = (name) => {
  return `role_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now().toString(36)}`;
};

/**
 * Validate a role object.
 *
 * @param {Object} role - The role to validate
 * @param {Array} existingRoles - Existing roles to check uniqueness
 * @param {string} editingId - ID of role being edited (for uniqueness check)
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateRole = (role, existingRoles = [], editingId = null) => {
  if (!role.name || role.name.trim().length === 0) {
    return { valid: false, error: 'Role name is required' };
  }

  if (role.name.length > 50) {
    return { valid: false, error: 'Role name must be 50 characters or less' };
  }

  // Check uniqueness (excluding the role being edited)
  const isDuplicate = existingRoles.some(
    (r) => r.name.toLowerCase() === role.name.toLowerCase() && r.id !== editingId
  );
  if (isDuplicate) {
    return { valid: false, error: 'A role with this name already exists' };
  }

  // Validate color format
  if (!role.color || !/^#[0-9A-Fa-f]{6}$/.test(role.color)) {
    return { valid: false, error: 'Invalid color format' };
  }

  return { valid: true, error: null };
};

export default useStaffRoles;
