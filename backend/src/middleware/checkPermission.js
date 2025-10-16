const permissionService = require('../services/permission.service');

/**
 * Middleware to check if user has a specific permission
 * @param {string} permission - The permission to check
 * @param {object} options - Additional options
 * @param {boolean} options.allowOwner - Allow tenant owners regardless of permission
 * @param {boolean} options.allowSelf - Allow if user is accessing their own resource
 */
const checkPermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.recordId;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          message: 'Unauthorized: Missing user or tenant context'
        });
      }

      // Check if user is tenant owner (if allowOwner is true)
      if (options.allowOwner) {
        const legacyRole = await permissionService.getUserLegacyRole(userId, tenantId);
        if (legacyRole === 'OWNER') {
          return next();
        }
      }

      // Check if user is accessing their own resource (if allowSelf is true)
      if (options.allowSelf && req.params.userId === userId) {
        return next();
      }

      // Check the actual permission
      const hasPermission = await permissionService.userHasPermission(userId, tenantId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
          required: permission
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        message: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @param {object} options - Additional options
 */
const checkAnyPermission = (permissions, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.recordId;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          message: 'Unauthorized: Missing user or tenant context'
        });
      }

      // Check if user is tenant owner (if allowOwner is true)
      if (options.allowOwner) {
        const legacyRole = await permissionService.getUserLegacyRole(userId, tenantId);
        if (legacyRole === 'OWNER') {
          return next();
        }
      }

      // Check if user has any of the permissions
      const hasPermission = await permissionService.userHasAnyPermission(userId, tenantId, permissions);
      
      if (!hasPermission) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        message: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissions - Array of permissions to check
 * @param {object} options - Additional options
 */
const checkAllPermissions = (permissions, options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.recordId;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          message: 'Unauthorized: Missing user or tenant context'
        });
      }

      // Check if user is tenant owner (if allowOwner is true)
      if (options.allowOwner) {
        const legacyRole = await permissionService.getUserLegacyRole(userId, tenantId);
        if (legacyRole === 'OWNER') {
          return next();
        }
      }

      // Check if user has all of the permissions
      const hasPermission = await permissionService.userHasAllPermissions(userId, tenantId, permissions);
      
      if (!hasPermission) {
        return res.status(403).json({
          message: 'Forbidden: Insufficient permissions',
          required: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        message: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Attach user permissions to request object for use in controllers
 */
const attachUserPermissions = async (req, res, next) => {
  try {
    const userId = req.user?.recordId;
    const tenantId = req.tenantId;

    if (userId && tenantId) {
      req.userPermissions = await permissionService.getUserEffectivePermissions(userId, tenantId);
      req.legacyRole = await permissionService.getUserLegacyRole(userId, tenantId);
    } else {
      req.userPermissions = {};
      req.legacyRole = null;
    }

    next();
  } catch (error) {
    console.error('Error attaching user permissions:', error);
    // Don't fail the request, just set empty permissions
    req.userPermissions = {};
    req.legacyRole = null;
    next();
  }
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  attachUserPermissions
};

