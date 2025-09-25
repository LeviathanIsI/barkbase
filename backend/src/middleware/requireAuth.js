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

const normalizeRoles = (roles) => {
  if (!roles || roles.length === 0) {
    return [];
  }
  return roles.map((role) => String(role).toUpperCase());
};

const requireAuth = (roles = []) => {
  const allowedRoles = normalizeRoles(Array.isArray(roles) ? roles : [roles]);

  return async function authGuard(req, res, next) {
    try {
      if (req.user && req.user.tenantId === req.tenantId) {
        if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        return next();
      }

      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const payload = verifyAccessToken(token);
      if (payload.tenantId !== req.tenantId) {
        return res.status(403).json({ message: 'Tenant scope mismatch' });
      }

      const membership = await prisma.membership.findFirst({
        where: {
          id: payload.membershipId,
          tenantId: payload.tenantId,
          userId: payload.sub,
        },
        include: {
          user: true,
        },
      });

      if (!membership || membership.user?.isActive === false) {
        return res.status(401).json({ message: 'Invalid authentication context' });
      }

      req.user = {
        id: membership.user.id,
        email: membership.user.email,
        role: membership.role,
        tenantId: membership.tenantId,
        membershipId: membership.id,
      };

      if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      return next();
    } catch (error) {
      logger.warn({ error }, 'Failed to authenticate request');
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};

module.exports = {
  requireAuth,
};
