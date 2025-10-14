const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

const ensureAuthenticated = async (req) => {
  if (req.user && req.user.tenantId === req.tenantId) {
    return;
  }

  const token = extractToken(req);
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const authError = new Error('Invalid or expired token');
    authError.statusCode = 401;
    throw authError;
  }

  if (payload.tenantId !== req.tenantId) {
    const error = new Error('Tenant scope mismatch');
    error.statusCode = 403;
    throw error;
  }

  const membership = await prisma.membership.findFirst({
    where: { recordId: payload.membershipId,
      tenantId: payload.tenantId,
      userId: payload.sub,
    },
    include: {
      user: true,
    },
  });

  if (!membership || membership.user?.isActive === false) {
    const error = new Error('Invalid authentication context');
    error.statusCode = 401;
    throw error;
  }

  req.user = { recordId: membership.user.recordId,
    email: membership.user.email,
    role: membership.role,
    tenantId: membership.tenantId,
    membershipId: membership.recordId,
  };
};

/**
 * Middleware to validate that authenticated users can only access files
 * belonging to their tenant. Prevents cross-tenant file access.
 *
 * Expected URL format: /uploads/tenants/{tenantSlug}/uploads/{date}/{filename}
 *
 * This middleware must be placed AFTER tenantContext and BEFORE express.static
 */
const validateFileAccess = () => {
  return async (req, res, next) => {
    try {
      await ensureAuthenticated(req);

      const pathToInspect = req.originalUrl || req.url || req.path;
      if (pathToInspect.includes('..')) {
        logger.warn({ path: req.originalUrl, user: req.user }, 'Path traversal attempt blocked');
        return res.status(400).json({ message: 'Invalid file path' });
      }

      const pathSegments = req.path.split('/').filter(Boolean);

      if (pathSegments.length < 5 || pathSegments[0] !== 'tenants' || pathSegments[2] !== 'uploads') {
        logger.warn({ path: req.path, user: req.user }, 'Invalid file path structure');
        return res.status(400).json({ message: 'Invalid file path' });
      }

      const requestedTenantSlug = pathSegments[1];

      if (req.tenantSlug !== requestedTenantSlug) {
        logger.warn(
          {
            userTenant: req.tenantSlug,
            requestedTenant: requestedTenantSlug,
            userId: req.user?.recordId,
            path: req.path,
          },
          'Cross-tenant file access attempt blocked',
        );
        return res.status(403).json({ message: 'Access denied' });
      }

      return next();
    } catch (error) {
      if (error.statusCode === 401 || error.message?.includes('Authentication required') || error.message?.includes('Invalid or expired token')) {
        return res.status(401).json({ message: 'Authentication required to access files' });
      }

      if (error.statusCode === 403 || error.message === 'Tenant scope mismatch') {
        return res.status(403).json({ message: 'Access denied' });
      }

      logger.error({ error, path: req.path }, 'File access validation failed');
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = {
  validateFileAccess,
};
