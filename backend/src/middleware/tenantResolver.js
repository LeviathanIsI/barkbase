const normalizeHost = (host = '') => host.replace(/:\d+$/, '').toLowerCase();

const extractSlugFromHost = (host, { allowedHosts = [], baseDomain } = {}) => {
  if (!host) {
    return null;
  }

  const normalized = normalizeHost(host);
  if (!normalized) {
    return null;
  }

  if (allowedHosts.includes(normalized)) {
    return null;
  }

  const parts = normalized.split('.').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return null;
  }

  if (parts.length >= 3) {
    return parts[0];
  }

  const [possibleSlug, domain] = parts;
  if (baseDomain && normalized.endsWith(baseDomain)) {
    if (possibleSlug === baseDomain) {
      return null;
    }
    return possibleSlug;
  }

  if (allowedHosts.includes(domain)) {
    return null;
  }

  return possibleSlug;
};

const tenantResolver = (options = {}) => {
  const {
    allowedHosts = [],
    defaultTenantSlug = 'default',
    baseDomain,
  } = options;

  return function resolveTenant(req, _res, next) {
    const headerSlug =
      req.headers['x-tenant'] ?? req.headers['x-tenant-slug'] ?? req.headers['x-tenant-id'];

    let slug = headerSlug ? String(headerSlug).trim().toLowerCase() : null;

    if (!slug) {
      const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
      const normalizedHost = normalizeHost(hostHeader);
      req.tenantHost = normalizedHost || undefined;
      slug = extractSlugFromHost(normalizedHost, { allowedHosts, baseDomain });
    } else if (!req.tenantHost) {
      const hostHeader = req.headers['x-forwarded-host'] || req.headers.host || '';
      req.tenantHost = normalizeHost(hostHeader) || undefined;
    }

    req.tenantSlug = slug || defaultTenantSlug;
    next();
  };
};

module.exports = {
  tenantResolver,
  extractSlugFromHost,
};
