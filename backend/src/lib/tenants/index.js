function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

  if (!tenantId) {
    return res.status(401).json({ message: 'Missing tenant context' });
  }

  req.tenantId = tenantId;
  return next();
}

module.exports = {
  tenantMiddleware,
};

