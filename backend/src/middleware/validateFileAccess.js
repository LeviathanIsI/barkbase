const path = require('path');
const { requireAuth } = require('./requireAuth');
const logger = require('../utils/logger');

/**
 * Middleware to validate that authenticated users can only access files
 * belonging to their tenant. Prevents cross-tenant file access.
 *
 * Expected URL format: /uploads/tenants/{tenantSlug}/uploads/{date}/{filename}
 *
 * This middleware must be placed AFTER tenantContext and BEFORE express.static
 */
const validateFileAccess = () => {
  // First ensure user is authenticated
  const authMiddleware = requireAuth();

  return async (req, res, next) => {
    try {
      // Run authentication first
      await new Promise((resolve, reject) => {
        authMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Parse the requested file path
      // req.path will be something like: /tenants/acme/uploads/2025-01-01/file.pdf
      const pathSegments = req.path.split('/').filter(Boolean);

      // Validate path structure: must start with "tenants/{slug}"
      if (pathSegments.length < 2 || pathSegments[0] !== 'tenants') {
        logger.warn({ path: req.path, user: req.user }, 'Invalid file path structure');
        return res.status(400).json({ message: 'Invalid file path' });
      }

      const requestedTenantSlug = pathSegments[1];

      // Validate that the authenticated user's tenant matches the requested file's tenant
      if (req.tenantSlug !== requestedTenantSlug) {
        logger.warn(
          {
            userTenant: req.tenantSlug,
            requestedTenant: requestedTenantSlug,
            userId: req.user?.id,
            path: req.path
          },
          'Cross-tenant file access attempt blocked'
        );
        return res.status(403).json({ message: 'Access denied' });
      }

      // Additional security: Prevent path traversal attempts
      const normalizedPath = path.normalize(req.path);
      if (normalizedPath.includes('..')) {
        logger.warn({ path: req.path, normalizedPath, user: req.user }, 'Path traversal attempt blocked');
        return res.status(400).json({ message: 'Invalid file path' });
      }

      // All checks passed, allow static file serving to proceed
      next();
    } catch (error) {
      // Authentication failed - return 401
      if (error.message?.includes('Authentication required') || error.message?.includes('Invalid or expired token')) {
        return res.status(401).json({ message: 'Authentication required to access files' });
      }

      logger.error({ error, path: req.path }, 'File access validation failed');
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = {
  validateFileAccess,
};
