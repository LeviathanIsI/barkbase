function extractDevUser(req) {
  const tenantId = req.headers['x-tenant-id'];
  const userId = req.headers['x-user-id'] || 'local-dev';

  if (!tenantId) {
    return null;
  }

  return {
    sub: userId,
    userId,
    tenantId,
    role: req.headers['x-user-role'] || 'USER',
  };
}

async function authMiddleware(req, res, next) {
  try {
    const user = extractDevUser(req);

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: missing tenant/user context' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('[AUTH] Middleware failure:', error);
    return res.status(500).json({ message: 'Authentication middleware error' });
  }
}

module.exports = {
  authMiddleware,
};

